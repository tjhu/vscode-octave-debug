import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, Variable
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
import { OctaveRuntime } from './OctaveRuntime';
import * as Path from 'path';
import { consoleLog, consoleErr } from './utils';
import { VariableFromWhosRequest } from './ResponseHelper';


/**
 * This interface describes the octave-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the octave-debug extension.
 * The interface should always match this schema.
 */
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the debugger. */
	exec: string;
	/** An absolute path to the current working directory. */
	cwd: string;
	/** An absolute path to the "program" to debug. */
	program: string;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean;
}

export class OctaveDebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// a Octave runtime (or debugger)
	private _runtime: OctaveRuntime;

	private _variableHandles = new Handles<string>();

	private _varaibles: Variable[] = [];
	private _variablesWithTypes: { [name: string]: VariableFromWhosRequest } = {};

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("octave-debug.txt");

		consoleLog(1, "Initializeing debug adapter");
		// this debugger uses one-based lines and columns
		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		this._runtime = new OctaveRuntime();

		// setup event handlers
		this._runtime.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', OctaveDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', OctaveDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', OctaveDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnException', () => {
			this.sendEvent(new StoppedEvent('exception', OctaveDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnError', () => {
			this.sendEvent(new StoppedEvent('error', OctaveDebugSession.THREAD_ID));
		});
		// this._runtime.on('breakpointValidated', (bp: OctaveBreakpoint) => {
		// 	this.sendEvent(new BreakpointEvent('changed', <DebugProtocol.Breakpoint>{ verified: bp.verified, id: bp.id }));
		// });
		this._runtime.on('output', (text: string, filePath: string, line: number, column: number) => {
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
			e.body.source = this.createSource(filePath);
			e.body.line = this.convertDebuggerLineToClient(line);
			e.body.column = this.convertDebuggerColumnToClient(column);
			this.sendEvent(e);
		});
		this._runtime.on('end', () => {
			this.sendEvent(new TerminatedEvent());
		});
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		consoleLog(1, "initializeRequest received");
		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		// TODO: maybe support this in the future
		response.body.supportsEvaluateForHovers = true;

		this.sendResponse(response);
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments) {
		super.configurationDoneRequest(response, args);

		// run the program
		await this._runtime.start();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {
		consoleLog(1, "launchRequest received.");
		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Log, false);

		// start debugger in the runtime
		await this._runtime.initialize(args);

		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());

		this.sendResponse(response);
	}

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
		consoleLog(1, "setBreakPointsRequest received");
		const path = <string>args.source.path;
		const func = Path.parse(path).name;
		const clientLines = args.lines || [];

		// clear all breakpoints for this file
		this._runtime.clearBreakpoints(path);

		// set breakpoint locations
		let breakpoints = clientLines.length ? await this._runtime.setBreakPoints(func, clientLines) : [];

		// send back the actual breakpoint positions
		response.body = {
			breakpoints: breakpoints
		};
		this.sendResponse(response);
	}

	protected async threadsRequest(response: DebugProtocol.ThreadsResponse) {
		consoleLog(1, 'threadsRequest received');
		// runtime supports now threads so just return a default thread.
		response.body = {
			threads: [
				new Thread(OctaveDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
		consoleLog(1, 'stackTraceRequest received');

		const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;

		const stackFrames = this._runtime.getStackFrames().slice(0, maxLevels);
		const funcs = stackFrames.map(s => {
			return s.func;
		});
		const sources = await this._runtime.getSource(funcs);

		const actualStackFrames = stackFrames.map(f => {
			if (f.func in sources) {
				return <DebugProtocol.StackFrame> {
					id: f.id,
					name: f.func,
					source: sources[f.func],
					line: f.line,
					column: f.column
				};
			} else {
				return <DebugProtocol.StackFrame> {
					id: f.id,
					name: f.func
				};
			}
		});

		response.body = {
			stackFrames: actualStackFrames,
			totalFrames: 1
		};
		this.sendResponse(response);
	}

	protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
		consoleLog(1, 'scopesRequest received');
		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Variales", this._variableHandles.create(":!frame")));

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
		consoleLog(1, 'variablesRequest received');
		const variables = new Array<DebugProtocol.Variable>();
		const variableName: string = this._variableHandles.get(args.variablesReference);

		if (variableName === ':!frame') {
			const variableWithTypes = await this._runtime.getListOfVariables();
			for(let vari of variableWithTypes) {
				let variable;
				if(variable = await this._runtime.getValueofVariable(vari)) {
					variables.push(variable);
				}
			}

			this._varaibles = variables;
			this._variablesWithTypes = {};
			for(let v of variableWithTypes) {
				this._variablesWithTypes[v.name] = v;
			}
		} else {
			// TODO: For future when we support displaying array
			// if variableName not in this._varaibles:
			// 	this._varaibles[variableName] = await this._runtime.getValueofVariable(variableName)
			// variables.push(this._varaibles[variableName])
			consoleErr('We should not look for variable name: ' + variableName);
		}
		response.body = {
			variables: variables
		};
		this.sendResponse(response);
		
	}

	protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
		this._runtime.continue();
		this.sendResponse(response);
	}

	protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
		await this._runtime.step();
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		consoleLog(1, 'evaluateRequest received');
		
		// TODO: why not asking octave runtime about what the hell that expression is?
		if(args.expression in this._variablesWithTypes) {
			let v = this._variablesWithTypes[args.expression];
			response.body = {
				result:  v.size.join('x') + ' ' + v.class,
				variablesReference: 0
			};
		}
		
		this.sendResponse(response);
	}

	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'octave-adapter-data');
	}
}

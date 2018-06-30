import { readFileSync, WriteStream } from 'fs';
import { EventEmitter } from 'events';
import { LaunchRequestArguments } from './OctaveDebugAdapter';
import { Writable } from 'stream';
import { OctaveDebuggerSession } from './OctaveSession';
import * as Vscode from 'vscode';
import * as Path from 'path';
import * as Fs from 'fs';
import { DebugProtocol } from 'vscode-debugprotocol';
import { StreamCatcher } from './StreamCatcher';
import * as RH from './ResponseHelper';
import * as EH from './ErrorMessageHelper';
import { consoleLog, consoleErr } from './Utils';
import { spawn, ChildProcess } from 'child_process';
import { debugPrompt } from './RegExp';
import { logger, Variable } from 'vscode-debugadapter';
import { LogLevel } from 'vscode-debugadapter/lib/logger';


export interface OctaveStackFrame {
	id: number;
	name: string;
	func: string;
	line: number;
	column: number;
}


/**
 * A Octave runtime with minimal debugger functionality.
 */
export class OctaveRuntime extends EventEmitter {

	private _sc: StreamCatcher = new StreamCatcher();

	private _inDebug: boolean = false;

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string = "";
	public get sourceFile() {
		return this._sourceFile;
	}
	// The function that is being debugged
	private currentFunction: string = "";

	// the contents (= lines) of the one and only file
	private _sourceLines: string[] = [];

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	private _stackFrames: OctaveStackFrame[] = [];


	constructor() {
		super();
	}

	public async initialize(args: LaunchRequestArguments) {
		let pathProperty = Path.parse(args.program);
		let dir = pathProperty.dir;
		let file = pathProperty.name;
		this.currentFunction = file;

		let session: ChildProcess;
		{
			const exec = args.exec || 'octave-cli';
			const argv = ['--interactive', '--no-gui'];
			const spawnOption = { cwd: dir };
			session = spawn(exec, argv, spawnOption);
		}
		

		consoleLog(1,'spawn session with pid', session.pid);
		this._sc.init(session.stdin, session.stdout, session.stderr, (lines: string[]) => this.resolveErrorMessage(lines));
		// Flush initial output
		await this._sc.request();
		// Set debug_on_XX to true
		await this._sc.request('debug_on_error(1)');
		await this._sc.request('debug_on_warning(1)');
		await this._sc.request('debug_on_interrupt(1)');
		// Remove blank lines
		await this._sc.request('format compact');
		// Set breakpoint on first line if step on entry
		if (args.stopOnEntry) {
			await this.setBreakPoints(this.currentFunction, [1]);
		}

		// Verify file and folder existence
		// xxx: We can improve the error handling
		if (!Fs.existsSync(args.program)) {
			console.error( `Error: File ${args.program} not found`);
		}
		if (args.cwd && !Fs.existsSync(args.cwd)) {
			console.error( `Error: Folder ${args.cwd} not found`);
		}
		
		consoleLog(1,'debugger is running in the background with pid', session.pid);
	}

	/**
	 * Start executing the given program.
	 */
	public async start() {	
		this._sc.inDebugMode = true;
		this._sc.request(this.currentFunction);
		
		consoleLog(1,'start debugging');
	}

	/**
	 * Continue execution to the end
	 */
	public async continue() {
		this._inDebug = false;
		await this._sc.request('dbcont');
	}

	/**
	 * Step to the next non empty line.
	 */
	public async step() {
		await this._sc.request('dbnext');
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public async setBreakPoints(func: string, line: number[]) : Promise<DebugProtocol.Breakpoint[]> {
		if (line.length === 0) {
			return [];
		}

		let lines = await this._sc.request('dbstop ' + func + ' ' + line.join(' '));
		if (!RH.isAnswerResponse) {
			consoleErr('expect lines contain an answer');
			return [];
		}
		let res = RH.getAnswers(lines);
		let breakpoints = res[0].map(Number);
		consoleLog(1,'breakpoints of ' + func + ' are set to ' + breakpoints.join(' '));

		return breakpoints.map(line => 
			<DebugProtocol.Breakpoint>{ 
				id: this._breakpointId++, 
				verified: true, 
				line: line 
			});
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number) {
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		// this._breakPoints.delete(path);
	}

	public getStackFrames() {
		return this._stackFrames;
	}

	public async getListOfVariables() {
		const lines = await this._sc.request('whos');
		return RH.parseWhosResponse(lines);
	}

	public async getValueofVariable(vari: RH.VariableFromWhosRequest) {
		const lines = await this._sc.request(vari.name);
		logger.log(lines.slice(0, lines.length - 1).join('\n') + '\n', LogLevel.Verbose);
		if (RH.isSize1x1(vari.size)) {
			return RH.parseVariable(lines);
		} else {
			// For now just return a unviewable variable
			// TODO: able to handle multi-dimensional variables
			return new Variable(vari.name, vari.size.join('x') +' ' + vari.class +  ' matrix');
		}
		
	}

	public async getSource(funcs: string[]): Promise<{ [func: string]: DebugProtocol.Source }> {
		if (funcs.length === 0) {
			return {};
		}

		let lines = await this._sc.request('which ' + funcs.join(' '));
		let files = RH.parseWhichResponse(lines);
		let ans: { [func: string]: DebugProtocol.Source } = {};
		for(let func in files) {
			ans[func] = <DebugProtocol.Source> { name: func, path: files[func] };
		}
		return ans;
	}

	// helper methods
	private resolveErrorMessage(lines: string[]) {
		logger.log(lines.slice(0, lines.length - 1).join('\n') + '\n', 4);
		this._stackFrames = EH.getStackFrames(lines);
		let err = true;
		if (this._stackFrames.length === 0) {
			this._stackFrames.push(EH.getStackFrameFromStopMessage(lines));
			err = false;
		}
		if (err) {
			this.sendEvent('stopOnError');
			this._inDebug = true;
		} else if (this._inDebug) {
			this.sendEvent('stopOnStep');
		} else {
			this._inDebug = true;
			this.sendEvent('stopOnBreakpoint');
		}
	}


	private sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}
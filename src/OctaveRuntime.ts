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
import { consoleLog, consoleErr } from './utils';
import { spawn, ChildProcess } from 'child_process';


/**
 * A Octave runtime with minimal debugger functionality.
 */
export class OctaveRuntime extends EventEmitter {

	private _sc: StreamCatcher = new StreamCatcher();

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string = "";
	public get sourceFile() {
		return this._sourceFile;
	}
	private file: string = "";

	// the contents (= lines) of the one and only file
	private _sourceLines: string[] = [];

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	private _stackFrames: DebugProtocol.StackFrame[] = [];


	constructor() {
		super();
	}

	public async initialize(args: LaunchRequestArguments) {
		let pathProperty = Path.parse(args.program);
		let dir = pathProperty.dir;
		let file = pathProperty.name;
		this.file = file;

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
		this._sc.request(this.file);
		
		consoleLog(1,'start debugging');
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue() {
		
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

	public getVariables() {
		this._sc.request('whos');
		return Array<DebugProtocol.Variable>();
	}

	// private methods
	private resolveErrorMessage(lines: string[]) {
		// this._stackFrames = EH.getStackFrames(lines);
		this.sendEvent('stopOnBreakpoint');
	}




	private sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}
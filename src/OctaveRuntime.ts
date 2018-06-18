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

export interface OctaveBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

export interface FakeStackFrame {
	index: number;
	name: string;
	file: string;
	line: number;
}

/**
 * A Octave runtime with minimal debugger functionality.
 */
export class OctaveRuntime extends EventEmitter {

	private _session: OctaveDebuggerSession = OctaveDebuggerSession.getDummySession();
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

	// maps from sourceFile to array of Octave breakpoints
	private _breakPoints = new Map<string, OctaveBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;


	constructor() {
		super();
	}

	public async initialize(args: LaunchRequestArguments) {
		let pathProperty = Path.parse(args.program);
		let dir = pathProperty.dir;
		let file = pathProperty.name;
		this.file = file;

		this._session = OctaveDebuggerSession.spawnSession(args.exec, ['--interactive', '--no-gui'], { cwd: dir });
		console.log('spawn session with pid', this._session.pid);
		this._session.stderr.on("data", (buffer) => {console.log("ERR: " + buffer.toString()); this.sendEvent('stopOnBreakpoint');});
		this._sc.init(this._session.stdin, this._session.stdout);
		await this._sc.request();
		console.log(1, await this._sc.request('debug_on_error(1)'));
		console.log(2, await this._sc.request('debug_on_warning(1)'));
		console.log(3, await this._sc.request('debug_on_interrupt(1)'));

		// Verify file and folder existence
		// xxx: We can improve the error handling
		if (!Fs.existsSync(args.program)) {
			console.error( `Error: File ${args.program} not found`);
		}
		if (args.cwd && !Fs.existsSync(args.cwd)) {
			console.error( `Error: Folder ${args.cwd} not found`);
		}
		
		console.log('debugger is running in the background with pid', this._session.pid);
	}

	/**
	 * Start executing the given program.
	 */
	public start() {	
		this._session.write(this.file);
		this._sc.inDebugMode = true;
		console.log('start debugging');
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue(reverse = false) {
		this.run(reverse, undefined);
	}

	/**
	 * Step to the next/previous non empty line.
	 */
	public step() {
		this._session.write('dbnext');
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public stack(startFrame: number, endFrame: number): [Array<FakeStackFrame>, number] {

		const words = this._sourceLines[this._currentLine].trim().split(/\s+/);

		const frames = new Array<FakeStackFrame>();
		// every word of the current line becomes a stack frame.
		for (let i = startFrame; i < Math.min(endFrame, words.length); i++) {
			const name = words[i];	// use a word of the line as the stackframe name
			frames.push({
				index: i,
				name: `${name}(${i})`,
				file: this._sourceFile,
				line: this._currentLine
			});
		}
		return [frames, words.length];
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public async setBreakPoints(func: string, line: number[]) : Promise<DebugProtocol.Breakpoint[]> {

		// const bp = <OctaveBreakpoint> { verified: false, line, id: this._breakpointId++ };
		// let bps = this._breakPoints.get(path);
		// if (!bps) {
		// 	bps = new Array<OctaveBreakpoint>();
		// 	this._breakPoints.set(path, bps);
		// }
		// bps.push(bp);

		// this.verifyBreakpoints(path);


		// Actual work
		let res = RH.getAnswers(await this._sc.request('dbstop ' + func + ' ' + line.join(' ')));
		let breakpoints = res[0];
		console.log('breakpoints of ' + func + ' are set to ' + breakpoints.join(' '));

		
		return breakpoints.map(line => 
			<DebugProtocol.Breakpoint>{ 
				id: this._breakpointId++, 
				verified: false, 
				line: line 
			});
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number) : OctaveBreakpoint | undefined {
		let bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		// this._breakPoints.delete(path);
	}

	// private methods

	/**
	 * Run through the file.
	 * If stepEvent is specified only run a single step and emit the stepEvent.
	 */
	private run(reverse = false, stepEvent?: string) {
		if (reverse) {
			for (let ln = this._currentLine-1; ln >= 0; ln--) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					return;
				}
			}
			// no more lines: stop at first line
			this._currentLine = 0;
			this.sendEvent('stopOnEntry');
		} else {
			for (let ln = this._currentLine+1; ln < this._sourceLines.length; ln++) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					return true;
				}
			}
			// no more lines: run to end
			this.sendEvent('end');
		}
	}

	private verifyBreakpoints(path: string) : void {
		let bps = this._breakPoints.get(path);
		if (bps) {
			// this.loadSource(path);
			bps.forEach(bp => {
				if (!bp.verified && bp.line < this._sourceLines.length) {
					const srcLine = this._sourceLines[bp.line].trim();

					// if a line is empty or starts with '+' we don't allow to set a breakpoint but move the breakpoint down
					if (srcLine.length === 0 || srcLine.indexOf('+') === 0) {
						bp.line++;
					}
					// if a line starts with '-' we don't allow to set a breakpoint but move the breakpoint up
					if (srcLine.indexOf('-') === 0) {
						bp.line--;
					}
					// don't set 'verified' to true if the line contains the word 'lazy'
					// in this case the breakpoint will be verified 'lazy' after hitting it once.
					if (srcLine.indexOf('lazy') < 0) {
						bp.verified = true;
						this.sendEvent('breakpointValidated', bp);
					}
				}
			});
		}
	}
	
	public getVariables() {
		this._sc.request('whos');
		return Array<DebugProtocol.Variable>();
	}

	private writeToSession(str: string) {

	}

	private writeToSessionAndGetResponse(str: string) {
		this.writeToSession(str);
	}


	/**
	 * Fire events if line has a breakpoint or the word 'exception' is found.
	 * Returns true is execution needs to stop.
	 */
	private fireEventsForLine(ln: number, stepEvent?: string): boolean {

		const line = this._sourceLines[ln].trim();

		// if 'log(...)' found in source -> send argument to debug console
		const matches = /log\((.*)\)/.exec(line);
		if (matches && matches.length === 2) {
			this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index);
		}

		// if word 'exception' found in source -> throw exception
		if (line.indexOf('exception') >= 0) {
			this.sendEvent('stopOnException');
			return true;
		}

		// is there a breakpoint?
		const breakpoints = this._breakPoints.get(this._sourceFile);
		if (breakpoints) {
			const bps = breakpoints.filter(bp => bp.line === ln);
			if (bps.length > 0) {

				// send 'stopped' event
				this.sendEvent('stopOnBreakpoint');

				// the following shows the use of 'breakpoint' events to update properties of a breakpoint in the UI
				// if breakpoint is not yet verified, verify it now and send a 'breakpoint' update event
				if (!bps[0].verified) {
					bps[0].verified = true;
					this.sendEvent('breakpointValidated', bps[0]);
				}
				return true;
			}
		}

		// non-empty line
		if (stepEvent && line.length > 0) {
			this.sendEvent(stepEvent);
			return true;
		}

		// nothing interesting found -> continue
		return false;
	}



	private sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}
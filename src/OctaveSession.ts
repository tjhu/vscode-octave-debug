import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';

export class OctaveDebuggerSession {
	private ErrFunc = () => { console.log('Octave runtime is being used before initialized'); };
	public stdin = new Writable;
	public stdout = new Readable;
	public stderr = new Readable;
	public on: Function = this.ErrFunc;
    public kill: Function = this.ErrFunc;

	constructor(session?:ChildProcess) {
        if (session === undefined) {
			this.write = this.ErrFunc;
            return;
        }

		this.stdin = session.stdin;
		this.stdout = session.stdout;
		this.stderr = session.stderr;
		this.on = (type:string, callback:Function) => session.on(type, callback);
		this.kill = () => session.kill();
	}

	public static spawnSession(exec: string, args: string[]=[], options: {}={}) {
		return new OctaveDebuggerSession(spawn(exec, args, options));
	}

	public static getDummySession() {
		return new OctaveDebuggerSession();
	}

	public write(str: string) {
		this.stdin.write(str + '\n');
	}
}
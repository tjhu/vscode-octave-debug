import {spawn, ChildProcess} from 'child_process';
import { Readable, Writable } from 'stream';

export class OctaveSession {
	public stdin = new Writable;
	public stdout = new Readable;
	public stderr = new Readable;
	public on: Function;
    public kill: Function;

    private ErrFunc = () => { console.error('Octave runtime is being used before initialized'); };

	constructor(session?:ChildProcess) {
        if (session === undefined) {
            this.on = this.ErrFunc;
            this.kill = this.ErrFunc;
            return;
        }

		this.stdin = session.stdin;
		this.stdout = session.stdout;
		this.stderr = session.stderr;
		this.on = (type:string, callback:Function) => session.on(type, callback);
		this.kill = () => session.kill();
	}
}
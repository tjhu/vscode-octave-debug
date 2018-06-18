/**
 * Copy and modify from https://github.com/raix/vscode-perl-debug
 * 
 * This file contains the stream catcher
 * it's basically given an input and out stream
 * it takes requests and generates a response from the streams
 */

import { Writable, Readable } from 'stream';
import * as RX from './RegExp';
import * as RH from './ResponseHelper';

interface RequestTask {
    command?: string;
    resolve: Function;
    reject: Function;
}

export class StreamCatcher {
    public debug: boolean = true;
    private requestQueue: RequestTask[] = [];
    private requestRunning?: RequestTask= undefined;

    private buffer: string[] = [];

    public inDebugMode: boolean = false;

    // xxx: consider removing ready - the user should not have to care about that...
    public ready: boolean = false;
    private readyListeners: Function[] = [];
    private readyResponse: string[] = [];

    public input: Writable = new Writable;

    constructor() {}

    public init(input: Writable, output: Readable) {
        this.input = input;

        let lastBuffer = '';

        output.on('data', (buffer) => {
            if (this.debug) {
                console.log(buffer);
                console.log('RAW:', buffer.toString());
            }
            const data = lastBuffer + buffer.toString();
            const lines = data.split(/\r\n|\r|\n/);

            lines.forEach(line => this.buffer.push(line));
            const commandIsDone = this.inDebugMode ? RH.isCompleteDebugResponse(this.buffer) : RH.isCompleteAnswerResponse(this.buffer);

            if (/\r\n|\r|\n$/.test(data) || commandIsDone) {
                lastBuffer = '';
            } else {
                let temp = this.buffer.pop();
                if (temp) {
                    lastBuffer = temp;
                }
            }

            if (commandIsDone) {
                const data = this.buffer;
                this.buffer = [];
                // xxx: We might want to verify the DB nr and the cmd number
                this.resolveRequest(data);
            } 
        });
        output.on('close', () => {
            console.log('debugger stdout is closed');
        });
    }

    public readline(line: string) {
        if (this.debug) {
            console.log('line:', line);
        } 
        
        this.buffer.push(line);
        // Test for command end
        let commandEnd: boolean = false;
        if (RX.lastCommandLine.test(line) || (!this.inDebugMode && RX.emptyLine.test(line))) {
            if (this.debug) {
                console.log('END:', line);
            }
            const data = this.buffer;
            this.buffer = [];
            // xxx: We might want to verify the DB nr and the cmd number
            this.resolveRequest(data);
        }
    }

    public resolveRequest(data: string[]) {
        const req = this.requestRunning;
        if (req) {
            if (req.command) {
                // prepend command to data
                // data.unshift(req.command);
            }

            req.resolve(data);
            // Reset state making room for next task
            this.buffer = [];
            this.requestRunning = undefined;
        }
        this.nextRequest();
    }

    public nextRequest() {
        if (!this.requestRunning && this.requestQueue.length) {
            // Set new request
            this.requestRunning = this.requestQueue.shift();
            // this.logOutput(`NEXT: ${this.requestRunning.command}\n`);
            // a null command is used for the initial run, in that case we don't need to
            // do anything but listen
            if (this.requestRunning !== undefined && this.requestRunning.command !== undefined) {
                this.input.write(`${this.requestRunning.command}\n`);
            }
        }
    }

    public request(command?: string): Promise<string[]> {
        if (this.debug) {
            console.log(command ? `CMD: "${command}"` : 'REQ-INIT');
        }
        return new Promise((resolve, reject) => {
            // Add our request to the queue
            this.requestQueue.push({
                command,
                resolve,
                reject
            });

            this.nextRequest();
        });
    }

    public onReady(f: ((_: string[]) => void)) {
        if (this.ready) {
            f(this.readyResponse);
        } else {
            this.readyListeners.push(f);
        }
    }

    public isReady(): Promise<string[]> {
        // return new Promise(resolve => this.onReady(res: => resolve(res)));
        return new Promise((resolve, reject) =>  {
            this.onReady(res => resolve(res));
        });
    }

    public destroy() {
        return Promise.resolve();
    }
}
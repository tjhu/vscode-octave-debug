/**
 * Copy and modify from https://github.com/raix/vscode-perl-debug
 * 
 * This file contains the stream catcher
 * it's basically given an input and out stream
 * it takes requests and generates a response from the streams
 */

import { Writable, Readable } from 'stream';
import * as EH from './ErrorMessageHelper';
import * as RH from './ResponseHelper';
import * as Utils from './Utils';
import { consoleErr, consoleLog } from './Utils';

interface RequestTask {
    command?: string;
    resolve: Function;
    reject: Function;
}

export type fLineHandler = (_: string[]) => void;

export class StreamCatcher {
    private requestQueue: RequestTask[] = [];
    private requestRunning?: RequestTask= undefined;

    private stdinLineBuffer: string[] = [];

    public inDebugMode: boolean = false;

    public stdin: Writable = new Writable;

    constructor() {}

    public init(stdin: Writable, stdout: Readable, stderr: Readable, resolveErrorMessage: fLineHandler) {
        this.stdin = stdin;
        this.configStdin(stdout);
        this.configStderr(stderr, resolveErrorMessage);
    }

    private configStdin (stdin: Readable) {
        let lastBuffer = '';
        stdin.on('data', (buffer) => {
            consoleLog(10, buffer);
            consoleLog(5, 'RAW:', buffer.toString());
            const data = lastBuffer + buffer.toString();
            const lines = data.split(/\r\n|\r|\n/);

            lines.forEach(line => this.stdinLineBuffer.push(line));
            const commandIsDone = RH.isCompleteResponse(this.stdinLineBuffer);

            if (/\r\n|\r|\n$/.test(data) || commandIsDone) {
				lastBuffer = '';
			} else {
				let temp = this.stdinLineBuffer.pop();
                if (temp === undefined) {
                    consoleErr('stream buffer should not be empty');
                }
                lastBuffer = temp || '';
			}

            if (commandIsDone) {
                const data = Utils.removeEmptyLines(this.stdinLineBuffer);
                this.stdinLineBuffer = [];
                this.resolveRequest(data);
                consoleLog(3, '\nSTARTOUT' + '-'.repeat(14) + '\n' + data.join('\n') + '\nENDOUT' + '-'.repeat(16) + '\n');
            } 
        });
    }

    private configStderr (stderr: Readable, resolveErrorMessage: fLineHandler) {
        let lastBuffer = '';
        let lineBuffer: string[] = [];
        stderr.on('data', (buffer) => {
            consoleLog(10, buffer);
            consoleLog(5, 'RAWERR:', buffer.toString());
            const data = lastBuffer + buffer.toString();
            const lines = data.split(/\r\n|\r|\n/);

            lines.forEach(line => lineBuffer.push(line));
            const commandIsDone = EH.isStopMessage(lineBuffer);

            
            if (/\r\n|\r|\n$/.test(data) || commandIsDone) {
				lastBuffer = '';
			} else {
				let temp = lineBuffer.pop();
                if (temp === undefined) {
                    consoleErr('stream buffer should not be empty');
                }
                lastBuffer = temp || '';
			}

            if (commandIsDone) {
                const data = Utils.removeEmptyLines(lineBuffer);
                lineBuffer = [];
                resolveErrorMessage(data);
                consoleLog(3, '\nSTARTERR' + '-'.repeat(14) + '\n' + data.join('\n') + '\nENDERR' + '-'.repeat(16) + '\n');
            } 
        });
    }


    public resolveRequest(data: string[]) {
        const req = this.requestRunning;
        if (req) {
            req.resolve(data);
            // Reset state making room for next task
            this.stdinLineBuffer = [];
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
                this.stdin.write(`${this.requestRunning.command}\n`);
            }
        }
    }

    public request(command?: string): Promise<string[]> {
        consoleLog(4, command ? `CMD: "${command}"` : 'REQ-INIT');

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
}
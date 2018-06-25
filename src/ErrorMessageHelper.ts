/**
 * Helper for parsing message from debug rumtime from stderr
 */
import * as RX from './RegExp';
import { consoleErr } from './Utils';
import { OctaveStackFrame } from './OctaveRuntime';
import * as Path from 'path';

export function isStopMessage(lines: string[]) {
    if (lines.length < 3) {
        return false;
    }
    return RX.stopMessage.firstLine.test(lines[lines.length - 3]) &&
        RX.stopMessage.secondLine.test(lines[lines.length - 2]) &&
        RX.stopMessage.thirdLine.test(lines[lines.length - 1]);
}

export function getStackFrames(lines: string[]): OctaveStackFrame[] {
    let i = lines.findIndex((s) => RX.stackFrame.start.test(s)) + 1;
    if (i < 0) {
        consoleErr('list stack frame is expected, but not found');
        return [];
    }

    let ans: OctaveStackFrame[] = [];
    let frameId = 0;
    let match;
    while(match = lines[i++].match(RX.stackFrame.frame)) {
        ans.push(<OctaveStackFrame>{
            id: frameId++,
            name: match[1],
            func: match[1],
            line: Number(match[2]),
            column: Number(match[3])
        });
    }
    return ans;
}

export function getStackFrameFromStopMessage(lines: string[]): OctaveStackFrame {
    const firstLine = lines[0];
    const match = firstLine.match(RX.stopMessage.firstLine);
    if (match === null) {
        consoleErr('unexpected first line in: ', lines);
        return <OctaveStackFrame> {
            id: 0,
            name: 'error',
            func: 'error',
            line: 0,
            column: 0
        };
    }
    const fullPath = match[1];
    const func = Path.parse(fullPath).name;
    return <OctaveStackFrame>{
        id: 0,
        name: func,
        func: func,
        line: Number(match[2]),
        column: 0
    };
}
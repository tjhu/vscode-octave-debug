/**
 * Helper for parsing response from debug rumtime from stdout
 */
import * as RX from './RegExp';
import * as Utils from './Utils';
import { consoleErr } from './Utils';
import { DebugProtocol } from 'vscode-debugprotocol/lib/debugProtocol';


export interface VariableFromWhosRequest {
	name: string;
	size: string[];
	class: string;
	attribute: Set<string>;
}

/**
 * Check if lines is a complete response from debug
 * @param lines response from octave runtime
 * @param inDebugMode optional. If it is not set, isCompleteResponse(lines) === isCompleteResponse(lines, true) || isCompleteResponse(lines, false) 
 * @returns true if lines is a complete response
 */
export function isCompleteResponse(lines: string[], inDebugMode?: boolean): boolean {
    if (inDebugMode === undefined) {
        return isCompleteResponse(lines, true) || isCompleteResponse(lines, false);
    } else if (inDebugMode) {
        return isCompleteDebugResponse(lines);
    } else {
        return isCompletePromptResponse(lines);
    }
}

/**
 * Check if lines is a complete debug response that ends with "octave:1>"
 */
export function isCompletePromptResponse(lines: string[]) {
    const lastLine = lines[lines.length - 1];
    return RX.octavePrompt.test(lastLine);
}

/**
 * Check if lines is a complete debug response that ends with "debug>"
 */
export function isCompleteDebugResponse(lines: string[]) {
    const lastLine = lines[lines.length - 1];
    return RX.debugPrompt.test(lastLine);
}

/**
 * Check if lines is a complete answer response that starts with "ans = "
 */
export function isAnswerResponse(lines: string[]) {
    return isSingleAnswerRespnse(lines) || isMultipleAnswerResponse(lines);
}

/**
 * Check to see if lines is ['ans = $_', prompt]
 */
export function isSingleAnswerRespnse(lines: string[]) {
    return RX.singleLineVariable.test(lines[0]) && /* first line must be in '$varName = $varVal' format */
        lines.filter(l => !RX.emptyLine.test(l)).length === 2; /* must only follow by a prompt */
}

/**
 * Check to see if lines is ['$varName =', ...$varVals , '', prompt]
 */
export function isMultipleAnswerResponse(lines: string[]) {
    return RX.MultilineVariable.firstLine.test(lines[0]) &&
        lines.length >= 3; /* must have at least three lines */

}

function getSingleAnswer(lines: string[]) {
    return Utils.splitByWhiteSpaces(lines[0])[2];
}

function getMultipleAnswers(lines: string[]) {
    const data = lines.slice(1, lines.length - 1);
    let answers: string[][] = [];
    for (let line of data) {
        let entries = Utils.splitByWhiteSpaces(line);
        answers.push(entries);
    }
    return answers;
}

export function getAnswers(lines: string[]): string[][] {
    if (isSingleAnswerRespnse(lines)) {
        return [[getSingleAnswer(lines)]];
    } else if (isMultipleAnswerResponse(lines)) {
        return getMultipleAnswers(lines);
    } else {
        return [];
    }
}

export function parseWhichResponse(lines: string[]) {
    let ans: {[func: string]: string} = {};

    lines.splice(lines.length - 1);
    for(let line of lines) {
        let match : RegExpMatchArray | null;
        if(match = line.match(RX.whichRequest.line)) {
            ans[match[1]] = match[2];
        }
    }
    return ans;
}

export function parseWhoResponse(lines: string[]) {
    if(lines.length !== 3) {
        consoleErr('lines.length from who request is ' + lines.length + '. 3 is expected');
        return [];
    }
    const line = lines[1];
    return Utils.splitByWhiteSpaces(line);
}

export function parseWhosResponse(lines: string[]) {
    lines = lines.slice(3, lines.length - 2);

    let ans: VariableFromWhosRequest[] = [];
    for(let line of lines) {
        let arr = Utils.splitByWhiteSpaces(line);
        if([4, 5].indexOf(arr.length) < 0) {
            consoleErr('unexpected line from whos command: ', line);
            break;
        }
        let hasAttribute = arr.length === 5;
        let index = 0 + Number(hasAttribute);
        ans.push(<VariableFromWhosRequest>{
            name: arr[index++],
            size: arr[index++].split('x'),
            class: arr[index + 1],
            attribute: hasAttribute ? new Set(arr[0]) : new Set()
        });
    }
    return ans;
}

export function parseVariable(lines: string[]): DebugProtocol.Variable | undefined {
    let name = Utils.splitByWhiteSpaces(lines[0])[0];
    let value: string;
    let error: boolean = false;

    if(isSingleAnswerRespnse(lines)) {
        let match = lines[0].match(RX.singleLineVariable);
        if (match === null) {
            consoleErr('unable to parse variable with lines', lines);
            return undefined;
        }
        value = match[2];
    } else if(isMultipleAnswerResponse(lines)) {
        value = lines.slice(1, lines.length - 1).join('\n');
    } else {
        consoleErr('unable to parse variable with lines', lines);
        return undefined;
    }

    return <DebugProtocol.Variable>{ name: name, value: value };
}

export function getVariableName(lines: string[]) {
    return Utils.splitByWhiteSpaces(lines[0])[0];
}


// Helpers


export function isSize1x1(size: string[]) {
    return size.length === 2 &&
        size[0] === '1' &&
        size[1] === '1';
}

/**
 * Helper for parsing response from debug rumtime from stdout
 */
import * as RX from './RegExp';

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
    const firstLine = splitByWhiteSpaces(lines[0]);

    return firstLine.length === 3 && /* first line must be in '$varName = $varVal' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length === 2; /* must only follow by a prompt */
}

/**
 * Check to see if lines is ['$varName =', ...$varVals , '', prompt]
 */
export function isMultipleAnswerResponse(lines: string[]) {
    const firstLine = splitByWhiteSpaces(lines[0]);

    return firstLine.length === 2 && /* first line must be in 'ans =' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length > 3 && /* must have only one trailing empty line follows by prompt */
        lines[lines.length - 1] === '';
}

function getSingleAnswer(lines: string[]) {
    return splitByWhiteSpaces(lines[0])[2];
}

function getMultipleAnswers(lines: string[]) {
    const data = lines.slice(3, lines.length - 3);
    let answers: string[][] = [];
    for (let line of data) {
        let entries = splitByWhiteSpaces(line);
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


// Helpers
function splitByWhiteSpaces(str: string) {
    return str.split(/\s+/);
}

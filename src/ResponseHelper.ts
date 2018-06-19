/**
 * Helper for parsing response from debug rumtime from stdio
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

export function isCompletePromptResponse(lines: string[]) {
    const lastLine = lines[lines.length - 1];
    const secondLastLine = lines[lines.length - 2];

    return RX.octavePrompt.test(lastLine);
}


/**
 * Check if lines is a complete debug response that ends with "debug:>"
 */
export function isCompleteDebugResponse(lines: string[]) {
    const lastLine = lines[lines.length - 1];
    const secondLastLine = lines[lines.length - 2];

    return RX.debugPrompt.test(secondLastLine) &&
        lastLine === '';
}


/**
 * Check if lines is a complete answer response that starts with "ans = "
 */
export function isCompleteAnswerResponse(lines: string[]) {
    return isSingleAnswerRespnse(lines) || isMultipleAnswerResponse(lines);
}

/**
 * Check to see if lines is ['ans = $_', prompt]
 */
export function isSingleAnswerRespnse(lines: string[]) {
    const firstLine = splitByWhiteSpaces(lines[0]);

    return firstLine.length === 3 && /* first line must be in 'ans = $_' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length === 2; /* must only follow by a prompt */
}

/**
 * Check to see if lines is ['ans =', ... , '', prompt]
 */
export function isMultipleAnswerResponse(lines: string[]) {
    const firstLine = splitByWhiteSpaces(lines[0]);

    return firstLine.length === 2 && /* first line must be in 'ans =' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length > 3 && /* must have only one trailing empty line follows by prompt */
        lines[lines.length - 1] === '';
}

function getSingleAnswer_Number(lines: string[]) {
    return Number(splitByWhiteSpaces(lines[0][2]));
}

function getMultipleAnswers_Number(lines: string[]) {
    const data = lines.slice(3, lines.length - 3);
    let answers: Number[][] = [];
    for (let line of data) {
        let entries = splitByWhiteSpaces(line);
        answers.push(entries.map(Number));
    }
    return answers;
}

export function getAnswers(lines: string[]): Number[][] {
    if (isSingleAnswerRespnse(lines)) {
        return [[getSingleAnswer_Number(lines)]];
    } else if (isMultipleAnswerResponse(lines)) {
        return getMultipleAnswers_Number(lines);
    } else {
        return [];
    }
}


// Helpers
function splitByWhiteSpaces(str: string) {
    return str.split(/\s+/);
}

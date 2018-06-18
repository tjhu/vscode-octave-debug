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
        return isCompleteAnswerResponse(lines);
    }
}


/**
 * Check if lines is a complete debug response that ends with "debug:>"
 * @param lines response from octave runtime
 * @returns true if lines is a complete debug response
 */
export function isCompleteDebugResponse(lines: string[]) {
    const lastLine = lines[lines.length - 1];
    const secondLastLine = lines[lines.length - 2];

    return RX.debugPrompt.test(secondLastLine) &&
        lastLine === '';
}


/**
 * Check if lines is a complete answer response that starts with "ans = "
 * @param lines response from octave runtime
 * @returns true if lines is a complete answer response
 */
export function isCompleteAnswerResponse(lines: string[]) {
    return isSingleAnswerRespnse(lines) || isMultipleAnswerResponse(lines);
}


export function isSingleAnswerRespnse(lines: string[]) {
    const firstLine = lines[0].split(/\s/);

    return firstLine.length === 3 && /* first line must be in 'ans = $_' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length === 2 && /* must have only one trailing empty line */
        lines[2] === '';
}

export function isMultipleAnswerResponse(lines: string[]) {
    const firstLine = lines[0].split(/\s/);

    return firstLine.length === 2 && /* first line must be in 'ans =' format */
        firstLine[0] === 'ans' &&
        firstLine[1] === '=' &&
        lines.length > 3 && /* must have only two trailing empty line */
        lines[lines.length - 1] === '' && 
        lines[lines.length - 2] === '';
}

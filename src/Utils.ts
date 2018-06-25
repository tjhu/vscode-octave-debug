import * as RX from './RegExp';

import { debugLevel } from './env';

function logWithWallHelper(loggerFunction: Function, debugLevel: number) {
    return(debug: number, ...args: any[]) => {
            if (debug <= debugLevel) {
                loggerFunction(...args);
            }
        };
}
function logHelper(loggerFunction: Function) {
    return(...args: any[]) => {
            loggerFunction(...args);
        };
}
export let consoleLog = logWithWallHelper(console.log, debugLevel);
export let consoleErr = logHelper(console.error);


// Helper for hashing
export function hash(str: string): number;
export function hash(lines: string[]): number;
export function hash(obj: string | string[]): number {
    if (typeof obj === 'string') {
        return hashString(obj);
    } else if (obj instanceof Array) {
        return hashStringArray(obj);
    } else {
        return 0;
    }
}

export function hashStringArray(arr: string[]) {
    return arr.map(hashString).reduce((a,b) => a + b, 0);
}


// Generate hash for a sting
// Reference: https://stackoverflow.com/a/7616484/6438359
export function hashString(str: string, hash=0): number {
    let chr: number;
    for (let i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


// Helpers
export function splitByWhiteSpaces(str: string) {
    return removeEmptyLines(str.split(/\s+/));
}

export function removeEmptyLines(lines: string[]) {
    return lines.filter(l => !RX.emptyLine.test(l));
}
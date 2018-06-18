import * as Path from 'path';

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


export function normalizePath(path: string, cwd: string) {
    path = Path.normalize(path);
    path = Path.relative(path, cwd);
    if (process.platform === "win32") {
        path = path.replace('\\', '/');
    }
    return path;
}
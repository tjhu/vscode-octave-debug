import * as Path from 'path';

export function normalizePath(path: string, cwd: string) {
    path = Path.normalize(path);
    path = Path.relative(path, cwd);
    if (process.platform === "win32") {
        path = path.replace('\\', '/');
    }
    return path;
}
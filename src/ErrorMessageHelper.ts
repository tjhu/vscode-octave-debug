/**
 * Helper for parsing message from debug rumtime from stderr
 */
import * as RX from './RegExp';

export function isStopMessage(lines: string[]) {
    if (lines.length < 3) {
        return false;
    }
    return RX.stopMessage.firstLine.test(lines[lines.length - 3]) &&
        RX.stopMessage.secondLine.test(lines[lines.length - 2]) &&
        RX.stopMessage.thirdLine.test(lines[lines.length - 1]);
}
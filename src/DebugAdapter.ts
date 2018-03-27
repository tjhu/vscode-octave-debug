import {
	DebugSession
} from 'vscode-debugadapter';
import { OctaveDebugSession } from './OctaveDebug';

console.log("fuck bro");
DebugSession.run(OctaveDebugSession);

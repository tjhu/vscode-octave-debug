import {
	DebugSession
} from 'vscode-debugadapter';
import { OctaveDebugSession } from './OctaveDebugAdapter';

DebugSession.run(OctaveDebugSession);

export const debugPrompt = /^debug:\>\s*$/;
export const octavePrompt = /^octave:([0-9]+)\>\s*$/;


export const breakPoint = {
	// The condition my condition was in eg.:
	// '    break if (1)'
	condition: /^    break/,
	// This looks like a filename eg.:
	// 'test.pl:'
	filename: /^([a-zA-Z.\_\-0-9]+)\:$/,
	// Got a line nr eg.:
	// '5:\tprint "Testing\\n";'
	ln: /^ ([0-9]+):/,
};


export const fileMatch = /^[a-zA-Z]+::\(([a-zA-Z\._-]+):([0-9]+)\):/;

export const fileMatchException = /at ([a-zA-Z\._-]+) line ([0-9]+)\./;

export const codeErrorSyntax = /^syntax error at (\S+) line ([0-9]+), near ([\S|\s]+)/;

export const codeErrorRuntime = /([\S|\s]+) at (\S+) line ([0-9]+)\.$/;

// EG. PadWalker for scope investigation
export const codeErrorMissingModule = /^(\S+) module not found - please install$/;

export const debuggerSignature = /^  DB<[0-9]+> $/;
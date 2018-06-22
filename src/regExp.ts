export const debugPrompt = /^debug\>\s*$/;
export const octavePrompt = /^octave:([0-9]+)\>\s*$/;
export const emptyLine = /^\s*$/;

export const stopMessage = {
	firstLine: /^stopped in (.+) at line (\d+)$/,
	secondLine: /^(\d+): .+$/,
	thirdLine: emptyLine
};

export const stackFrame = {
	start: /^error: called from\s*$/,
	frame: /^\s+(.*) at line (\d+) column (\d+)\s*$/,
	end: emptyLine
};

export const whichRequest = {
	line: /^'(.+)' is a (?:function|script) from the file (.+)$/
};


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


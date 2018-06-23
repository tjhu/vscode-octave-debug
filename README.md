# VSCode Octave Debug Adapter Extension (Alpha)

This is the an simple debugger adapter for Octave on Visual Studio Code

## Features

* Breakpoints
* Stacktraces
* Variable inspections

![Octave Debug Demo](images/demo.gif)

## Requirements

* Octave executable. [Download](https://www.gnu.org/software/octave/download.html)
* Add Octave executable to path(or you can specify full path in launch.json)

## Known Issues

* three or above dimensional(3D+) variables are not supported

## Release Notes

### 0.0.0

Initial release of vscode Octave Debug Adapter extension

## Future work

* Add support for all data type (only support 1D currently).
* Add support for setFunctionBreakpoints.

## Credit

* [Microsoft/vscode-mock-debug](https://github.com/Microsoft/vscode-mock-debug) for providing the template
* [raix/vscode-perl-debug](https://github.com/raix/vscode-perl-debug) for design ideas and StreamCatcher

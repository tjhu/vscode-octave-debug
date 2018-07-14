# VSCode Octave Debug Adapter Extension (preview)

This is the an simple debugger adapter for Octave on Visual Studio Code

## Features

* Breakpoints
* Stacktraces
* Variable inspections

## Setup Guides
How to install octave and add to PATH. Ignore these if you have already done it.
* [Windows Setup Guide](#windows-setup-guide)
* [MacOS Setup Guide](#macos-setup-guide)
* [Linux Setup Guide](#linux-setup-guide)

## Usage

### First time setup
* From menu, select **Debug -> Add Configuration**
* Using **Add Cofiguration** button to add `Octave: Launch` to your launch.json (You don't need to add one if there is already one).
* Your launch.json should looks similar to the following:
  ```
  {
    "version": "0.2.0",
    "configurations": [
        {
            "type": "octave",
            "request": "launch",
            "name": "Octave Debug Adapter(preview)",
            "exec": "octave-cli",
            "program": "${command:AskForProgramName}"
        }
    ]
  }
  ```


---

## Windows Setup Guide

#### Install Octave

* Download and install Octave from the [offical website](https://www.gnu.org/software/octave/download.html)
* Installing using the default options is highly recommanded unless you know what you are doing

#### Add to path

* add the path of the dicretory containing the executale [to the PATH](https://stackoverflow.com/a/44272417/6438359)

[Return back to Setup Guides](#setup-guides)


## MacOS Setup Guide

#### Option 1(recommanded): install via package manager:

* Install brew. If you already installed brew, skip to next step.
    ```
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    ```

* Open up the terminal and enter the following command to install octave via brew.
    ```
    brew update && brew upgrade
    brew install octave
    ```

#### Option 2: follow instructions on Octave Wiki 
* follow instructions on [Octave Wiki](https://wiki.octave.org/Octave_for_macOS) then add the path of the dicretory containing the executale [to the PATH](https://stackoverflow.com/a/22465399/6438359)

#### Option 2: build from source
* build from [scouce](https://www.gnu.org/software/octave/download.html) then add the path of the dicretory containing the executale [to the PATH](https://stackoverflow.com/a/22465399/6438359)

[Return back to Setup Guides](#setup-guides)


## Linux Setup Guide

#### Option 1(recommanded): install via package manager. For example:

* Open up the terminal and enter the following command:
  ```
  sudo apt install octave
  ```

#### Option 2: build from source
1. build from [scouce](https://www.gnu.org/software/octave/download.html) then add the path(for example, `/usr/bin/octave`) of the dicretory containing the executale [to the PATH](https://stackoverflow.com/a/14638025/6438359)

[Return back to Setup Guides](#setup-guides)

---


## Release Notes

### 0.0.3

* Inspect value of a variable by hovering over its name in **VARIABLES** in **DEBUG** window

### 0.0.2

* Support debugging a file by right-clicking it

### 0.0.1

* Add instructions for setting up the environment

### 0.0.0

* Initial release of vscode Octave Debug Adapter extension
* Support set breakpoints, stop on error, stacktraces, and basic variable inspection

## Future work

* Add support for all data type (only support 1D currently).
* Add support for setFunctionBreakpoints.

## Credit

* [Microsoft/vscode-mock-debug](https://github.com/Microsoft/vscode-mock-debug) for providing the template
* [raix/vscode-perl-debug](https://github.com/raix/vscode-perl-debug) for design ideas and StreamCatcher

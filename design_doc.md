definition:
* DA: debug adapter
* VSC: Visual Studio Code

The main program stores a map of all root variables

VSC get contents of a variable by its id

a variable id is formated as its name followed by indices seperated by spaces, for example: 'A 1 2 5'

DA will first index into the map using the name, i.e. this._map['A']

DA will convert this variable to DebugProtol.Variable
* if this variable is a nested variable, DA will specify that it is an object




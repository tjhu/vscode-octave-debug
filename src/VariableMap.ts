/**
 * VariableMap: a data structure that helps to store all the variable
 */

import * as Utils from './Utils';
import * as RH from './ResponseHelper';


enum VariableType {
    Double = "double",
    Single = "single",
    DoubleComplex = "double complex",
    SingleComplex = "single complex",
    Char = "char",
    Int8 = "int8",
    Int16 = "int16",
    Int32 = "int32",
    Int64 = "int64",
    Uint8 = "uint8",
    Uint16 = "uint16",
    Uint32 = "uint32",
    Uint64 = "uint64",
    Object = 'Object'
}

/**
 * Each variable is a tree
 * Each of its child node will be a member field of the variable
 * Though this is takes log(n) tims to look up each sub-variable which is hella inefficient
 * But just stick with it for now
 */
export class OctaveVariable {

    private _type: VariableType;
    private _value: string;
    private _hash: number;
    public get hash() {
        return this._hash;
    }

    // Maybe change this to a {[index: string]: OctaveVariable} if we support custom data type in the future
    private children: OctaveVariable[] = [];


    public constructor(type: VariableType, value: string, hash: number) {
        this._type = type;
        this._value = value;
        this._hash = hash;
    }

    public get(indices: string[]): string {
        if (indices.length === 0) {
            return this._value;
        }

        let key = Number(indices.shift());
        return this.children[key].get(indices);
    }

}


export class VariableMap {
    private _map: { [name: string]: OctaveVariable } = {};


    public updateVariable(lines: string[]) {
        let name = RH.getVariableName(lines);
        // No need to update if the hash is the same
        if (name in this._map &&
            Utils.hash(lines) === this._map[name].hash) {
            return;
        }



    }

}


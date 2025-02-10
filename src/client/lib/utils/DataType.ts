import type { ExprCompileResult } from '$lib/editor/Block';

export class DataType {
	public static readonly PRIMITIVES = {
		STRING: { name: 'string', color: '#EBD93A', compile: () => ({ code: 'std::string', meta: { requires: new Set(['string']) } }) } as DataType,
		BOOL: { name: 'bool', color: '#59C059', compile: () => ({ code: 'bool', meta: { requires: new Set() } }) } as DataType,
		BYTE: { name: 'byte', color: '#CC4356', compile: () => ({ code: 'char', meta: { requires: new Set() } }) } as DataType,
		INT: { name: 'int', color: '#AF1A33', compile: () => ({ code: 'int', meta: { requires: new Set() } }) } as DataType,
		LONG: { name: 'long', color: '#8F0600', compile: () => ({ code: 'long', meta: { requires: new Set() } }) } as DataType,
		FLOAT: { name: 'float', color: '#8592E1', compile: () => ({ code: 'float', meta: { requires: new Set() } }) } as DataType,
		DOUBLE: { name: 'double', color: '#3B60C1', compile: () => ({ code: 'double', meta: { requires: new Set() } }) } as DataType
	} as const;

	public name: string;
	public color: string;

	public compile(): ExprCompileResult {
		return {
			code: this.name,
			meta: {
				requires: new Set(),
				precedence: null
			}
		};
	}
}


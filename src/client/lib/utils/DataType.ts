import type { ExprCompileResult } from '$lib/editor/Block';

export class DataType {
	public static readonly PRIMITIVES = {
		STRING: {
			name: 'string',
			numeric: false,
			color: '#EBD93A',
			compile: () => ({ code: 'std::string', meta: { requires: new Set(['string']), precedence: null, checks: [] } })
		} as DataType,
		BOOL: {
			name: 'bool',
			numeric: true,
			color: '#59C059',
			compile: () => ({ code: 'bool', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType,
		BYTE: {
			name: 'byte',
			numeric: true,
			color: '#CC4356',
			compile: () => ({ code: 'char', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType,
		INT: {
			name: 'int',
			numeric: true,
			color: '#AF1A33',
			compile: () => ({ code: 'int', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType,
		LONG: {
			name: 'long',
			numeric: true,
			color: '#8F0600',
			compile: () => ({ code: 'long', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType,
		FLOAT: {
			name: 'float',
			numeric: true,
			color: '#8592E1',
			compile: () => ({ code: 'float', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType,
		DOUBLE: {
			name: 'double',
			numeric: true,
			color: '#3B60C1',
			compile: () => ({ code: 'double', meta: { requires: new Set(), precedence: null, checks: [] } })
		} as DataType
	} as const;

	public readonly numeric: boolean = false;

	public constructor(public name: string = '', public color: string = 'black') {}

	public compile(): ExprCompileResult {
		return {
			code: this.name,
			meta: {
				requires: new Set(),
				precedence: null,
				checks: [],
				attributes: {
					lvalue: false,
					resolvedType: null
				}
			}
		};
	}
}


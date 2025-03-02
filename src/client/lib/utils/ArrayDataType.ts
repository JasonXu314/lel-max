import { union } from '$lib/compiler';
import type { ExprCompileResult } from '$lib/editor';
import { DataType } from './DataType';

export class ArrayDataType extends DataType {
	public static instances: Map<DataType, ArrayDataType[]> = new Map();

	private constructor(public readonly scalar: DataType, public elems: number | null = 1) {
		super('array', scalar.color);
	}

	public get rootScalar(): DataType {
		if (this.scalar instanceof ArrayDataType) {
			return this.scalar.rootScalar;
		} else {
			return this.scalar;
		}
	}

	public get dimensions(): number {
		return this.scalar instanceof ArrayDataType ? this.scalar.dimensions + 1 : 1;
	}

	public getDimension(dim: number): number {
		if (dim === 1) {
			return this.elems;
		} else if (this.scalar instanceof ArrayDataType) {
			return this.scalar.getDimension(dim - 1);
		} else {
			throw new Error('Requested dimension more than dimensionality of array');
		}
	}

	public setDimension(dim: number, size: number): void {
		if (dim === 1) {
			this.elems = size;
		} else if (this.scalar instanceof ArrayDataType) {
			this.scalar.setDimension(dim - 1, size);
		} else {
			throw new Error('Requested dimension more than dimensionality of array');
		}
	}

	public compile(): ExprCompileResult {
		const scalarResult = this.scalar.compile();

		return {
			code: `std::array<${scalarResult.code}, ${this.elems}>`,
			meta: {
				requires: union(scalarResult.meta.requires, ['array']),
				precedence: null,
				checks: [],
				attributes: {
					lvalue: false,
					resolvedType: null
				}
			}
		};
	}

	public static for(type: DataType, dims: number): DataType {
		if (this.instances.get(type)?.[dims]) {
			return this.instances.get(type)[dims];
		} else {
			if (dims === 1) {
				const arrType = new ArrayDataType(type);

				if (this.instances.get(type)) {
					this.instances.get(type)[dims] = arrType;

					return arrType;
				} else {
					this.instances.set(type, [, arrType]);

					return arrType;
				}
			} else {
				const arrType = new ArrayDataType(ArrayDataType.for(type, dims - 1));

				this.instances.get(type)[dims] = arrType;

				return arrType;
			}
		}
	}
}


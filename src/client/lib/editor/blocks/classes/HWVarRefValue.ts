import type { DataType } from '$lib/utils/DataType';
import { Value } from './Value';

// simple marker class for compilation
export abstract class HWVarRefValue extends Value {
	public readonly type = 'SYSTEM';

	public abstract readonly name: string;
	public abstract readonly dataType: DataType;
}


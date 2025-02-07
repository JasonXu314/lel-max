import { Block, Slot, Value, type IHost } from '$lib/editor';

export interface IValueHost extends IHost<Value> {
	valueSlots: Slot<Value>[];
}

export type ValueHost = Block & IValueHost;

export function hasValue(any: any): any is ValueHost {
	return any instanceof Block && 'valueSlots' in any;
}


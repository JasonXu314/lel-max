import { Block } from '$lib/editor/Block';
import type { Slot } from '../Slot';
import type { Value } from '../Value';
import type { IHost } from './common';

export interface IValueHost extends IHost<Value> {
	valueSlots: Slot<Value>[];
}

export type ValueHost = Block & IValueHost;

export function hasValue(any: any): any is ValueHost {
	return any instanceof Block && 'valueSlots' in any;
}


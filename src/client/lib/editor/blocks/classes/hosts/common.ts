import type { Predicate, Slot, Value } from '$lib/editor';

export interface IHost<T extends Predicate | Value> {
	adopt(block: T, slot: Slot<T>): void;
}


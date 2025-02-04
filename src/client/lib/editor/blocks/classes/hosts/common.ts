import type { Predicate } from '../Predicate';
import type { Slot } from '../Slot';
import type { Value } from '../Value';

export interface IHost<T extends Predicate | Value> {
	adopt(block: T, slot: Slot<T>): void;
}


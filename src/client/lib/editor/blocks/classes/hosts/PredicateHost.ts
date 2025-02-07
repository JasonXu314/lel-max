import { Block, Predicate, Slot, type IHost } from '$lib/editor';

export interface IPredicateHost extends IHost<Predicate> {
	predicateSlots: Slot<Predicate>[];
}

export type PredicateHost = Block & IPredicateHost;

export function hasPredicate(any: any): any is PredicateHost {
	return any instanceof Block && 'predicateSlots' in any;
}


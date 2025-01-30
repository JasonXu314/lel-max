import { Block } from '$lib/editor/Block';
import type { Predicate } from '../Predicate';
import type { Slot } from '../Slot';
import type { IHost } from './common';

export interface IPredicateHost extends IHost<Predicate> {
	predicateSlots: Slot<Predicate>[];
}

export type PredicateHost = Block & IPredicateHost;

export function hasPredicate(any: any): any is PredicateHost {
	return any instanceof Block && 'predicateSlots' in any;
}


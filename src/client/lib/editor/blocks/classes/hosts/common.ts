import type { AdoptionEvent } from '../ChainBlock';
import type { ChainBranchBlock, DisownmentEvent } from '../ChainBranchBlock';
import type { Predicate } from '../Predicate';
import type { Slot } from '../Slot';
import type { Value } from '../Value';

export interface IHost<T extends Predicate | Value> {
	adopt(block: T, slot: Slot<T>): void;

	notifyAdoption(evt: AdoptionEvent<ChainBranchBlock | T>): void;
	notifyDisownment(evt: DisownmentEvent<ChainBranchBlock | T>): void;
}


import { Block } from '$lib/editor/Block';
import { hasPredicate, type PredicateHost } from './hosts/PredicateHost';
import type { Slot } from './Slot';
import { SlottableBlock } from './SlottableBlock';

export abstract class Predicate extends SlottableBlock<Predicate> {
	public host: PredicateHost | null;

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.host !== null) this.host.traverse(cb);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.host !== null ? this.host.reduceUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public getSlots(other: Block): Slot<Predicate>[] {
		return hasPredicate(other) ? other.predicateSlots : [];
	}
}


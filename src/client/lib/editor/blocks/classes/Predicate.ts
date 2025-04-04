import { Block, hasPredicate, SlottableBlock, type PredicateHost, type Slot } from '$lib/editor';
import { Point } from '$lib/engine/Point';
import type { BlockClass } from '../colors/colors';

export abstract class Predicate extends SlottableBlock<Predicate> {
	public readonly type: BlockClass = 'CONDITION';

	public host: PredicateHost | null;

	public traverseChainUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.host !== null) this.host.traverseChain(cb);
	}

	public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public getSlots(other: Block): Slot<Predicate>[] {
		return hasPredicate(other) ? other.predicateSlots : [];
	}

	public duplicate(): Block[][] {
		const that = new (this.constructor as new () => Predicate)();

		that.position = this.position.add(new Point(this.width + 20, 0));

		return [[that]];
	}
}


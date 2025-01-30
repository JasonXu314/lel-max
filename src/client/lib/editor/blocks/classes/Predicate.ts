import { Block } from '$lib/editor/Block';
import type { Point } from '$lib/engine/Point';
import { hasPredicate, type PredicateHost } from './hosts/PredicateHost';
import type { Slot } from './Slot';

export abstract class Predicate extends Block {
	public host: PredicateHost | null;

	public snap(other: Block): Point | null {
		if (!hasPredicate(other)) return null;

		return this.snapSlot(other)?.position ?? null;
	}

	public snapSlot(other: PredicateHost): Slot<Predicate> | null {
		const dist = Math.sqrt(this.width ** 2 + this.width ** 2) / 2;

		return other.predicateSlots.find((slot) => this.position.distanceTo(slot.position) < dist) ?? null;
	}
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
}


import { Block, Slot, SlottableBlock, hasValue, type ValueHost } from '$lib/editor';
import { Point } from '$lib/engine/Point';

export abstract class Value extends SlottableBlock<Value> {
	public host: ValueHost | null;

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

	public getSlots(other: Block): Slot<Value>[] {
		return hasValue(other) ? other.valueSlots : [];
	}

	public duplicate(): Block[][] {
		const that = new (this.constructor as new () => Value)();

		that.position = this.position.add(new Point(this.width + 20, 0));

		return [[that]];
	}
}


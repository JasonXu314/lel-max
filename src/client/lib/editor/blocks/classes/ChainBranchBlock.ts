import type { Block } from '$lib/editor/Block';
import type { Point } from '$lib/engine/Point';
import { ChainBlock, type AdoptionEvent } from './ChainBlock';

export interface DisownmentEvent<Child = ChainBranchBlock> {
	child: Child;
	block: Block;
	chain: Block[];
}

export abstract class ChainBranchBlock extends ChainBlock {
	public abstract get notch(): Point;

	public parent: ChainBlock | null;

	public adopt(other: Block, ...args: any): void {
		if (this.parent) this.parent.notifyAdoption({ child: this, block: other, chain: [this] });
	}

	public disown(other: Block, ...args: any): void {
		if (this.parent && this.parent instanceof ChainBranchBlock) this.parent.notifyDisownment({ child: this, block: other, chain: [this] });
	}

	public notifyAdoption({ block, chain }: AdoptionEvent): void {
		if (this.parent) this.parent.notifyAdoption({ child: this, block, chain: [this, ...chain] });
	}

	public notifyDisownment({ block, chain }: DisownmentEvent): void {
		if (this.parent && this.parent instanceof ChainBranchBlock) this.parent.notifyDisownment({ child: this, block, chain: [this, ...chain] });
	}

	public snap(other: Block): Point | null {
		if (!(other instanceof ChainBlock)) return null;

		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.parent !== null) this.parent.traverseUp(cb);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.parent !== null ? this.parent.reduceUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}
}


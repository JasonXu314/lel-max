import { Block } from '$lib/editor/Block';
import type { Point } from '$lib/engine/Point';
import type { ChainBranchBlock } from './ChainBranchBlock';

export interface AdoptionEvent<Child = ChainBranchBlock> {
	child: Child;
	block: Block;
	chain: Block[];
}

export abstract class ChainBlock extends Block {
	public abstract get nubs(): Point[];

	public snap(other: Block): Point | null {
		return null;
	}

	public notifyAdoption(evt: AdoptionEvent): void {}

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}
}


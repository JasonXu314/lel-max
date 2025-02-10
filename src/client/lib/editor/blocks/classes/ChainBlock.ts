import type { LexicalScope } from '$lib/compiler';
import { Block, ChainBranchBlock, type BlockCompileResult, type StructureChangeEvent } from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import { Point } from '$lib/engine/Point';

export abstract class ChainBlock extends Block {
	public abstract get nubs(): Point[];

	public update(metadata: Metadata): void {
		super.update(metadata);

		this.alignGroup.forEach(({ block, position }) => {
			if (block instanceof ChainBranchBlock) {
				const notch = block.position.add(block.notch);

				if (notch.distanceTo(position) > 0.5) {
					block.drag(position.subtract(notch));
				}
			} else if (block && block.position.distanceTo(position) > 0.5) {
				block.drag(position.subtract(block.position));
			}
		});
	}

	public snap(other: Block): Point | null {
		return null;
	}

	public notifyAdoption(evt: StructureChangeEvent): void {}

	public duplicate(): Block[][] {
		const that = new (this.constructor as new () => ChainBlock)();

		that.position = this.position.add(new Point(this.width + 20, 0));

		return [[that]];
	}

	public duplicateChain(): Block[][] {
		const that = new (this.constructor as new () => ChainBlock)();

		that.position = this.position.add(new Point(this.width + 20, 0));

		return [[that]];
	}

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	public abstract compile(scope: LexicalScope): BlockCompileResult;
}


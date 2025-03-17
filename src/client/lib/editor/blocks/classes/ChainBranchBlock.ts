import { ChainBlock, effectiveHeight, type Block, type StructureChangeEvent } from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import { Point } from '$lib/engine/Point';

export abstract class ChainBranchBlock extends ChainBlock {
	public abstract get notch(): Point;

	public parent: ChainBlock | null;

	public update(metadata: Metadata): void {
		super.update(metadata);

		if (metadata.selectedEntity === this && metadata.mouse?.down && this.parent && metadata.mouse.button === MouseButton.LEFT) {
			const parent = this.parent;
			this.parent = null;
			parent.disown(this);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;

			const parent = metadata.snappingTo.block as ChainBranchBlock;
			parent.adopt(this);
			this.parent = parent;

			this.alignGroup.forEach(({ block }) => block?.drag(delta));
		}
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		if (metadata.snappingTo && metadata.mouse?.down) {
			const snapPos = metadata.snappingTo.nub.subtract(this.notch);

			this.renderEngine.stroke(this.shape.moveTo(snapPos));
		}
	}

	public adopt(other: Block, ...args: any): void {
		if (this.parent) this.parent.notifyAdoption({ child: this, block: other, chain: [this], delta: new Point(0, other.reduceChain(effectiveHeight, 0)) });
	}

	public disown(other: Block, ...args: any): void {
		if (this.parent && this.parent instanceof ChainBranchBlock)
			this.parent.notifyDisownment({ child: this, block: other, chain: [this], delta: new Point(0, -other.reduceChain(effectiveHeight, 0)) });
	}

	public notifyAdoption({ block, chain, delta }: StructureChangeEvent): void {
		if (this.parent) this.parent.notifyAdoption({ child: this, block, chain: [this, ...chain], delta });
	}

	public notifyDisownment({ block, chain, delta }: StructureChangeEvent): void {
		if (this.parent && this.parent instanceof ChainBranchBlock) this.parent.notifyDisownment({ child: this, block, chain: [this, ...chain], delta });
	}

	public delete(): void {
		super.delete();

		if (this.parent) {
			const parent = this.parent;
			this.parent = null;
			parent.disown(this);
		}
	}

	public snap(other: Block): Point | null {
		if (!(other instanceof ChainBlock)) return null;

		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}

	public traverseChainUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.parent !== null) this.parent.traverseChainUp(cb);
	}

	public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.parent !== null ? this.parent.reduceChainUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}
}


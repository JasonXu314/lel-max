import type { LexicalScope } from '$lib/compiler';
import { Block, type ExprCompileResult, Predicate, Slot, Value } from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';

export abstract class SlottableBlock<T extends Predicate | Value> extends Block {
	public abstract host: Block | null;

	public update(metadata: Metadata): void {
		super.update(metadata);

		if (metadata.selectedEntity === this && metadata.mouse?.down && this.host && metadata.mouse.button === MouseButton.LEFT) {
			const host = this.host;
			this.host = null;
			host.disown(this);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const block = metadata.snappingTo.block,
				newPos = metadata.snappingTo.nub,
				delta = newPos.subtract(this.position),
				slot = this.snapSlot(block)!;

			this.position = newPos;

			this.host = block;
			this.host.adopt(this, slot);

			this.alignGroup.forEach((child) => child.block?.drag(delta));
		}

		this.alignGroup.forEach(({ block, position }) => {
			if (block && block.position.distanceTo(position) > 0.5) {
				block.drag(position.subtract(block.position));
			}
		});
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		if (metadata.snappingTo && metadata.mouse?.down) {
			this.renderEngine.stroke(this.shape.moveTo(metadata.snappingTo.nub));
		}
	}

	public snap(other: Block): Point | null {
		return this.snapSlot(other)?.position ?? null;
	}

	public snapSlot(other: Block): Slot<T> | null {
		const dist = Math.sqrt(this.width ** 2 + this.width ** 2) / 2;

		return this.getSlots(other).find((slot) => this.position.distanceTo(slot.position) < dist) ?? null;
	}

	public abstract getSlots(other: Block): Slot<T>[];

	public abstract compile(scope: LexicalScope): ExprCompileResult;
}


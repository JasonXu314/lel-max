import { Entity, type Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import type { Point } from '$lib/engine/Point';
import type { PredicateHost } from './blocks/classes/hosts/PredicateHost';
import type { ValueHost } from './blocks/classes/hosts/ValueHost';
import { COLORS, type BlockClass } from './blocks/colors/colors';
import { EMPTY_PREDICATE, EMPTY_VALUE } from './blocks/values/utils';

export abstract class Block extends Entity {
	public abstract get width(): number;
	public abstract get height(): number;

	public abstract get dragGroup(): Block[];

	public abstract readonly type: BlockClass;
	public abstract readonly shape: ResolvedPath;

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);

		this.renderEngine.fill(shape, COLORS[this.type].LIGHT);
		this.renderEngine.stroke(shape, true, 0.5, COLORS.SPECIAL.OUTLINE);

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape, true, 4, COLORS.SPECIAL.HIGHLIGHT);
		}

		if (hasPredicate(this)) {
			this.predicateSlots.forEach((slot) => {
				if (slot.value === null) {
					this.renderEngine.fill(EMPTY_PREDICATE.move(slot.position), COLORS[this.type].DARK);
				}
			});
		}

		if (hasValue(this)) {
			this.valueSlots.forEach((slot) => {
				if (slot.value === null) {
					this.renderEngine.fill(EMPTY_VALUE.move(slot.position), COLORS[this.type].DARK);
				}
			});
		}
	}

	public adopt(other: Block, ...args: any): void {}
	public disown(other: Block, ...args: any): void {}

	public drag(delta: Point): void {
		this.position = this.position.add(delta);

		this.dragGroup.forEach((child) => child.drag(delta));
	}

	public abstract snap(other: Block): Point | null;

	public delete(): void {
		this.engine.remove(this);
	}

	public abstract traverse(cb: (block: Block) => void): void;
	public abstract reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;

	public abstract traverseUp(cb: (block: Block) => void): void;
	public abstract reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}
}

// need local copies to prevent circular dependencies
function hasPredicate(any: any): any is PredicateHost {
	return any instanceof Block && 'predicateSlots' in any;
}

function hasValue(any: any): any is ValueHost {
	return any instanceof Block && 'valueSlots' in any;
}


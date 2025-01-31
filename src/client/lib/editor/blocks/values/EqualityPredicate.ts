import type { Block } from '$lib/editor/Block';
import { MouseButton } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { PredicateHost } from '../classes/hosts/PredicateHost';
import type { IValueHost } from '../classes/hosts/ValueHost';
import { Predicate } from '../classes/Predicate';
import { Slot } from '../classes/Slot';
import { Value } from '../classes/Value';
import { EMPTY_VALUE } from './utils';

export class EqualityPredicate extends Predicate implements IValueHost {
	public left: Slot<Value>;
	public right: Slot<Value>;

	public constructor() {
		super();

		this.left = new Slot(this, (width) => new Point(-this.width / 2 + width / 2 + 5, 0));
		this.right = new Slot(this, (width) => new Point(this.width / 2 - width / 2 - 5, 0));

		this.host = null;
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}

	public get width(): number {
		return 5 + this.left.width + 15 + this.right.width + 5;
	}

	public get height(): number {
		return 2 * 2 + Math.max(this.left.height, this.right.height);
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this.host) {
				this.host.disown(this);
				this.host = null;
			}

			this.left.drag(metadata.mouse.delta);
			this.right.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const block = metadata.snappingTo.block as PredicateHost,
				newPos = metadata.snappingTo.nub,
				delta = newPos.subtract(this.position),
				slot = this.snapSlot(block)!;

			this.position = newPos;

			this.host = block;
			this.host.adopt(this, slot);

			this.left.drag(delta);
			this.right.drag(delta);
		}
	}

	public render(metadata: Metadata): void {
		const shape = this._shape();

		if (metadata.snappingTo && metadata.mouse?.down) {
			this.renderEngine.stroke(shape.move(metadata.snappingTo.nub));
		}

		this.renderEngine.fill(shape.move(this.position), '#59C059');
		this.renderEngine.stroke(shape.move(this.position), true, 0.5, 'black');

		this.renderEngine.text(
			Point.midpoint(this.left.position.add(new Point(this.left.width / 2, 0)), this.right.position.add(new Point(-this.right.width / 2, 0))),
			'=',
			{ color: 'white' },
			shape
		);

		if (this.left.value === null) this.renderEngine.fill(EMPTY_VALUE.move(this.valueSlots[0].position), '#3A993A');
		if (this.right.value === null) this.renderEngine.fill(EMPTY_VALUE.move(this.valueSlots[1].position), '#3A993A');

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape.move(this.position), true, 4, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public selectedBy(point: Point): boolean {
		const shape = this._shape();

		return this.renderEngine.pathContains(shape.move(this.position), point);
	}

	public adopt(other: Block, slot: Slot<Value>): void {
		if (other instanceof Value) {
			if (slot.value) {
				slot.value.drag(new Point(0, -other.height + 20));
				slot.value.host = null;
				this.disown(slot.value);
			}

			if (this.host) {
				this.host.notifyAdoption({ child: this, block: other, chain: [this, other] });

				slot.value = other;
				other.position = slot.position;
				other.host = this;

				const otherSlot = slot === this.left ? this.right : this.left;

				if (otherSlot.value) {
					otherSlot.value.drag(new Point(((slot === this.left ? 1 : -1) * (other.width - EMPTY_VALUE.width)) / 2, 0));
				}
			} else {
				const direction = new Point(slot === this.left ? -1 : 1, 0);

				const delta = direction.times(other.width - EMPTY_VALUE.width);

				slot.value = other;

				this.position = this.position.add(delta.times(0.5));
				slot.drag(delta);

				other.position = slot.position;
				other.host = this;
			}
		}
	}

	public disown(other: Block): void {
		if (other instanceof Value) {
			const slot = this.left.value === other ? this.left : this.right;

			if (this.host) {
				this.host.notifyDisownment({ child: this, block: other, chain: [this, other] });

				const otherSlot = slot === this.left ? this.right : this.left;

				if (otherSlot.value) {
					otherSlot.value.drag(new Point(((slot === this.left ? -1 : 1) * (other.width - EMPTY_VALUE.width)) / 2, 0));
				}
			} else {
				const direction = new Point(slot === this.left ? 1 : -1, 0);

				const delta = direction.times((other.width - EMPTY_VALUE.width) / 2);

				this.position = this.position.add(delta);
			}

			slot.value = null;
			other.host = null;
		}
	}

	public notifyAdoption({ block, chain }: { child: Value; block: Block; chain: Block[] }): void {
		if (this.host) this.host.notifyAdoption({ child: this, block, chain: [this, ...chain] });
	}

	public notifyDisownment({ block, chain }: { child: Value; block: Block; chain: Block[] }): void {
		if (this.host) this.host.notifyDisownment({ child: this, block, chain: [this, ...chain] });
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		this.left.value.traverse(cb);
		this.right.value.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.left.value !== null
				? this.left.value.reduce(cb, this.right.value !== null ? this.right.value.reduce(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public drag(delta: Point): void {
		super.drag(delta);

		this.left.drag(delta);
		this.right.drag(delta);
	}

	private _shape(): MovablePath {
		const width = this.width,
			height = this.height,
			angleInset = (height / 2) * (5 / 7);

		return new PathBuilder(width, height)
			.begin(new Point(0, height / 2))
			.line(new Point(width / 2 - angleInset, 0))
			.line(new Point(angleInset, -height / 2))
			.line(new Point(-angleInset, -height / 2))
			.line(new Point(-width + 2 * angleInset, 0))
			.line(new Point(-angleInset, height / 2))
			.line(new Point(angleInset, height / 2))
			.build();
	}
}


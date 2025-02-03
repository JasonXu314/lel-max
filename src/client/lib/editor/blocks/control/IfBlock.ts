import { Block } from '$lib/editor/Block';
import { MouseButton } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { ChainBranchBlock } from '../classes/ChainBranchBlock';
import type { IPredicateHost } from '../classes/hosts/PredicateHost';
import { Predicate } from '../classes/Predicate';
import { Slot } from '../classes/Slot';
import { effectiveHeight } from '../utils';
import { EMPTY_PREDICATE } from '../values/utils';

interface IFBlockShapeParams {
	width: number;
	height: number;
	condHeight: number;
}

export class IfBlock extends ChainBranchBlock implements IPredicateHost {
	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath<IFBlockShapeParams>;

	public condition: Slot<Predicate>;
	public affChild: ChainBranchBlock | null;
	public negChild: ChainBranchBlock | null;

	public constructor() {
		super();

		this.condition = null;
		this.affChild = null;
		this.negChild = null;
		this.parent = null;

		this.condition = new Slot(this, (width, height) => new Point(-this.width / 2 + 20 + width / 2, this.height / 2 - (height / 2 + 3)));

		this.shape = new PathBuilder<IFBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height, condHeight }) => new Point(width / 2, height / 2 - (condHeight + 6)))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width, height, condHeight }) => new Point(-width / 2 + 20, height / 2 - (condHeight + 6)), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20, -height / 2 + 20), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(Math.min(width / 2, 25), -height / 2 + 20))
			.lineToCorner(({ width, height }) => new Point(Math.min(width / 2, 25), -height / 2))
			.nubAt(() => this.nubs[1])
			.lineToCorner(({ width, height }) => new Point(-width / 2, -height / 2))
			.lineToCorner(({ width, height }) => new Point(-width / 2, height / 2))
			.notchAt(() => this.notch)
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					},
					get height() {
						return that.height;
					},
					get condHeight() {
						return that.condition.height;
					}
				}))(this)
			);
	}

	public get notch(): Point | null {
		return new Point(-this.width / 2 + 15, this.height / 2);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 20 + 15, this.height / 2 - (this.condition.height + 6)), new Point(-this.width / 2 + 15, -this.height / 2)];
	}

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.condition];
	}

	public get width(): number {
		if (this.condition.value !== null) {
			return 20 + this.condition.width + 5;
		} else {
			return 20 + EMPTY_PREDICATE.width + 5;
		}
	}

	public get height(): number {
		// NOTE: reduce(effectiveHeight, 0) + 20 is different from reduce(effectiveHeight, 20) because it's required to
		// signal that this is the root of the chain to measure
		return 20 + this.condition.height + 6 + (this.affChild === null ? 20 : this.affChild.reduce<number>(effectiveHeight, 0) + 20);
	}

	public get dragGroup(): Block[] {
		return [this.condition.value, this.affChild, this.negChild].filter((block) => !!block);
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this.parent) {
				const parent = this.parent;
				this.parent = null;
				parent.disown(this);
			}

			this.condition.drag(metadata.mouse.delta);

			if (this.affChild) this.affChild.drag(metadata.mouse.delta);
			if (this.negChild) this.negChild.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;

			const parent = metadata.snappingTo.block as ChainBranchBlock;
			parent.adopt(this);
			this.parent = parent;

			this.condition.drag(delta);

			if (this.affChild) this.affChild.drag(delta);
			if (this.negChild) this.negChild.drag(delta);
		}

		if (this.condition.value && this.condition.value.position.distanceTo(this.condition.position) > 0.5) {
			this.condition.drag(this.condition.position.subtract(this.condition.value.position));
		}

		if (this.affChild) {
			const affNub = this.position.add(this.nubs[0]),
				childNotch = this.affChild.position.add(this.affChild.notch);

			if (childNotch.distanceTo(affNub) > 0.5) {
				this.affChild.drag(affNub.subtract(childNotch));
			}
		}

		if (this.negChild) {
			const negNub = this.position.add(this.nubs[1]),
				childNotch = this.negChild.position.add(this.negChild.notch);

			if (childNotch.distanceTo(negNub) > 0.5) {
				this.negChild.drag(negNub.subtract(childNotch));
			}
		}
	}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);
		super.render(metadata);

		this.renderEngine.text(this.position.add(new Point(0, this.height / 2 - 10)), 'If', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(this.position, '➡️', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(this.position.add(new Point(0, -this.height / 2 + 10)), 'Else', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
	}

	public adopt(other: ChainBranchBlock, slot: undefined): void;
	public adopt(other: Predicate, slot: Slot<Predicate>): void;
	public adopt(other: Block, slot?: Slot<Predicate>): void {
		if (other instanceof ChainBranchBlock) {
			const nub = other.snap(this)!;

			if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
				if (this.affChild) {
					this.affChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
					this.affChild.parent = null;
					this.disown(this.affChild);
				}

				this.affChild = other;
			} else {
				if (this.negChild) {
					this.negChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
					this.negChild.parent = null;
					this.disown(this.negChild);
				}

				this.negChild = other;
			}
		} else if (other instanceof Predicate) {
			if (this.condition.value) {
				this.condition.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
				this.condition.value.host = null;
				this.disown(this.condition.value);
			}

			slot.value = other;
		}

		super.adopt(other);
	}

	public disown(other: Block): void {
		if (this.affChild === other) {
			this.affChild = null;
		} else if (this.negChild === other) {
			this.negChild = null;
		} else if (this.condition.value === other) {
			this.condition.value = null;
		} else {
			console.error(other);
			throw new Error('If block disowning non-child');
		}

		super.disown(other);
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.affChild !== null) this.affChild.traverse(cb);
		if (this.negChild !== null) this.negChild.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.negChild !== null ? this.negChild.reduce(cb, this.affChild !== null ? this.affChild.reduce(cb, thisResult) : thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}
}


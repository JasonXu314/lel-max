import {
	Block,
	ChainBranchBlock,
	effectiveHeight,
	EMPTY_PREDICATE,
	hasIfBlock,
	Predicate,
	Slot,
	type BlockCompileResult,
	type CompileResult,
	type Connection,
	type IPredicateHost,
	type StructureChangeEvent
} from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { lns } from '$lib/utils/utils';

interface IfBlockShapeParams {
	width: number;
	height: number;
	condHeight: number;
}

export class IfBlock extends ChainBranchBlock implements IPredicateHost {
	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath<IfBlockShapeParams>;

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

		this.shape = new PathBuilder<IfBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height, condHeight }) => new Point(width / 2, height / 2 - (condHeight + 6)))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width, height, condHeight }) => new Point(-width / 2 + 20, height / 2 - (condHeight + 6)), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20, -height / 2 + 20), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2 + 20))
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2))
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

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			this.condition,
			{
				block: this.affChild,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			},
			{
				block: this.negChild,
				get position() {
					return that.position.add(that.nubs[1]);
				}
			}
		];
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
		this.ensureAlignment((reval) => {
			if (other instanceof ChainBranchBlock) {
				const nub = other.snap(this)!;

				if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
					if (this.affChild) {
						this.affChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
						this.affChild.parent = null;
						this.disown(this.affChild);
						reval();
					}

					this.affChild = other;
				} else {
					if (this.negChild) {
						this.negChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
						this.negChild.parent = null;
						this.disown(this.negChild);
						reval();
					}

					this.negChild = other;
				}

				super.adopt(other);
			} else if (other instanceof Predicate) {
				if (this.condition.value) {
					this.condition.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
					this.condition.value.host = null;
					this.disown(this.condition.value);
					reval();
				}

				slot.value = other;

				if (this.parent)
					this.parent.notifyAdoption({ child: this, block: other, chain: [this], delta: new Point(0, other.height - EMPTY_PREDICATE.height) });

				this.engine.enforceHierarchy(this, other);
			}
		});
	}

	public disown(other: Block): void {
		this.ensureAlignment(() => {
			if (this.affChild === other) {
				this.affChild = null;

				super.disown(other);
			} else if (this.negChild === other) {
				this.negChild = null;

				super.disown(other);
			} else if (this.condition.value === other) {
				this.condition.value = null;

				if (this.parent)
					this.parent.notifyDisownment({ child: this, block: other, chain: [this], delta: new Point(0, EMPTY_PREDICATE.height - other.height) });
			} else {
				console.error(other);
				throw new Error('If block disowning non-child');
			}
		});
	}

	public notifyAdoption(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceUp(hasIfBlock, false)) {
			if (child === this.affChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyAdoption(evt);
	}

	public notifyDisownment(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceUp(hasIfBlock, false)) {
			if (child === this.affChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyDisownment(evt);
	}

	public encapsulates(block: Block): boolean {
		return block === this.affChild;
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

	public compile(): BlockCompileResult {
		if (this.condition.value === null) throw new Error('If statement without condition');

		const condition = this.condition.value.compile();
		const affResult: CompileResult = this.affChild !== null ? this.affChild.compile() : { lines: [], meta: { requires: [] } };
		const negResult: CompileResult = this.negChild !== null ? this.negChild.compile() : { lines: [], meta: { requires: [] } };

		return {
			lines: lns([`if (${condition.code}) {`, affResult.lines, '}', ...negResult.lines]),
			meta: { requires: condition.meta.requires.concat(affResult.meta.requires, negResult.meta.requires) }
		};
	}
}


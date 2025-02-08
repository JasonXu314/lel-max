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

interface WhileBlockShapeParams {
	width: number;
	height: number;
	condHeight: number;
}

export class WhileBlock extends ChainBranchBlock implements IPredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20 * 3;

	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath<WhileBlockShapeParams>;

	public condition: Slot<Predicate>;
	public loopChild: ChainBranchBlock | null;
	public afterChild: ChainBranchBlock | null;

	public constructor() {
		super();

		this.condition = null;
		this.loopChild = null;
		this.afterChild = null;
		this.parent = null;

		this.condition = new Slot(this, (width, height) => new Point(-this.width / 2 + 35 + width / 2, this.height / 2 - (height / 2 + 3)));

		this.shape = new PathBuilder<WhileBlockShapeParams>(
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
			return 35 + this.condition.width + 5;
		} else {
			return 35 + EMPTY_PREDICATE.width + 5;
		}
	}

	public get height(): number {
		// NOTE: reduce(effectiveHeight, 0) + 20 is different from reduce(effectiveHeight, 20) because it's required to
		// signal that this is the root of the chain to measure
		return 20 + this.condition.height + 6 + (this.loopChild === null ? 20 : this.loopChild.reduce<number>(effectiveHeight, 0) + 20);
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			this.condition,
			{
				block: this.loopChild,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			},
			{
				block: this.afterChild,
				get position() {
					return that.position.add(that.nubs[1]);
				}
			}
		];
	}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);
		super.render(metadata);

		this.renderEngine.text(this.position.add(new Point(0, this.height / 2 - 10)), 'While', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(this.position, '➡️', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
	}

	public adopt(other: ChainBranchBlock, slot: undefined): void;
	public adopt(other: Predicate, slot: Slot<Predicate>): void;
	public adopt(other: Block, slot?: Slot<Predicate>): void {
		this.ensureAlignment((reval) => {
			if (other instanceof ChainBranchBlock) {
				const nub = other.snap(this)!;

				if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
					if (this.loopChild) {
						this.loopChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
						this.loopChild.parent = null;
						this.disown(this.loopChild);
						reval();
					}

					this.loopChild = other;
				} else {
					if (this.afterChild) {
						this.afterChild.drag(new Point(0, -(other.reduce(effectiveHeight, 0) + 20)));
						this.afterChild.parent = null;
						this.disown(this.afterChild);
						reval();
					}

					this.afterChild = other;
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
			if (this.loopChild === other) {
				this.loopChild = null;

				super.disown(other);
			} else if (this.afterChild === other) {
				this.afterChild = null;

				super.disown(other);
			} else if (this.condition.value === other) {
				this.condition.value = null;

				if (this.parent)
					this.parent.notifyAdoption({ child: this, block: other, chain: [this], delta: new Point(0, EMPTY_PREDICATE.height - other.height) });
			} else {
				console.error(other);
				throw new Error('If block disowning non-child');
			}
		});
	}

	public notifyAdoption(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceUp(hasIfBlock, false)) {
			if (child === this.loopChild) {
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
			if (child === this.loopChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyDisownment(evt);
	}

	public encapsulates(block: Block): boolean {
		return block === this.loopChild;
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.loopChild !== null) this.loopChild.traverse(cb);
		if (this.afterChild !== null) this.afterChild.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.afterChild !== null
				? this.afterChild.reduce(cb, this.loopChild !== null ? this.loopChild.reduce(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(): BlockCompileResult {
		if (this.condition.value === null) throw new Error('If statement without condition');

		const condition = this.condition.value.compile();
		const loopResult: CompileResult = this.loopChild !== null ? this.loopChild.compile() : { lines: [], meta: { requires: [] } };
		const afterResult: CompileResult = this.afterChild !== null ? this.afterChild.compile() : { lines: [], meta: { requires: [] } };

		return {
			lines: lns([`while (${condition.code}) {`, loopResult.lines, '}', ...afterResult.lines]),
			meta: { requires: condition.meta.requires.concat(loopResult.meta.requires, afterResult.meta.requires) }
		};
	}
}


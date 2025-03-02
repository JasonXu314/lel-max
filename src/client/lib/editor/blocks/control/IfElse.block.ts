import { LexicalScope, union } from '$lib/compiler';
import {
	Block,
	ChainBranchBlock,
	effectiveHeight,
	EMPTY_PREDICATE,
	findDelta,
	hasIfBlock,
	Predicate,
	Slot,
	type BlockCompileResult,
	type Connection,
	type IPredicateHost,
	type StructureChangeEvent
} from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { lns, mergeChecks, mergeLayers } from '$lib/utils/utils';

interface IfElseBlockShapeParams {
	width: number;
	height: number;
	affHeight: number;
	condHeight: number;
}

export class IfElseBlock extends ChainBranchBlock implements IPredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20 * 5;

	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath<IfElseBlockShapeParams>;

	public condition: Slot<Predicate>;
	public affChild: ChainBranchBlock | null;
	public negChild: ChainBranchBlock | null;
	public afterChild: ChainBranchBlock | null;

	public constructor() {
		super();

		this.condition = null;
		this.affChild = null;
		this.negChild = null;
		this.afterChild = null;
		this.parent = null;

		this.condition = new Slot(this, (width, height) => new Point(-this.width / 2 + 20 + width / 2, this.height / 2 - (height / 2 + 3)));

		this.shape = new PathBuilder<IfElseBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height, condHeight }) => new Point(width / 2, height / 2 - (condHeight + 6)))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width, height, condHeight }) => new Point(-width / 2 + 20, height / 2 - (condHeight + 6)), -Math.PI / 2)
			.lineToCorner(
				({ width, height, condHeight, affHeight }) => new Point(-width / 2 + 20, height / 2 - (condHeight + 6) - (affHeight + 20)),
				-Math.PI / 2
			)
			.lineToCorner(
				({ width, height, condHeight, affHeight }) =>
					new Point(-width / 2 + 20 + Math.min(width / 2, 35), height / 2 - (condHeight + 6) - (affHeight + 20))
			)
			.lineToCorner(
				({ width, height, condHeight, affHeight }) =>
					new Point(-width / 2 + 20 + Math.min(width / 2, 35), height / 2 - (condHeight + 6) - (affHeight + 20) - 20)
			)
			.nubAt(() => this.nubs[1])
			.lineToCorner(
				({ width, height, condHeight, affHeight }) => new Point(-width / 2 + 20, height / 2 - (condHeight + 6) - (affHeight + 20) - 20),
				-Math.PI / 2
			)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20, -height / 2 + 20), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2 + 20))
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2))
			.nubAt(() => this.nubs[2])
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
					get affHeight() {
						return that.affChild?.reduceChain(effectiveHeight, 0) ?? 0;
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
		return [
			new Point(-this.width / 2 + 20 + 15, this.height / 2 - (this.condition.height + 6)),
			new Point(-this.width / 2 + 20 + 15, this.height / 2 - (this.condition.height + 6) - (this.affChild?.reduceChain(effectiveHeight, 0) ?? 0) - 40),
			new Point(-this.width / 2 + 15, -this.height / 2)
		];
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
		return (
			20 +
			this.condition.height +
			6 +
			(this.affChild === null ? 20 : this.affChild.reduceChain<number>(effectiveHeight, 0) + 20) +
			20 +
			(this.negChild === null ? 20 : this.negChild.reduceChain<number>(effectiveHeight, 0) + 20)
		);
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
			},
			{
				block: this.afterChild,
				get position() {
					return that.position.add(that.nubs[2]);
				}
			}
		];
	}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);
		super.render(metadata);

		const topTine = this.position.add(new Point(0, this.height / 2 - 10)),
			middleTine = this.position.add(
				new Point(0, this.height / 2 - (this.condition.height + 6) - (this.affChild?.reduceChain(effectiveHeight, 0) ?? 0) - 30)
			),
			bottomTine = this.position.add(new Point(0, -this.height / 2 + 10));

		this.renderEngine.text(topTine, 'If', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(Point.midpoint(topTine, middleTine), '➡️', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(middleTine, 'Else', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(Point.midpoint(middleTine, bottomTine), '➡️', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
		this.renderEngine.text(bottomTine, 'Then', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
	}

	public adopt(other: ChainBranchBlock, slot: undefined): void;
	public adopt(other: Predicate, slot: Slot<Predicate>): void;
	public adopt(other: Block, slot?: Slot<Predicate>): void {
		this.ensureAlignment((reval) => {
			if (other instanceof ChainBranchBlock) {
				const nub = other.snap(this)!;

				if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
					const affChild = this.affChild;

					if (affChild) {
						affChild.parent = null;
						this.disown(affChild);
						reval();
					}

					this.affChild = other;
					if (affChild) affChild.drag(findDelta(this, affChild));
				} else if (nub.distanceTo(this.position.add(this.nubs[1])) < 20) {
					const negChild = this.negChild;

					if (negChild) {
						negChild.parent = null;
						this.disown(negChild);
						reval();
					}

					this.negChild = other;
					if (negChild) negChild.drag(findDelta(this, negChild));
				} else {
					const afterChild = this.afterChild;

					if (afterChild) {
						afterChild.parent = null;
						this.disown(afterChild);
						reval();
					}

					this.afterChild = other;
					if (afterChild) afterChild.drag(findDelta(this, afterChild));
				}

				super.adopt(other);
			} else if (other instanceof Predicate) {
				const condition = this.condition.value;

				if (condition) {
					this.disown(condition);
					reval();
				}

				slot.value = other;
				if (condition) condition.drag(findDelta(this, condition));

				if (this.parent)
					this.parent.notifyAdoption({ child: this, block: other, chain: [this], delta: new Point(0, other.height - EMPTY_PREDICATE.height) });
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

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
			if (child === this.affChild || child === this.negChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyAdoption(evt);
	}

	public notifyDisownment(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
			if (child === this.affChild || child === this.negChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyDisownment(evt);
	}

	public duplicate(): Block[][] {
		const condDupe = this.condition.value?.duplicate() ?? [[]];
		const affChainDupe = this.affChild?.duplicateChain() ?? [[]];
		const negChainDupe = this.negChild?.duplicateChain() ?? [[]];

		const [[cond]] = condDupe as [[Predicate]],
			[[affChild]] = affChainDupe as [[ChainBranchBlock]],
			[[negChild]] = negChainDupe as [[ChainBranchBlock]];

		const [[that]] = super.duplicate() as [[IfElseBlock]];

		that.condition.value = cond ?? null;
		if (cond) cond.host = that;
		that.affChild = affChild ?? null;
		if (affChild) affChild.parent = that;
		that.negChild = negChild ?? null;
		if (negChild) negChild.parent = that;

		return mergeLayers<Block>([[that]], condDupe, affChainDupe, negChainDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.afterChild?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[IfElseBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.afterChild = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public encapsulates(block: Block): boolean {
		return block === this.affChild || block === this.negChild;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.affChild !== null) this.affChild.traverseChain(cb);
		if (this.negChild !== null) this.negChild.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.condition.value !== null) this.condition.value.traverseByLayer(cb, depth + 1);
		if (this.affChild !== null) this.affChild.traverseByLayer(cb, depth);
		if (this.negChild !== null) this.negChild.traverseByLayer(cb, depth);
		if (this.afterChild !== null) this.afterChild.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.afterChild
				? this.afterChild.reduceChain(
						cb,
						this.negChild !== null
							? this.negChild.reduceChain(cb, this.affChild !== null ? this.affChild.reduceChain(cb, thisResult) : thisResult)
							: thisResult
				  )
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): BlockCompileResult {
		if (this.condition.value === null) throw new Error('If statement without condition');

		const condition = this.condition.value.compile(scope);
		const affResult = this.affChild !== null ? this.affChild.compile(scope) : { lines: [], meta: { requires: [] } };
		const negResult = this.negChild !== null ? this.negChild.compile(scope) : { lines: [], meta: { requires: [] } };
		const afterResult = this.afterChild !== null ? this.afterChild.compile(scope) : { lines: [], meta: { requires: [] } };

		return mergeChecks(
			{
				lines: lns([`if (${condition.code}) {`, affResult.lines, '} else {', negResult.lines, '}', ...afterResult.lines]),
				meta: {
					requires: union<string>(condition.meta.requires, affResult.meta.requires, negResult.meta.requires, afterResult.meta.requires),
					precedence: null,
					checks: condition.meta.checks,
					attributes: { lvalue: false, resolvedType: null }
				}
			},
			condition
		);
	}
}


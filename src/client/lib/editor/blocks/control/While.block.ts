import { union, type LexicalScope } from '$lib/compiler';
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
		return 20 + this.condition.height + 6 + (this.loopChild === null ? 20 : this.loopChild.reduceChain<number>(effectiveHeight, 0) + 20);
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
					const loopChild = this.loopChild;

					if (loopChild) {
						loopChild.parent = null;
						this.disown(loopChild);
						reval();
					}

					this.loopChild = other;
					if (loopChild) loopChild.drag(findDelta(this, loopChild));
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

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
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

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
			if (child === this.loopChild) {
				this.drag(new Point(0, -delta.y / 2));
			} else if (child === this.condition.value) {
				this.drag(delta.invert('y').times(0.5));
			}
		}

		super.notifyDisownment(evt);
	}

	public duplicate(): Block[][] {
		const condDupe = this.condition.value?.duplicate() ?? [[]];
		const loopChainDupe = this.loopChild?.duplicateChain() ?? [[]];

		const [[cond]] = condDupe as [[Predicate]],
			[[loopChild]] = loopChainDupe as [[ChainBranchBlock]];

		const [[that]] = super.duplicate() as [[WhileBlock]];

		that.condition.value = cond ?? null;
		if (cond) cond.host = that;
		that.loopChild = loopChild ?? null;
		if (loopChild) loopChild.parent = that;

		return mergeLayers<Block>([[that]], condDupe, loopChainDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.afterChild?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[WhileBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.afterChild = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public encapsulates(block: Block): boolean {
		return block === this.loopChild;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.loopChild !== null) this.loopChild.traverseChain(cb);
		if (this.afterChild !== null) this.afterChild.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.condition.value !== null) this.condition.value.traverseByLayer(cb, depth + 1);
		if (this.loopChild !== null) this.loopChild.traverseByLayer(cb, depth);
		if (this.afterChild !== null) this.afterChild.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.afterChild !== null
				? this.afterChild.reduceChain(cb, this.loopChild !== null ? this.loopChild.reduceChain(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): BlockCompileResult {
		if (this.condition.value === null) throw new Error('If statement without condition');

		const condition = this.condition.value.compile(scope);
		const loopResult = this.loopChild !== null ? this.loopChild.compile(scope) : { lines: [], meta: { requires: [] } };
		const afterResult = this.afterChild !== null ? this.afterChild.compile(scope) : { lines: [], meta: { requires: [] } };

		return mergeChecks(
			{
				lines: lns([
					`while (${condition.code}) {`,
					loopResult.lines,
					condition.meta.checks.flatMap((check) => check.lines),
					'}',
					...afterResult.lines
				]),
				meta: {
					requires: union(condition.meta.requires, loopResult.meta.requires, afterResult.meta.requires),
					precedence: null,
					checks: condition.meta.checks,
					attributes: { lvalue: false, resolvedType: null }
				}
			},
			condition
		);
	}
}


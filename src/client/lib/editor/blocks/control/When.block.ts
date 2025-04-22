import { EMPTY_BLOCK_RESULT, LexicalScope, union } from '$lib/compiler';
import {
	Block,
	ChainBlock,
	ChainBranchBlock,
	EMPTY_PREDICATE,
	findDelta,
	InterruptPredicate,
	Predicate,
	Slot,
	type BlockCompileResult,
	type Connection,
	type PredicateHost
} from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { lns, mergeChecks, mergeLayers } from '$lib/utils/utils';

interface WhenBlockShapeParams {
	width: number;
	height: number;
}

const RUN_WHEN_WIDTH = 47.6845703125,
	RUN_WHENEVER_WIDTH = 67.369140625;

export class WhenBlock extends ChainBlock implements PredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath;

	public condition: Slot<Predicate>;
	public child: Block | null;

	public times: number;

	public constructor() {
		super();

		this.condition = new Slot(
			this,
			(width) => new Point(-this.width / 2 + 5 + (this.times !== 1 ? RUN_WHENEVER_WIDTH : RUN_WHEN_WIDTH) + 5 + width / 2, 0),
			Predicate
		);
		this.child = null;

		this.times = 1;

		this.shape = new PathBuilder<WhenBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, -height / 2))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width, height }) => new Point(-width / 2, -height / 2))
			.lineToCorner(({ width, height }) => new Point(-width / 2, height / 2))
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					},
					get height() {
						return that.height;
					}
				}))(this)
			);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 15, -this.height / 2)];
	}

	public get width(): number {
		if (this.condition.value !== null) {
			return (
				5 +
				(this.times !== 1 ? RUN_WHENEVER_WIDTH : RUN_WHEN_WIDTH) +
				5 +
				this.condition.width +
				(this.times !== Infinity && this.times !== 1 ? 5 + this.renderEngine.measureWidth(`(up to ${this.times} times)`) : 0) +
				5
			);
		} else {
			return (
				5 +
				(this.times !== 1 ? RUN_WHENEVER_WIDTH : RUN_WHEN_WIDTH) +
				5 +
				EMPTY_PREDICATE.width +
				(this.times !== Infinity && this.times !== 1 ? 5 + this.renderEngine.measureWidth(`(up to ${this.times} times)`) : 0) +
				5
			);
		}
	}

	public get height(): number {
		return this.condition.height + 6;
	}

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.condition];
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			this.condition,
			{
				block: this.child,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			}
		];
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		if (this.times === Infinity) {
			this.renderEngine.text(this.position, 'Run Whenever', { align: 'left', paddingLeft: 5, color: 'white' }, this.shape);
		} else {
			if (this.times === 1) {
				this.renderEngine.text(this.position, 'Run When', { align: 'left', paddingLeft: 5, color: 'white' }, this.shape);
			} else {
				this.renderEngine.text(this.position, 'Run Whenever', { align: 'left', paddingLeft: 5, color: 'white' }, this.shape);
				this.renderEngine.text(this.position, `(up to ${this.times} times)`, { align: 'right', paddingRight: 5, color: 'white' }, this.shape);
			}
		}
	}

	public adopt(other: ChainBranchBlock, slot: undefined): void;
	public adopt(other: Predicate, slot: Slot<Predicate>): void;
	public adopt(other: Block, slot?: Slot<Predicate>): void {
		this.ensureAlignment((reval) => {
			if (other instanceof ChainBranchBlock) {
				const child = this.child;

				if (child && child instanceof ChainBranchBlock) {
					child.parent = null;
					this.disown(child);
				}

				this.child = other;
				if (child) child.drag(findDelta(this, child));
			} else if (other instanceof Predicate) {
				const condition = this.condition.value;

				if (condition) {
					this.disown(condition);
					reval();
				}

				slot.value = other;
				if (condition) condition.drag(findDelta(this, condition));
			}
		});
	}

	public disown(other: Block): void {
		this.ensureAlignment(() => {
			if (this.child === other) {
				this.child = null;

				super.disown(other);
			} else if (this.condition.value === other) {
				this.condition.value.host = null;
				this.condition.value = null;
			} else {
				console.error(other);
				throw new Error('If block disowning non-child');
			}
		});
	}

	public duplicate(): Block[][] {
		const condDupe = this.condition.value?.duplicate() ?? [[]];
		const affChainDupe = this.child?.duplicateChain() ?? [[]];

		const [[cond]] = condDupe as [[Predicate]],
			[[child]] = affChainDupe as [[ChainBranchBlock]];

		const [[that]] = super.duplicate() as [[WhenBlock]];

		that.condition.value = cond ?? null;
		if (cond) cond.host = that;
		that.child = child ?? null;
		if (child) child.parent = that;

		return mergeLayers<Block>([[that]], condDupe, affChainDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.child?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[WhenBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.child = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.condition.value !== null) this.condition.value.traverseByLayer(cb, depth + 1);
		if (this.child !== null) this.child.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduceChain(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): BlockCompileResult {
		if (this.condition.value === null) throw new Error('When check without condition');

		const internalScope = new LexicalScope(scope);

		if (this.condition.value instanceof InterruptPredicate) {
			const result = this.child !== null ? this.child.compile(internalScope) : EMPTY_BLOCK_RESULT;

			return {
				lines: [
					...(this.times !== Infinity ? ['static int __isr_exec_ct = 0;', `if (__isr_exec_ct >= ${this.times}) return;`, '__isr_exec_ct++;'] : []),
					...('lines' in result ? result.lines : [result.code])
				],
				meta: {
					requires: result.meta.requires,
					precedence: null,
					checks: [],
					attributes: { lvalue: false, resolvedType: null },
					ISRs: [this.condition.value.name],
					parentISR: this.condition.value.name
				}
			};
		} else {
			const condition = this.condition.value.compile(internalScope);
			const result = this.child !== null ? this.child.compile(internalScope) : EMPTY_BLOCK_RESULT;

			return mergeChecks(
				{
					lines: lns([`if (${condition.code}) {`, 'lines' in result ? result.lines : [result.code], '}']),
					meta: {
						requires: union<string>(condition.meta.requires, result.meta.requires),
						precedence: null,
						checks: condition.meta.checks,
						attributes: { lvalue: false, resolvedType: null },
						ISRs: [],
						parentISR: 'tick'
					}
				},
				condition
			);
		}
	}
}


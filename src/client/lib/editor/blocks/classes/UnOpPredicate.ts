import { type LexicalScope, type OperatorPrecedence } from '$lib/compiler';
import {
	Block,
	EMPTY_VALUE,
	findDelta,
	Predicate,
	Slot,
	Value,
	type Connection,
	type ExprCompileResult,
	type IPredicateHost,
	type IValueHost,
	type StructureChangeEvent
} from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { DataType } from '$lib/utils/DataType';
import { mergeLayers, parenthesize } from '$lib/utils/utils';

interface UnOpPredicateShapeParams {
	height: number;
	width: number;
	angleInset: number;
}

export abstract class UnOpPredicate<O extends Value | Predicate> extends Predicate implements IValueHost, IPredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly shape: ResolvedPath;

	public abstract readonly displayOp: string;
	public abstract readonly codeOp: string;
	public abstract readonly precedence: OperatorPrecedence;

	public operand: Slot<O>;

	public constructor(public readonly OSlottable: abstract new () => O) {
		super();

		this.operand = new Slot<O>(
			this,
			(width) => new Point(-this.width / 2 + 8 + this.renderEngine.measureWidth(this.displayOp) + 3 + width / 2, 0),
			OSlottable
		);

		this.host = null;

		this.shape = new PathBuilder<UnOpPredicateShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.line(({ width, angleInset }) => new Point(width / 2 - angleInset, 0))
			.line(({ height, angleInset }) => new Point(angleInset, -height / 2))
			.line(({ height, angleInset }) => new Point(-angleInset, -height / 2))
			.line(({ width, angleInset }) => new Point(-width + 2 * angleInset, 0))
			.line(({ height, angleInset }) => new Point(-angleInset, height / 2))
			.line(({ height, angleInset }) => new Point(angleInset, height / 2))
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					},
					get height() {
						return that.height;
					},
					get angleInset() {
						return ((that.height / 2) * 5) / 7;
					}
				}))(this)
			);
	}

	public get valueSlots(): Slot<Value>[] {
		return [];
	}

	public get predicateSlots(): Slot<Predicate>[] {
		return [];
	}

	public get width(): number {
		return 8 + this.renderEngine.measureWidth(this.displayOp) + 3 + this.operand.width + 5;
	}

	public get height(): number {
		return 2 * 2 + this.operand.height;
	}

	public get alignGroup(): Connection[] {
		return [this.operand];
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, this.displayOp, { color: 'white', align: 'left', paddingLeft: 8 }, this.shape);
	}

	public adopt(other: Block, slot: Slot<Predicate>);
	public adopt(other: Block, slot: Slot<Value>);
	public adopt(other: Block, slot: Slot<Value | Predicate>): void {
		if (other instanceof Value) {
			const operand = slot.value;

			if (operand) {
				operand.host = null;
				this.disown(operand);
			}

			if (this.host) {
				this.host.notifyAdoption({
					child: this,
					block: other,
					chain: [this],
					delta: new Point(other.width - EMPTY_VALUE.width, other.height - EMPTY_VALUE.height)
				});
			}

			slot.value = other;
			if (operand) operand.drag(findDelta(this, operand));
		}
	}

	public disown(other: Block): void {
		if (other instanceof Value) {
			if (this.host) {
				this.host.notifyDisownment({
					child: this,
					block: other,
					chain: [this],
					delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
				});
			}

			this.operand.value = null;
			other.host = null;
		}
	}

	public notifyAdoption({ block, chain, delta }: StructureChangeEvent): void {
		if (this.host) this.host.notifyAdoption({ child: this, block, chain: [this, ...chain], delta });
	}

	public notifyDisownment({ block, chain, delta }: StructureChangeEvent): void {
		if (this.host) this.host.notifyDisownment({ child: this, block, chain: [this, ...chain], delta });
	}

	public delete(): void {
		if (this.operand.block) this.operand.block.delete();

		super.delete();
	}

	public duplicateChain(): Block[][] {
		const operandDupe = this.operand.value?.duplicate() ?? [[]];

		const [[operand]] = operandDupe as [[O]];

		const [[that]] = super.duplicate() as [[UnOpPredicate<O>]];

		that.operand.value = operand ?? null;
		if (operand) operand.host = that;

		return mergeLayers<Block>([[that]], operandDupe);
	}

	public encapsulates(block: Block): boolean {
		return block === this.operand.value;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		this.operand.value?.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		this.operand.value?.traverseByLayer(cb, depth + 1);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.operand.value !== null ? this.operand.value.reduceChain(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): ExprCompileResult {
		if (!this.operand.value) throw new Error(`Unaery operation operation '${this.displayOp}' missing operand`);

		const operandResult = this.operand.value.compile(scope);

		this.validateType(operandResult.meta.attributes.resolvedType);

		return {
			code: `${this.codeOp}${parenthesize(operandResult, this.precedence)}`,
			meta: {
				requires: operandResult.meta.requires,
				precedence: this.precedence,
				checks: operandResult.meta.checks,
				attributes: {
					lvalue: false,
					resolvedType: operandResult.meta.attributes.resolvedType
				}
			}
		};
	}

	public abstract validateType(type: DataType): void;
}


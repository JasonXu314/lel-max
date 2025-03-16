import { Associativity, OPERATOR_ASSOCIATIVITY, union, type LexicalScope, type OperatorPrecedence } from '$lib/compiler';
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
import { DataType } from '$lib/utils/DataType';
import { mergeLayers, parenthesize } from '$lib/utils/utils';

interface BinOpPredicateShapeParams {
	height: number;
	width: number;
	angleInset: number;
}

export abstract class BinOpPredicate<L extends Value | Predicate, R extends Value | Predicate = L> extends Predicate implements IValueHost, IPredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly shape: ResolvedPath;

	public abstract readonly displayOp: string;
	public abstract readonly codeOp: string;
	public abstract readonly precedence: OperatorPrecedence;

	public left: Slot<L>;
	public right: Slot<R>;

	public constructor(public readonly LSlottable: abstract new () => L, public readonly RSlottable: abstract new () => R) {
		super();

		this.left = new Slot<L>(this, (width) => new Point(-this.width / 2 + width / 2 + 5, 0), LSlottable);
		this.right = new Slot<R>(this, (width) => new Point(this.width / 2 - width / 2 - 5, 0), RSlottable);

		this.host = null;

		this.shape = new PathBuilder<BinOpPredicateShapeParams>(
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
		return 5 + this.left.width + 3 + this.renderEngine.measureWidth(this.displayOp) + 3 + this.right.width + 5;
	}

	public get height(): number {
		return 2 * 2 + Math.max(this.left.height, this.right.height);
	}

	public get alignGroup(): Connection[] {
		return [this.left, this.right];
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(
			Point.midpoint(this.left.position.add(new Point(this.left.width / 2, 0)), this.right.position.add(new Point(-this.right.width / 2, 0))),
			this.displayOp,
			{ color: 'white' }
		);
	}

	public adopt(other: Block, slot: Slot<Predicate>);
	public adopt(other: Block, slot: Slot<Value>);
	public adopt(other: Block, slot: Slot<Value | Predicate>): void {
		if (other instanceof slot.Slottable) {
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
			const slot = this.left.value === other ? this.left : this.right;

			if (this.host) {
				this.host.notifyDisownment({
					child: this,
					block: other,
					chain: [this],
					delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
				});
			}

			slot.value = null;
			other.host = null;
		}
	}

	public notifyAdoption({ block, chain, delta }: StructureChangeEvent): void {
		if (this.host) this.host.notifyAdoption({ child: this, block, chain: [this, ...chain], delta });
	}

	public notifyDisownment({ block, chain, delta }: StructureChangeEvent): void {
		if (this.host) this.host.notifyDisownment({ child: this, block, chain: [this, ...chain], delta });
	}

	public duplicate(): Block[][] {
		const leftDupe = this.left.value?.duplicate() ?? [[]],
			rightDupe = this.right.value?.duplicate() ?? [[]];

		const [[left]] = leftDupe as [[L]],
			[[right]] = rightDupe as [[L]];

		const [[that]] = super.duplicate() as [[BinOpPredicate<L>]];

		that.left.value = left ?? null;
		if (left) left.host = that;
		that.right.value = right ?? null;
		if (right) right.host = that;

		return mergeLayers<Block>([[that]], leftDupe, rightDupe);
	}

	public encapsulates(block: Block): boolean {
		return block === this.left.value || block === this.right.value;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		this.left.value?.traverseChain(cb);
		this.right.value?.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		this.left.value?.traverseByLayer(cb, depth + 1);
		this.right.value?.traverseByLayer(cb, depth + 1);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.left.value !== null
				? this.left.value.reduceChain(cb, this.right.value !== null ? this.right.value.reduceChain(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): ExprCompileResult {
		if (!this.left.value) throw new Error(`Operator '${this.displayOp}' missing left operand`);
		if (!this.right.value) throw new Error(`Operator '${this.displayOp}' missing right operand`);

		const leftResult = this.left.value.compile(scope),
			rightResult = this.right.value.compile(scope);

		this.validateTypes(leftResult.meta.attributes.resolvedType, leftResult.meta.attributes.resolvedType);

		return {
			code: `${parenthesize(leftResult, this.precedence)} ${this.codeOp} ${parenthesize(rightResult, this.precedence)}`,
			meta: {
				requires: union(leftResult.meta.requires, rightResult.meta.requires),
				precedence: this.precedence,
				checks:
					OPERATOR_ASSOCIATIVITY[this.precedence] === Associativity.LTR
						? leftResult.meta.checks.concat(rightResult.meta.checks)
						: rightResult.meta.checks.concat(leftResult.meta.checks),
				attributes: {
					lvalue: false,
					resolvedType: DataType.PRIMITIVES.BOOL
				}
			}
		};
	}

	public abstract validateTypes(left: DataType, right: DataType): void;
}


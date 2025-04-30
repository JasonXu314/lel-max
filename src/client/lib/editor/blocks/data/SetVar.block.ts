import { EMPTY_BLOCK_RESULT, OperatorPrecedence, union, type LexicalScope, type SymbolRef } from '$lib/compiler';
import {
	ChainBranchBlock,
	EMPTY_VALUE,
	findDelta,
	HWVarRefValue,
	Slot,
	Value,
	type Block,
	type BlockCompileResult,
	type Connection,
	type IValueHost,
	type Typed
} from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { mergeLayers, parenthesize } from '$lib/utils/utils';
import type { BlockClass } from '../colors/colors';

interface SetVarBlockShapeParams {
	width: number;
	height: number;
}

export class SetVarBlock extends ChainBranchBlock implements IValueHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly type: BlockClass = 'DATA';
	public readonly shape: ResolvedPath<{}>;

	public child: ChainBranchBlock | null;
	public var: Slot<Value>;
	public value: Slot<Value>;

	public constructor() {
		super();

		this.parent = null;
		this.child = null;
		this.var = new Slot(this, (width) => new Point(-this.width / 2 + 25 + width / 2, 0), Value);
		this.value = new Slot(this, (width, height) => new Point(this.width / 2 - 5 - width / 2, this.height / 2 - (height / 2 + 3)), Value);

		this.shape = new PathBuilder<SetVarBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, -height / 2))
			.nubAt(() => this.nubs[0])
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
					}
				}))(this)
			);
	}

	public get notch(): Point {
		return new Point(-this.width / 2 + 15, this.height / 2);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 15, -this.height / 2)];
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.var, this.value];
	}

	public get width(): number {
		return this.var.width + this.value.width + 50;
	}

	public get height(): number {
		return Math.max(this.var.height, this.value.height) + 6;
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			this.var,
			this.value,
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

		this.renderEngine.text(this.position, 'Set', { align: 'left', paddingLeft: 6, color: 'white' }, this.shape);
		this.renderEngine.text(
			Point.midpoint(this.var.position.add(new Point(this.var.width / 2, 0)), this.value.position.add(new Point(-this.value.width / 2, 0))),
			'to',
			{ color: 'white' }
		);
	}

	public adopt(other: Block, slot?: Slot<Value>): void {
		if (other instanceof Value) {
			if (slot === this.var) {
				const value = slot.value;

				if (value) {
					value.host = null;
					this.disown(value);
				}

				if (this.parent) {
					this.parent.notifyAdoption({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(other.width - EMPTY_VALUE.width, other.height - EMPTY_VALUE.height)
					});
				}

				slot.value = other;
				if (value) value.drag(findDelta(this, value));
				// EXP: this "adopt-and-disown" scheme was written at 5:05 AM, see if theres a better way lol
				if (!other.lvalue) {
					other.host = null;
					this.disown(other);
					other.drag(findDelta(this, other));
				}
			} else {
				const value = slot.value;

				if (value) {
					value.host = null;
					this.disown(value);
				}

				if (this.parent) {
					this.parent.notifyAdoption({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(other.width - EMPTY_VALUE.width, other.height - EMPTY_VALUE.height)
					});
				}

				slot.value = other;
				if (value) value.drag(findDelta(this, value));
			}
		} else if (other instanceof ChainBranchBlock) {
			const child = this.child;

			if (child) {
				child.parent = null;
				this.disown(child);
			}

			this.child = other;
			if (child) child.drag(findDelta(this, child));

			super.adopt(other);
		}
	}

	public disown(other: Block): void {
		if (other instanceof Value) {
			if (this.parent) {
				this.parent.notifyDisownment({
					child: this,
					block: other,
					chain: [this],
					delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
				});
			}

			this.value.value = null;
			other.host = null;
		} else if (other instanceof ChainBranchBlock) {
			this.child = null;

			super.disown(other);
		}
	}

	public duplicate(): Block[][] {
		const valDupe = this.value.value?.duplicate() ?? [[]];

		const [[val]] = valDupe as [[Value]];

		const [[that]] = super.duplicate() as [[SetVarBlock]];

		that.value.value = val ?? null;
		if (val) val.host = that;

		return mergeLayers<Block>([[that]], valDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.child?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[SetVarBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.child = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public encapsulates(block: Block): boolean {
		return block === this.value.value;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.value.value) this.value.value.traverseChain(cb);
		if (this.child) this.child.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.var.value !== null) this.var.value.traverseByLayer(cb, depth + 1);
		if (this.value.value !== null) this.value.value.traverseByLayer(cb, depth + 1);
		if (this.child) this.child.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null
				? this.child.reduceChain(cb, this.value.value !== null ? this.value.value.reduceChain(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): BlockCompileResult {
		if (!this.var.value) throw new Error('Missing variable to set');
		if (!this.value.value) throw new Error('Missing value to set variable to');

		const variable = this.var.value.compile(scope);
		const value = this.value.value.compile(scope);
		const next = this.child !== null ? this.child.compile(scope) : EMPTY_BLOCK_RESULT;

		if (variable.meta.attributes.resolvedType !== value.meta.attributes.resolvedType) throw new Error('Mismatch of variable and value type');

		return {
			lines: [
				...value.meta.checks.flatMap((check) => check.lines),
				`${variable.code} = ${parenthesize(value, OperatorPrecedence.ASSIGNMENT)};`,
				...next.lines
			],
			meta: {
				requires: union(variable.meta.requires, value.meta.requires, next.meta.requires, ...value.meta.checks.map((check) => check.meta.requires)),
				precedence: OperatorPrecedence.ASSIGNMENT,
				checks: [],
				attributes: {
					lvalue: false,
					resolvedType:
						this.var.value instanceof HWVarRefValue ? this.var.value.dataType : (this.var.value as SymbolRef<Typed & Block>).master.dataType
				},
				ISRs: [],
				parentISR: null
			}
		};
	}
}


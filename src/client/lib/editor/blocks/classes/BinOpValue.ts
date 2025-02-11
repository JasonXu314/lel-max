import { union, type LexicalScope, type OperatorPrecedence } from '$lib/compiler';
import { Block, EMPTY_VALUE, Slot, Value, type Connection, type ExprCompileResult, type IValueHost, type StructureChangeEvent } from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { mergeLayers, parenthesize } from '$lib/utils/utils';

interface BinOpValueShapeParams {
	height: number;
	width: number;
}

export abstract class BinOpValue extends Value implements IValueHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly shape: ResolvedPath;

	public abstract readonly displayOp: string;
	public abstract readonly codeOp: string;
	public abstract readonly precedence: OperatorPrecedence;

	public left: Slot<Value>;
	public right: Slot<Value>;

	public constructor() {
		super();

		this.left = new Slot(this, (width) => new Point(-this.width / 2 + width / 2 + 5, 0));
		this.right = new Slot(this, (width) => new Point(this.width / 2 - width / 2 - 5, 0));

		this.host = null;

		this.shape = new PathBuilder<BinOpValueShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineTo(({ width, height }) => new Point((width - height) / 2, height / 2))
			.arc(({ height }) => height / 2)
			.arc(({ height }) => height / 2)
			.line(({ width, height }) => new Point(-(width - height), 0))
			.arc(({ height }) => height / 2)
			.arc(({ height }) => height / 2)
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

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}

	public get width(): number {
		return 5 + this.left.width + 15 + this.right.width + 5;
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

	public adopt(other: Block, slot: Slot<Value>): void {
		if (other instanceof Value) {
			if (slot.value) {
				slot.value.drag(new Point(0, -other.height + 20));
				slot.value.host = null;
				this.disown(slot.value);
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
			other.host = this;

			this.engine.enforceHierarchy(this, other);
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

		const [[left]] = leftDupe as [[Value]],
			[[right]] = rightDupe as [[Value]];

		const [[that]] = super.duplicate() as [[BinOpValue]];

		that.left.value = left ?? null;
		if (left) left.host = that;
		that.right.value = right ?? null;
		if (right) right.host = that;

		return mergeLayers<Block>([[that]], leftDupe, rightDupe);
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		this.left.value?.traverse(cb);
		this.right.value?.traverse(cb);
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

	public compile(scope: LexicalScope): ExprCompileResult {
		const leftResult = this.left.value.compile(scope),
			rightResult = this.right.value.compile(scope);

		return {
			code: `${parenthesize(leftResult, this.precedence)} ${this.codeOp} ${parenthesize(rightResult, this.precedence)}`,
			meta: { requires: union(leftResult.meta.requires, rightResult.meta.requires), precedence: this.precedence }
		};
	}
}


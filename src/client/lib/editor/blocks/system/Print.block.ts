import { LexicalScope, OperatorPrecedence, union } from '$lib/compiler';
import { ChainBranchBlock, EMPTY_VALUE, findDelta, Slot, Value, type Block, type BlockCompileResult, type Connection, type IValueHost } from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { mergeChecks, mergeLayers, parenthesize } from '$lib/utils/utils';
import type { BlockClass } from '../colors/colors';

interface PrintBlockShapeParams {
	width: number;
}

export class PrintBlock extends ChainBranchBlock implements IValueHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly type: BlockClass = 'SYSTEM';
	public readonly shape: ResolvedPath<{}>;

	public child: ChainBranchBlock | null;
	public value: Slot<Value>;

	public constructor() {
		super();

		this.parent = null;
		this.child = null;
		this.value = new Slot(this, (width, height) => new Point(this.width / 2 - 5 - width / 2, this.height / 2 - (height / 2 + 3)));

		this.shape = new PathBuilder<PrintBlockShapeParams>(({ width }) => width, 20)
			.begin(new Point(0, 10))
			.lineToCorner(({ width }) => new Point(width / 2, 10))
			.lineToCorner(({ width }) => new Point(width / 2, -10))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width }) => new Point(-width / 2, -10))
			.lineToCorner(({ width }) => new Point(-width / 2, 10))
			.notchAt(() => this.notch)
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					}
				}))(this)
			);
	}

	public get notch(): Point {
		return new Point(-this.width / 2 + 15, 10);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 15, -10)];
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.value];
	}

	public get width(): number {
		return this.value.width + 40;
	}

	public get height(): number {
		return this.value.height + 6;
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
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

		this.renderEngine.text(this.position, 'Print', { align: 'left', paddingLeft: 6, color: 'white' }, this.shape);
	}

	public adopt(other: Block, slot?: Slot<Value>): void {
		if (other instanceof Value) {
			const value = slot.value;

			if (value) {
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
		} else if (other instanceof ChainBranchBlock) {
			this.child = null;

			super.disown(other);
		}
	}

	public duplicate(): Block[][] {
		const valDupe = this.value.value?.duplicate() ?? [[]];

		const [[val]] = valDupe as [[Value]];

		const [[that]] = super.duplicate() as [[PrintBlock]];

		that.value.value = val ?? null;
		if (val) val.host = that;

		return mergeLayers<Block>([[that]], valDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.child?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[PrintBlock]],
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

		if (this.value.value) this.value.value.traverseByLayer(cb, depth + 1);
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
		const value = this.value.value.compile(scope);
		const next = this.child !== null ? this.child.compile(scope) : { lines: [], meta: { requires: [] } };

		return mergeChecks(
			{
				lines: [`std::cout << ${parenthesize(value, OperatorPrecedence.LSHIFT)} << std::endl;`, ...next.lines],
				meta: {
					requires: union(['iostream'], value.meta.requires, next.meta.requires),
					precedence: null,
					checks: []
				}
			},
			value
		);
	}
}


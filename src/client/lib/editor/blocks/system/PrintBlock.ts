import type { Block, BlockCompileResult, CompileResult, Connection } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { ChainBranchBlock } from '../classes/ChainBranchBlock';
import type { IValueHost } from '../classes/hosts/ValueHost';
import { Slot } from '../classes/Slot';
import { Value } from '../classes/Value';
import type { BlockClass } from '../colors/colors';
import { EMPTY_VALUE } from '../conditions/utils';
import { effectiveHeight } from '../utils/utils';

interface PrintBlockShapeParams {
	width: number;
}

export class PrintBlock extends ChainBranchBlock implements IValueHost {
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
			if (slot.value) {
				slot.value.drag(new Point(0, -other.height + 20));
				slot.value.host = null;
				this.disown(slot.value);
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
			other.host = this;

			this.engine.enforceHierarchy(this, other);
		} else if (other instanceof ChainBranchBlock) {
			if (this.child) {
				this.child.drag(new Point(0, -other.reduce(effectiveHeight, 0) + 20));
				this.child.parent = null;
				this.disown(this.child);
			}

			this.child = other;

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
		}
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.value.value) this.value.value.traverse(cb);
		if (this.child) this.child.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduce(cb, this.value.value !== null ? this.value.value.reduce(cb, thisResult) : thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(): BlockCompileResult {
		const value = this.value.value.compile();
		const next: CompileResult = this.child !== null ? this.child.compile() : { lines: [], meta: { requires: [] } };

		return {
			lines: [`std::cout << (${value.code}) << std::endl;`, ...next.lines],
			meta: {
				requires: ['iostream'].concat(value.meta.requires, next.meta.requires)
			}
		};
	}
}


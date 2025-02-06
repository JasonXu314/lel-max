import type { Block, Connection, ExprCompileResult, StructureChangeEvent } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { IValueHost } from '../classes/hosts/ValueHost';
import { Predicate } from '../classes/Predicate';
import { Slot } from '../classes/Slot';
import { Value } from '../classes/Value';
import { EMPTY_VALUE } from './utils';

interface LTPredicateShapeParams {
	width: number;
	height: number;
	angleInset: number;
}

export class LTPredicate extends Predicate implements IValueHost {
	public readonly type = 'VALUE';
	public readonly shape: ResolvedPath;

	public left: Slot<Value>;
	public right: Slot<Value>;

	public constructor() {
		super();

		this.left = new Slot(this, (width) => new Point(-this.width / 2 + width / 2 + 5, 0));
		this.right = new Slot(this, (width) => new Point(this.width / 2 - width / 2 - 5, 0));

		this.host = null;

		this.shape = new PathBuilder<LTPredicateShapeParams>(
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
			'<',
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

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		this.left.value.traverse(cb);
		this.right.value.traverse(cb);
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

	public compile(): ExprCompileResult {
		const leftResult = this.left.value.compile(),
			rightResult = this.right.value.compile();

		return {
			code: `${leftResult.code} < ${rightResult.code}`,
			meta: { requires: leftResult.meta.requires.concat(rightResult.meta.requires) }
		};
	}
}


import { wrapLiteral, type LexicalScope } from '$lib/compiler';
import { Block, EMPTY_VALUE, findDelta, Slot, Value, type Connection, type ExprCompileResult, type IValueHost } from '$lib/editor';
import type { EngineContext } from '$lib/engine/EngineContext';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { ArrayDataType } from '$lib/utils/ArrayDataType';
import { DataType } from '$lib/utils/DataType';

interface ElementOfValueShapeParams {
	width: number;
	height: number;
}

const ELEMENT_WIDTH = 35.7978515625,
	OF_WIDTH = 9.5615234375;

export class ElementOfValue extends Value implements IValueHost {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly type = 'DATA';
	public readonly lvalue: boolean = true;
	public readonly shape: ResolvedPath<ElementOfValueShapeParams>;

	public litIndex: number | null;

	public index: Slot<Value>;
	public vector: Slot<Value>;

	private _attached: boolean;

	public constructor() {
		super();

		this.litIndex = null;

		this.index = new Slot(this, (width) => new Point(-this.width / 2 + 5 + ELEMENT_WIDTH + 3 + width / 2, 0), Value);
		this.vector = new Slot(
			this,
			(width) =>
				new Point(
					-this.width / 2 +
						5 +
						ELEMENT_WIDTH +
						3 +
						(this.litIndex !== null ? this.renderEngine.measureWidth(`${this.litIndex}`) : this.index.width) +
						3 +
						OF_WIDTH +
						3 +
						width / 2,
					0
				),
			Value
		);

		this.host = null;

		this._attached = true;

		// double 8-radius arc of pi/2 to do arc of pi for numerical stability (or possibly because im bad at math lol)
		this.shape = new PathBuilder<ElementOfValueShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineTo(({ width, height }) => new Point(width / 2 - height / 2, height / 2))
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
		return [this.index, this.vector];
	}

	public get width(): number {
		return (
			5 +
			ELEMENT_WIDTH +
			3 +
			(this.litIndex !== null ? this.renderEngine.measureWidth(`${this.litIndex}`) : this.index.width) +
			3 +
			OF_WIDTH +
			3 +
			this.vector.width +
			5
		);
	}

	public get height(): number {
		return 6 + Math.max(this.index.height, this.vector.height);
	}

	public get alignGroup(): Connection[] {
		return [this.index, this.vector];
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, 'element', { color: 'white', align: 'left', paddingLeft: 5 }, this.shape);
		this.renderEngine.text(
			this.position.add(
				new Point(
					-this.width / 2 +
						5 +
						ELEMENT_WIDTH +
						3 +
						(this.litIndex !== null ? this.renderEngine.measureWidth(`${this.litIndex}`) : this.index.width) +
						3 +
						OF_WIDTH / 2,
					0
				)
			),
			'of',
			{ color: 'white' },
			this.shape
		);
	}

	public adopt(other: Block, slot: Slot<Value>): void {
		if (other instanceof Value) {
			const val = slot.value;

			if (val) {
				val.host = null;
				this.disown(val);
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
			if (val) val.drag(findDelta(this, val));
		}
	}

	public disown(other: Block): void {
		if (other instanceof Value) {
			const slot = this.index.value === other ? this.index : this.vector;

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

	public delete(): void {
		if (!this._attached) {
			super.delete();
		}
	}

	public duplicate(): Block[][] {
		return [[]];
	}

	public duplicateChain(): Block[][] {
		return [[]];
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.index.value) this.index.value.traverseByLayer(cb, depth + 1);
		if (this.vector.value) this.vector.value.traverseByLayer(cb, depth + 1);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.index.value !== null
				? this.index.value.reduceChain(cb, this.vector.value !== null ? this.vector.value.reduceChain(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public traverseChainUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.host !== null) this.host.traverseChain(cb);
	}

	public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): ExprCompileResult {
		if (!this.vector.value) throw new Error('Missing vector to take element of');
		if (this.litIndex === null && !this.index.value) throw new Error('Missing element index');

		const vectorResult = this.vector.value.compile(scope),
			indexResult = this.litIndex !== null ? wrapLiteral(this.litIndex, DataType.PRIMITIVES.LONG) : this.index.value.compile(scope);

		const vecType = vectorResult.meta.attributes.resolvedType;
		if (!(vecType instanceof ArrayDataType)) throw new Error('Taking index of non-array type');

		if (!indexResult.meta.attributes.resolvedType.integral) throw new Error('Indexing into array must use an integral type');

		return {
			code: `${vectorResult.code}[${indexResult.code}]`,
			meta: { requires: new Set(), precedence: null, checks: [], attributes: { lvalue: true, resolvedType: vecType.scalar } }
		};
	}
}


import { Block, type BlockCompileResult, type Connection, type ExprCompileResult } from '$lib/editor/Block';
import { MouseButton, type Engine } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { DataType } from '$lib/utils/DataType';
import { ChainBranchBlock } from '../classes/ChainBranchBlock';
import { Value } from '../classes/Value';
import { effectiveHeight } from '../utils';
import { DataTypeIndicator } from '../utils/DataTypeIndicator';

interface VarBlockShapeParams {
	width: number;
}

interface VarRefValueShapeParams {
	width: number;
}

export class VariableBlock extends ChainBranchBlock {
	public readonly type = 'DATA';
	public readonly shape: ResolvedPath<VarBlockShapeParams>;

	public child: ChainBranchBlock | null;
	public dataType: DataType;
	private _ref: VariableRefValue;
	private _name: string;

	public constructor() {
		super();

		this.parent = null;
		this.child = null;
		this.dataType = DataType.PRIMITIVES.INT;
		this._name = 'var_name';

		this.shape = new PathBuilder<VarBlockShapeParams>(({ width }) => width, 20)
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

	public get notch(): Point | null {
		return new Point(-this.width / 2 + 15, 10);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 15, -10)];
	}

	public get name(): string {
		return this._name;
	}

	public get width(): number {
		return this._ref.width + 40;
	}

	public get height(): number {
		return 20;
	}

	public set name(val: string) {
		const widthBefore = this.width;

		this._name = val;

		const widthAfter = this.width;

		this.position = this.position.add(new Point((widthAfter - widthBefore) / 2, 0));
		this._ref.position = this._ref.position.add(new Point((widthAfter - widthBefore) / 2, 0));
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			{
				block: this.child,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			},
			{
				block: this._ref,
				get position() {
					return that.position.add(new Point(10, 0));
				}
			}
		];
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.refDetached();
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, 'Var', { align: 'left', paddingLeft: 6, color: 'white' }, this.shape.move(this.position));
	}

	public adopt(other: ChainBranchBlock): void {
		if (this.child) {
			this.child.drag(new Point(0, -other.reduce(effectiveHeight, 0) + 20));
			this.child.parent = null;
			this.disown(this.child);
		}

		this.child = other;

		super.adopt(other);
	}

	public disown(other: Block): void {
		this.child = null;

		super.disown(other);
	}

	public refDetached(): void {
		const newRef = new VariableRefValue(this);

		newRef.position = this.position.add(new Point(10, 0));

		this.engine.add(newRef, 1);
		this._ref = newRef;
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduce(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(): BlockCompileResult {
		const type = this.dataType.compile();

		return {
			lines: [`${type.code} ${this.name};`],
			meta: { requires: type.meta.requires }
		};
	}
}

export class VariableRefValue extends Value {
	public readonly type = 'DATA';
	public readonly shape: ResolvedPath<VarRefValueShapeParams>;

	private _attached: boolean;
	private _dti: DataTypeIndicator<VariableRefValue>;

	public constructor(public readonly master: VariableBlock) {
		super();

		this.host = null;

		this._attached = true;
		this._dti = new DataTypeIndicator(this);

		// double 8-radius arc of pi/2 to do arc of pi for numerical stability (or possibly because im bad at math lol)
		this.shape = new PathBuilder<VarRefValueShapeParams>(({ width }) => width, 14)
			.begin(new Point(0, 7))
			.lineTo(({ width }) => new Point(width / 2 - 7, 7))
			.arc(7)
			.arc(7)
			.line(({ width }) => new Point(-(width - 14), 0))
			.arc(7)
			.arc(7)
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					}
				}))(this)
			);
	}

	public get width(): number {
		const metrics = this.renderEngine.measure(this.master.name);
		return 14 + metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8;
	}

	public get height(): number {
		return 14;
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			{
				block: this._dti,
				get position() {
					return that.position.add(new Point(-that.width / 2 + 7, 0));
				}
			}
		];
	}

	public set dataType(type: DataType) {
		this.master.dataType = type;
	}

	public get dataType(): DataType {
		return this.master.dataType;
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.engine.add(this._dti, 3);
	}

	public update(metadata: Metadata): void {
		super.update(metadata);

		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT && this._attached) {
			this.master.refDetached();
			this._attached = false;
		}
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position.add(new Point(4, 0)), this.master.name, { color: 'white' }, this.shape);
	}

	public delete(): void {
		if (!this._attached) {
			super.delete();
		}
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.host !== null) this.host.traverse(cb);
		if (this.master !== null) this.master.traverse(cb);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.master !== null ? this.master.reduceUp(cb, this.host !== null ? this.host.reduceUp(cb, thisResult) : thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(): ExprCompileResult {
		return { code: this.master.name, meta: { requires: [] } };
	}
}


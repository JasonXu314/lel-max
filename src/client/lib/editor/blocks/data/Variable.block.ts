import { union, type Declarator, type LexicalScope, type SymbolRef } from '$lib/compiler';
import {
	ChainBranchBlock,
	DataTypeIndicator,
	findDelta,
	Value,
	type Block,
	type BlockCompileResult,
	type Connection,
	type ExprCompileResult
} from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import type { EngineContext } from '$lib/engine/EngineContext';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { ArrayDataType } from '$lib/utils/ArrayDataType';
import { DataType } from '$lib/utils/DataType';
import { mergeLayers } from '$lib/utils/utils';

interface VarBlockShapeParams {
	width: number;
}

interface VarRefValueShapeParams {
	width: number;
}

const VAR_WIDTH = 16.4892578125;

export class VariableBlock extends ChainBranchBlock implements Declarator<VariableBlock, VariableRefValue> {
	public static readonly EMPTY_HEIGHT: number = 20;

	public readonly type = 'DATA';
	public readonly shape: ResolvedPath<VarBlockShapeParams>;
	public readonly refs: Set<VariableRefValue<this>> = new Set();

	public child: ChainBranchBlock | null;
	public dataType: DataType;
	public checked: boolean;
	private _ref: VariableRefValue<this>;
	private _name: string;

	public constructor() {
		super();

		this.parent = null;
		this.child = null;
		this.dataType = DataType.PRIMITIVES.INT;
		this.checked = false;
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
		return (
			5 +
			VAR_WIDTH +
			3 +
			this._ref.width +
			(this.dataType instanceof ArrayDataType ? 3 + this.renderEngine.measureWidth(`[${this.dataType.elems}]`) + 3 : 0) +
			5
		);
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
					return that.position.add(new Point(-that.width / 2 + 5 + VAR_WIDTH + 3 + that._ref.width / 2, 0));
				}
			}
		];
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		if (!this._ref) this.refDetached();
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, 'Var', { align: 'left', paddingLeft: 5, color: 'white' }, this.shape);

		if (this.dataType instanceof ArrayDataType) {
			this.renderEngine.text(this.position, `[${this.dataType.elems}]`, { align: 'right', paddingRight: 5, color: 'white' }, this.shape);
		}
	}

	public adopt(other: ChainBranchBlock): void {
		const child = this.child;

		if (child) {
			child.parent = null;
			this.disown(child);
		}

		this.child = other;
		if (child) child.drag(findDelta(this, child));

		super.adopt(other);
	}

	public disown(other: Block): void {
		this.child = null;

		super.disown(other);
	}

	public duplicate(): Block[][] {
		const [[that]] = super.duplicate() as [[VariableBlock]];

		const match = /(.+)(\d+)/.exec(this._name);

		if (match) {
			const num = Number(match[2]);

			that._name = match[1] + (num + 1);
		} else {
			that._name = this._name + '2';
		}

		return [[that]];
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.child?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[VariableBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.child = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public refDetached(): void {
		const newRef = new VariableRefValue(this);

		newRef.position = this.position.add(new Point(10, 0));

		this.context.add(newRef);
		this._ref = newRef;
		this.refs.add(newRef);
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this._ref !== null) this._ref.traverseByLayer(cb, depth + 1);
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
		const type = this.dataType.compile();

		scope.declare(this);

		const next = this.child !== null ? this.child.compile(scope) : { lines: [], meta: { requires: [] } };

		return {
			lines: [`${type.code} ${this.name};`, ...next.lines],
			meta: { requires: union(type.meta.requires, next.meta.requires), precedence: null, checks: [], attributes: { lvalue: false, resolvedType: null } }
		};
	}
}

export class VariableRefValue<T extends VariableBlock = VariableBlock> extends Value implements SymbolRef<T> {
	public readonly type = 'DATA';
	public readonly lvalue: boolean = true;
	public readonly shape: ResolvedPath<VarRefValueShapeParams>;

	private _attached: boolean;
	private _dti: DataTypeIndicator<VariableRefValue>;

	public constructor(public readonly master: T) {
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

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		this.context.add(this._dti);
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
			this.master.refs.delete(this);
		}
	}

	// NOTE: do not duplicate variable refs to allow for easy substitution
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

		this._dti.traverseByLayer(cb, depth + 1);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	public traverseChainUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.host !== null) this.host.traverseChain(cb);
		if (this.master !== null) this.master.traverseChain(cb);
	}

	public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.master !== null
				? this.master.reduceChainUp(cb, this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): ExprCompileResult {
		const entry = scope.lookup(this);

		if (!entry) throw new Error(`Variable ${this.master.name} not declared in current scope!`);

		return {
			code: this.master.name,
			meta: { requires: new Set(), precedence: null, checks: [], attributes: { lvalue: true, resolvedType: this.master.dataType } }
		};
	}
}


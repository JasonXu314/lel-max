import { OperatorPrecedence } from '$lib/compiler';
import { DataTypeIndicator, Value, type Block, type Connection, type ExprCompileResult } from '$lib/editor';
import type { EngineContext } from '$lib/engine/EngineContext';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { DataType } from '$lib/utils/DataType';

interface LiteralValueShapeParams {
	width: number;
}

export type LiteralPrimitive = number | string | boolean | null;

export class LiteralValue extends Value {
	public static readonly EMPTY_HEIGHT: number = 14;

	public readonly type = 'DATA';
	public readonly lvalue: boolean = false;
	public readonly shape: ResolvedPath<LiteralValueShapeParams>;

	private _dataType: DataType;
	private _value: LiteralPrimitive;
	private _dti: DataTypeIndicator<LiteralValue>;

	public constructor() {
		super();

		this.host = null;

		this._dataType = DataType.PRIMITIVES.STRING;
		this._value = 'string';
		this._dti = new DataTypeIndicator(this);

		// double 8-radius arc of pi/2 to do arc of pi for numerical stability (or possibly because im bad at math lol)
		this.shape = new PathBuilder<LiteralValueShapeParams>(({ width }) => width, 14)
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
		const metrics = this.renderEngine.measure(`${this._value}`);

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

	public set value(val: LiteralPrimitive) {
		this._value = val;
	}

	public get value(): LiteralPrimitive {
		return this._value;
	}

	public set dataType(type: DataType) {
		if (this._value === null) {
			switch (type) {
				case DataType.PRIMITIVES.STRING:
					this._value = 'null';
					break;
				case DataType.PRIMITIVES.BOOL:
					this._value = false;
					break;
				case DataType.PRIMITIVES.BYTE:
				case DataType.PRIMITIVES.INT:
				case DataType.PRIMITIVES.LONG:
				case DataType.PRIMITIVES.FLOAT:
				case DataType.PRIMITIVES.DOUBLE:
					this._value = 0;
					break;
			}
		} else {
			switch (type) {
				case DataType.PRIMITIVES.STRING:
					this._value = this._value.toString();
					break;
				case DataType.PRIMITIVES.BOOL:
					if (this._dataType === DataType.PRIMITIVES.STRING) {
						switch ((this._value as string).toLowerCase()) {
							case 'false':
								this._value = false;
								break;
							case 'true':
								this._value = true;
								break;
							default:
								this._value = !!this._value;
								break;
						}
					} else {
						this._value = !!this._value;
					}
					break;
				case DataType.PRIMITIVES.BYTE:
				case DataType.PRIMITIVES.INT:
				case DataType.PRIMITIVES.LONG: {
					if (this._dataType === DataType.PRIMITIVES.STRING) {
						const result = parseInt(this._value as string);

						if (Number.isNaN(result)) {
							this._value = 0;
						} else {
							this._value = result;
						}
					} else {
						this._value = Number(this._value);
					}

					break;
				}
				case DataType.PRIMITIVES.FLOAT:
				case DataType.PRIMITIVES.DOUBLE: {
					if (this._dataType === DataType.PRIMITIVES.STRING) {
						const result = parseFloat(this._value as string);

						if (Number.isNaN(result)) {
							this._value = 0;
						} else {
							this._value = result;
						}
					} else {
						this._value = Number(this._value);
					}

					break;
				}
			}
		}

		this._dataType = type;
	}

	public get dataType(): DataType {
		return this._dataType;
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		this.context.add(this._dti);
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position.add(new Point(4, 0)), `${this._value}`, { color: 'white' }, this.shape);
	}

	public duplicate(): Block[][] {
		const [[that]] = super.duplicate() as [[LiteralValue]];

		that._dataType = this._dataType;
		that._value = this._value;

		return [[that]];
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

	public compile(): ExprCompileResult {
		switch (this.dataType) {
			case DataType.PRIMITIVES.STRING:
				return {
					code: `"${this.value}"`,
					meta: {
						requires: new Set(),
						precedence: null,
						checks: [],
						attributes: { lvalue: false, resolvedType: this.dataType },
						ISRs: [],
						parentISR: null
					}
				};
			case DataType.PRIMITIVES.BOOL:
			case DataType.PRIMITIVES.BYTE:
			case DataType.PRIMITIVES.INT:
			case DataType.PRIMITIVES.LONG:
			case DataType.PRIMITIVES.FLOAT:
			case DataType.PRIMITIVES.DOUBLE:
				return {
					code: `${this.value}`,
					meta: {
						requires: new Set(),
						precedence: OperatorPrecedence.UN_PLUS,
						checks: [],
						attributes: { lvalue: false, resolvedType: this.dataType },
						ISRs: [],
						parentISR: null
					}
				};
		}
	}
}


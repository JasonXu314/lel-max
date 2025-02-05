import type { Block, Connection, ExprCompileResult } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { Value } from '../classes/Value';

interface LiteralValueShapeParams {
	width: number;
}

export type LiteralPrimitive = number | string | boolean | null;

export class LiteralValue extends Value {
	public readonly type = 'DATA';
	public readonly shape: ResolvedPath<LiteralValueShapeParams>;

	private _value: LiteralPrimitive;

	public constructor() {
		super();

		this.host = null;

		this._value = null;

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
		return [];
	}

	public set value(val: LiteralPrimitive) {
		this._value = val;
	}

	public get value(): LiteralPrimitive {
		return this._value;
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.fillCircle(this.position.add(new Point(-this.width / 2 + 7, 0)), 4, 'yellow');
		this.renderEngine.text(this.position.add(new Point(4, 0)), `${this._value}`, { color: 'white' }, this.shape);
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	public compile(): ExprCompileResult {
		// TODO: rework this when done with type system
		return {
			code: `"${this.value}"`,
			meta: { requires: [] }
		};
	}
}


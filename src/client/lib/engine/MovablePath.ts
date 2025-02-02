import { Point } from './Point';
import type { Parameterized } from './utils';

export interface PathData<Params extends Record<string, any>> {
	currPos: Point | null;
	lastStroke: Point | null;
	offset: Point;
	params: Params;

	ensurePath(): asserts this is { currPos: Point };
	ensureStroke(): asserts this is { currPos: Point; lastStroke: Point };
}

export type PathOp<Params extends Record<string, any>> = (this: PathData<Params>, path: Path2D) => void;

export class MovablePath<Params extends Record<string, any> = {}> {
	public constructor(
		private readonly script: PathOp<Params>[],
		public readonly width: Parameterized<number, Params, any>,
		public readonly height: Parameterized<number, Params, any>,
		public readonly offset: Point = new Point()
	) {}

	public move(pt: Point): MovablePath<Params> {
		return new MovablePath(this.script, this.width, this.height, this.offset.add(pt));
	}

	public moveTo(pt: Point): MovablePath<Params> {
		return new MovablePath(this.script, this.width, this.height, pt);
	}

	public path(params: Params, close: boolean = true): Path2D {
		const path = new Path2D();

		const data: PathData<Params> = {
			currPos: null,
			lastStroke: null,
			offset: this.offset,
			params,

			ensurePath: () => {
				if (data.currPos === null) throw new Error('No path started');
			},
			ensureStroke: () => {
				data.ensurePath();
				if (!data.currPos) throw new Error('This operation requires a previous line to be drawn');
			}
		};

		this.script.forEach((mv) => mv.call(data, path));
		if (close) path.closePath();

		return path;
	}

	public withParams(params: Params): ResolvedPath<Params> {
		return new ResolvedPath(this, params);
	}
}

export class ResolvedPath<Params extends Record<string, any> = {}> {
	public constructor(public readonly src: MovablePath<Params>, public readonly params: Params) {}

	public get width(): number {
		return typeof this.src.width === 'function' ? this.src.width(this.params) : this.src.width;
	}

	public get height(): number {
		return typeof this.src.height === 'function' ? this.src.height(this.params) : this.src.height;
	}

	public move(point: Point): ResolvedPath<Params> {
		return new ResolvedPath(this.src.move(point), this.params);
	}

	public moveTo(point: Point): ResolvedPath<Params> {
		return new ResolvedPath(this.src.moveTo(point), this.params);
	}

	public path(close: boolean = true): Path2D {
		return this.src.path(this.params, close);
	}
}


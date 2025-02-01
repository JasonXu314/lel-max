import { Point } from './Point';
import type { Parameterized } from './utils';

export class MovablePath<Params extends Record<string, any> = {}> {
	public constructor(
		private readonly script: ((offset: Point, path: Path2D, params: Params) => void)[],
		private readonly clr: () => void,
		public readonly width: Parameterized<number, Params>,
		public readonly height: Parameterized<number, Params>,
		public readonly offset: Point = new Point()
	) {}

	public move(pt: Point): MovablePath<Params> {
		return new MovablePath(this.script, this.clr, this.width, this.height, this.offset.add(pt));
	}

	public moveTo(pt: Point): MovablePath<Params> {
		return new MovablePath(this.script, this.clr, this.width, this.height, pt);
	}

	public path(params: Params, close: boolean = true): Path2D {
		const path = new Path2D();

		this.script.forEach((mv) => mv(this.offset, path, params));
		if (close) path.closePath();
		this.clr();

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


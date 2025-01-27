import { Point } from './Point';

export class MovablePath {
	public constructor(
		private readonly script: ((offset: Point, path: Path2D) => void)[],
		public readonly width: number,
		public readonly height: number,
		public readonly offset: Point = new Point()
	) {}

	public move(pt: Point): MovablePath {
		return new MovablePath(this.script, this.width, this.height, this.offset.add(pt));
	}

	public path(close: boolean = true): Path2D {
		const path = new Path2D();

		this.script.forEach((mv) => mv(this.offset, path));
		if (close) path.closePath();

		return path;
	}

	public forOffset(offset: Point, close: boolean = true): Path2D {
		const path = new Path2D();

		this.script.forEach((mv) => mv(offset, path));
		if (close) path.closePath();

		return path;
	}
}


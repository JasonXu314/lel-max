import { Point } from './Point';

export class MovablePath {
	public constructor(
		private readonly script: ((offset: Point, path: Path2D) => void)[],
		public readonly width: number,
		public readonly height: number,
		private readonly offset: Point = new Point()
	) {}

	public move(pt: Point): MovablePath {
		return new MovablePath(this.script, this.width, this.height, this.offset.add(pt));
	}

	public path(): Path2D {
		const path = new Path2D();

		this.script.forEach((mv) => mv(this.offset, path));
		path.closePath();

		return path;
	}

	public forOffset(offset: Point): Path2D {
		const path = new Path2D();

		this.script.forEach((mv) => mv(offset, path));
		path.closePath();

		return path;
	}
}


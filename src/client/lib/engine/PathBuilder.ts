import { MovablePath } from './MovablePath';
import { Point } from './Point';

export class PathBuilder {
	private readonly norm: Point;

	private _script: ((offset: Point, path: Path2D) => void)[];
	private _currPos: Point | null;
	private _lastStroke: Point | null;

	public constructor(public readonly width: number, public readonly height: number) {
		this.norm = new Point(width / 2, height / 2);

		this._script = [];
		this._currPos = null;
		this._lastStroke = null;
	}

	public begin(pt: Point): this {
		this._script = [];

		this._script.push((offset, path) => {
			const [x, y] = this.spaceToCanvas(offset.add(pt));

			path.moveTo(x, y);
		});

		this._currPos = pt;

		return this;
	}

	public lineTo(pt: Point): this {
		this._ensurePath();

		this._script.push((offset, path) => {
			const [x, y] = this.spaceToCanvas(offset.add(pt));

			path.lineTo(x, y);
		});

		this._lastStroke = pt.subtract(this._currPos);
		this._currPos = pt;

		return this;
	}

	public line(delta: Point): this {
		this._ensurePath();

		return this.lineTo(this._currPos.add(delta));
	}

	public arcTo(pt: Point, angle: number = Math.PI / 2): this {
		this._ensureStroke();

		if (Math.sign(angle) !== Math.sign(pt.subtract(this._currPos).refAngle()))
			throw new Error(`Impossible curve from <${this._currPos.x}, ${this._currPos.y}> to <${pt.x}, ${pt.y}> with angle ${(angle * 180) / Math.PI}`);

		// see scratch paper for proof/calculations (lol)
		const mpDist = this._currPos.distanceTo(pt) / 2,
			r = mpDist * Math.tan(angle / 2),
			rh = angle > 0;

		const center = pt.add(this._lastStroke.normal(rh).scaleTo(r));
		const startAngle = this._currPos.subtract(center).refAngle(),
			angleDelta = Math.PI - angle;

		this._script.push((offset, path) => {
			const [x, y] = this.spaceToCanvas(offset.add(center));

			path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);
		});

		this._lastStroke = this._lastStroke.invert().rotate(-angle);
		this._currPos = pt;

		return this;
	}

	public arc(r: number, angle: number = Math.PI / 2): this {
		this._ensureStroke();

		const rh = angle > 0;
		const center = this._currPos.add(this._lastStroke.normal(rh).scaleTo(r));
		const startAngle = this._currPos.subtract(center).refAngle(),
			angleDelta = Math.PI - angle;

		this._script.push((offset, path) => {
			const [x, y] = this.spaceToCanvas(offset.add(center));

			path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);
		});

		const endPt = center.add(this._lastStroke.invert().rotate(-angle).normal(rh).scaleTo(-r));
		this._lastStroke = this._lastStroke.invert().rotate(-angle);
		this._currPos = endPt;

		return this;
	}

	public lineToCorner(pt: Point, angle: number = Math.PI / 2, r: number = 2.5): this {
		this._ensurePath();

		return this.lineWithCorner(pt.subtract(this._currPos), angle, r);
	}

	public lineWithCorner(delta: Point, angle: number = Math.PI / 2, r: number = 2.5): this {
		this._ensurePath();

		return this.line(delta.scaleTo(delta.magnitude() - r)).arc(r, angle);
	}

	public nubAt(pt: Point): this {
		this._ensurePath();

		this.lineToCorner(pt.add(this._currPos.subtract(pt).scaleTo(5 + 4)), (-Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(8), (Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(10), (Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(8), (-Math.PI * 2) / 3, 1);

		return this;
	}

	public notchAt(pt: Point): this {
		this._ensurePath();

		this.lineToCorner(pt.add(this._currPos.subtract(pt).scaleTo(5 + 4)), (Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(8), (-Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(10), (-Math.PI * 2) / 3, 1);
		this.lineWithCorner(this._lastStroke.scaleTo(8), (Math.PI * 2) / 3, 1);

		return this;
	}

	public build(): MovablePath {
		this._lastStroke = null;
		this._currPos = null;

		const path = new MovablePath(this._script, this.width, this.height);

		this._script = [];

		return path;
	}

	public spaceToCanvas(point: Point): Point {
		return this.norm.add(point.invert('y'));
	}

	public canvasToSpace(point: Point): Point {
		return point.invert('y').add(this.norm.invert('x'));
	}

	private _ensureStroke(): void {
		this._ensurePath();
		if (!this._currPos) throw new Error('This operation requires a previous line to be drawn');
	}

	private _ensurePath(): void {
		if (!this._currPos) throw new Error('No path started for clipper');
	}
}


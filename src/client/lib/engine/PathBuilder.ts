import { MovablePath } from './MovablePath';
import { Point } from './Point';
import type { Parameterized } from './utils';

interface PathData {
	currPos: Point | null;
	lastStroke: Point | null;
}

export class PathBuilder<Params extends Record<string, any> = {}> {
	private readonly norm: (params: Params) => Point;

	private _script: ((offset: Point, path: Path2D, params: Params) => void)[];
	private _data: PathData;

	public constructor(public readonly width: Parameterized<number, Params>, public readonly height: Parameterized<number, Params>) {
		this.norm = (params) =>
			new Point((typeof width === 'function' ? width(params) : width) / 2, (typeof height === 'function' ? height(params) : height) / 2);

		this._script = [];
		this._data = {
			currPos: null,
			lastStroke: null
		};
	}

	public begin(pt: Parameterized<Point, Params>): this {
		this._script = [];
		const data = (this._data = { currPos: null, lastStroke: null });

		if (typeof pt === 'function') {
			this._script.push((offset, path, params) => {
				const [x, y] = this.spaceToCanvas(offset.add(pt(params)), params);

				path.moveTo(x, y);

				data.currPos = pt(params);
				data.lastStroke = null;
			});
		} else {
			this._script.push((offset, path, params) => {
				const [x, y] = this.spaceToCanvas(offset.add(pt), params);

				path.moveTo(x, y);

				data.currPos = pt;
				data.lastStroke = null;
			});
		}

		return this;
	}

	public lineTo(pt: Parameterized<Point, Params>): this {
		const data = this._data;

		if (typeof pt === 'function') {
			this._script.push((offset, path, params) => {
				this._ensurePath(data);
				const ppt = pt(params);

				const [x, y] = this.spaceToCanvas(offset.add(ppt), params);

				path.lineTo(x, y);

				data.lastStroke = ppt.subtract(data.currPos);
				data.currPos = ppt;
			});
		} else {
			this._script.push((offset, path, params) => {
				this._ensurePath(data);

				const [x, y] = this.spaceToCanvas(offset.add(pt), params);

				path.lineTo(x, y);

				data.lastStroke = pt.subtract(data.currPos);
				data.currPos = pt;
			});
		}

		return this;
	}

	public line(delta: Parameterized<Point, Params>): this {
		const data = this._data;

		return this.lineTo(typeof delta === 'function' ? (params) => data.currPos.add(delta(params)) : () => data.currPos.add(delta));
	}

	public arcTo(pt: Parameterized<Point, Params>, angle: number = Math.PI / 2): this {
		const data = this._data;

		if (typeof pt === 'function') {
			this._script.push((offset, path, params) => {
				this._ensureStroke(data);

				const ppt = pt(params);

				if (Math.sign(angle) !== Math.sign(ppt.subtract(data.currPos).refAngle()))
					throw new Error(
						`Impossible curve from <${data.currPos.x}, ${data.currPos.y}> to <${ppt.x}, ${ppt.y}> with angle ${(angle * 180) / Math.PI}`
					);

				// see scratch paper for proof/calculations (lol)
				const mpDist = data.currPos.distanceTo(ppt) / 2,
					r = mpDist * Math.tan(angle / 2),
					rh = angle > 0;

				const center = ppt.add(data.lastStroke.normal(rh).scaleTo(r));
				const startAngle = data.currPos.subtract(center).refAngle(),
					angleDelta = Math.PI - angle;

				const [x, y] = this.spaceToCanvas(offset.add(center), params);

				path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

				data.lastStroke = data.lastStroke.invert().rotate(-angle);
				data.currPos = ppt;
			});
		} else {
			this._script.push((offset, path, params) => {
				this._ensureStroke(data);

				if (Math.sign(angle) !== Math.sign(pt.subtract(data.currPos).refAngle()))
					throw new Error(
						`Impossible curve from <${data.currPos.x}, ${data.currPos.y}> to <${pt.x}, ${pt.y}> with angle ${(angle * 180) / Math.PI}`
					);

				// see scratch paper for proof/calculations (lol)
				const mpDist = data.currPos.distanceTo(pt) / 2,
					r = mpDist * Math.tan(angle / 2),
					rh = angle > 0;

				const center = pt.add(data.lastStroke.normal(rh).scaleTo(r));
				const startAngle = data.currPos.subtract(center).refAngle(),
					angleDelta = Math.PI - angle;

				const [x, y] = this.spaceToCanvas(offset.add(center), params);

				path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

				data.lastStroke = data.lastStroke.invert().rotate(-angle);
				data.currPos = pt;
			});
		}

		return this;
	}

	public arc(r: number, angle: number = Math.PI / 2): this {
		const data = this._data;

		this._script.push((offset, path, params) => {
			this._ensureStroke(data);

			const rh = angle > 0;
			const center = data.currPos.add(data.lastStroke.normal(rh).scaleTo(r));
			const startAngle = data.currPos.subtract(center).refAngle(),
				angleDelta = Math.abs(angle) === Math.PI ? angle : Math.PI - angle;

			const [x, y] = this.spaceToCanvas(offset.add(center), params);

			path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

			const endPt = center.add(data.lastStroke.invert().rotate(-angle).normal(rh).scaleTo(-r));
			data.lastStroke = data.lastStroke.invert().rotate(-angle);
			data.currPos = endPt;
		});

		return this;
	}

	public lineToCorner(pt: Parameterized<Point, Params>, angle: number = Math.PI / 2, r: number = 2.5): this {
		const data = this._data;

		return this.lineWithCorner(typeof pt === 'function' ? (params) => pt(params).subtract(data.currPos) : () => pt.subtract(data.currPos), angle, r);
	}

	public lineWithCorner(delta: Parameterized<Point, Params>, angle: number = Math.PI / 2, r: number = 2.5): this {
		return this.line(
			typeof delta === 'function'
				? (params) => {
						const pdelta = delta(params);
						return pdelta.scaleTo(pdelta.magnitude() - r);
				  }
				: delta.scaleTo(delta.magnitude() - r)
		).arc(r, angle);
	}

	public nubAt(pt: Parameterized<Point, Params>): this {
		const data = this._data;

		return this.lineToCorner(
			typeof pt === 'function'
				? (params) => {
						const ppt = pt(params);
						return ppt.add(data.currPos.subtract(ppt).scaleTo(4 + 2));
				  }
				: () => pt.add(data.currPos.subtract(pt).scaleTo(4 + 2)),
			(-Math.PI * 2) / 3,
			1
		)
			.lineWithCorner(() => data.lastStroke.scaleTo(4), (Math.PI * 2) / 3, 1)
			.lineWithCorner(() => data.lastStroke.scaleTo(8), (Math.PI * 2) / 3, 1)
			.lineWithCorner(() => data.lastStroke.scaleTo(4), (-Math.PI * 2) / 3, 1);
	}

	public notchAt(pt: Parameterized<Point, Params>): this {
		const data = this._data;

		return this.lineToCorner(
			typeof pt === 'function'
				? (params) => {
						const ppt = pt(params);
						return ppt.add(data.currPos.subtract(ppt).scaleTo(4 + 2));
				  }
				: () => pt.add(data.currPos.subtract(pt).scaleTo(4 + 2)),
			(Math.PI * 2) / 3,
			1
		)
			.lineWithCorner(() => data.lastStroke.scaleTo(4), (-Math.PI * 2) / 3, 1)
			.lineWithCorner(() => data.lastStroke.scaleTo(8), (-Math.PI * 2) / 3, 1)
			.lineWithCorner(() => data.lastStroke.scaleTo(4), (Math.PI * 2) / 3, 1);
	}

	public build(): MovablePath<Params> {
		const data = this._data;
		const path = new MovablePath(
			this._script,
			() => {
				data.currPos = null;
				data.lastStroke = null;
			},
			this.width,
			this.height
		);

		this._data = { currPos: null, lastStroke: null };
		this._script = [];

		return path;
	}

	public spaceToCanvas(point: Point, params: Params): Point {
		return this.norm(params).add(point.invert('y'));
	}

	public canvasToSpace(point: Point, params: Params): Point {
		return point.invert('y').add(this.norm(params).invert('x'));
	}

	private _ensureStroke(data: PathData): void {
		this._ensurePath(data);
		if (!data.currPos) throw new Error('This operation requires a previous line to be drawn');
	}

	private _ensurePath(data: PathData): void {
		if (!data.currPos) throw new Error('No path started');
	}
}


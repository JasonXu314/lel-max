import { MovablePath, type PathData, type PathOp } from './MovablePath';
import { Point } from './Point';
import type { Parameterized } from './utils';

export class PathBuilder<Params extends Record<string, any> = {}> {
	private readonly norm: (params: Params) => Point;

	private _script: PathOp<Params>[];

	public constructor(public readonly width: Parameterized<number, Params, void>, public readonly height: Parameterized<number, Params, void>) {
		this.norm = (params) =>
			new Point((typeof width === 'function' ? width(params) : width) / 2, (typeof height === 'function' ? height(params) : height) / 2);

		this._script = [];
	}

	public begin(pt: Parameterized<Point, Params, PathData<Params>>): this {
		this._script = [];
		const builder = this;

		if (typeof pt === 'function') {
			this._script.push(function (path) {
				const ppt = pt.call(this, this.params);

				const [x, y] = builder.spaceToCanvas(this.offset.add(ppt), this.params);

				path.moveTo(x, y);

				this.currPos = ppt;
				this.lastStroke = null;
			});
		} else {
			this._script.push(function (path) {
				const [x, y] = builder.spaceToCanvas(this.offset.add(pt), this.params);

				path.moveTo(x, y);

				this.currPos = pt;
				this.lastStroke = null;
			});
		}

		return this;
	}

	public lineTo(pt: Parameterized<Point, Params, PathData<Params>>): this {
		const builder = this;

		if (typeof pt === 'function') {
			this._script.push(function (path) {
				this.ensurePath();
				const ppt = pt.call(this, this.params);

				const [x, y] = builder.spaceToCanvas(this.offset.add(ppt), this.params);

				path.lineTo(x, y);

				this.lastStroke = ppt.subtract(this.currPos);
				this.currPos = ppt;
			});
		} else {
			this._script.push(function (path) {
				this.ensurePath();

				const [x, y] = builder.spaceToCanvas(this.offset.add(pt), this.params);

				path.lineTo(x, y);

				this.lastStroke = pt.subtract(this.currPos);
				this.currPos = pt;
			});
		}

		return this;
	}

	public line(delta: Parameterized<Point, Params, PathData<Params>>): this {
		return this.lineTo(
			typeof delta === 'function'
				? function () {
						return this.currPos.add(delta.call(this, this.params));
				  }
				: function () {
						return this.currPos.add(delta);
				  }
		);
	}

	public arcTo(pt: Parameterized<Point, Params, PathData<Params>>, angle: number = Math.PI / 2): this {
		const builder = this;

		if (typeof pt === 'function') {
			this._script.push(function (path) {
				this.ensureStroke();

				const ppt = pt.call(this, this.params);

				if (Math.sign(angle) !== Math.sign(ppt.subtract(this.currPos).refAngle()))
					throw new Error(
						`Impossible curve from <${this.currPos.x}, ${this.currPos.y}> to <${ppt.x}, ${ppt.y}> with angle ${(angle * 180) / Math.PI}`
					);

				// see scratch paper for proof/calculations (lol)
				const mpDist = this.currPos.distanceTo(ppt) / 2,
					r = mpDist * Math.tan(angle / 2),
					rh = angle > 0;

				const center = ppt.add(this.lastStroke.normal(rh).scaleTo(r));
				const startAngle = this.currPos.subtract(center).refAngle(),
					angleDelta = Math.PI - angle;

				const [x, y] = builder.spaceToCanvas(this.offset.add(center), this.params);

				path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

				this.lastStroke = this.lastStroke.invert().rotate(-angle);
				this.currPos = ppt;
			});
		} else {
			this._script.push(function (path) {
				this.ensureStroke();

				if (Math.sign(angle) !== Math.sign(pt.subtract(this.currPos).refAngle()))
					throw new Error(
						`Impossible curve from <${this.currPos.x}, ${this.currPos.y}> to <${pt.x}, ${pt.y}> with angle ${(angle * 180) / Math.PI}`
					);

				// see scratch paper for proof/calculations (lol)
				const mpDist = this.currPos.distanceTo(pt) / 2,
					r = mpDist * Math.tan(angle / 2),
					rh = angle > 0;

				const center = pt.add(this.lastStroke.normal(rh).scaleTo(r));
				const startAngle = this.currPos.subtract(center).refAngle(),
					angleDelta = Math.PI - angle;

				const [x, y] = builder.spaceToCanvas(this.offset.add(center), this.params);

				path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

				this.lastStroke = this.lastStroke.invert().rotate(-angle);
				this.currPos = pt;
			});
		}

		return this;
	}

	public arc(r: number, angle: number = Math.PI / 2): this {
		const builder = this;

		this._script.push(function (path) {
			this.ensureStroke();

			const rh = angle > 0;
			const center = this.currPos.add(this.lastStroke.normal(rh).scaleTo(r));
			const startAngle = this.currPos.subtract(center).refAngle(),
				angleDelta = Math.abs(angle) === Math.PI ? angle : Math.PI - angle;

			const [x, y] = builder.spaceToCanvas(this.offset.add(center), this.params);

			path.arc(x, y, r, -startAngle, -(startAngle - angleDelta), !rh);

			const endPt = center.add(this.lastStroke.invert().rotate(-angle).normal(rh).scaleTo(-r));
			this.lastStroke = this.lastStroke.invert().rotate(-angle);
			this.currPos = endPt;
		});

		return this;
	}

	public lineToCorner(pt: Parameterized<Point, Params, PathData<Params>>, angle: number = Math.PI / 2, r: number = 2.5): this {
		return this.lineWithCorner(
			typeof pt === 'function'
				? function () {
						return pt.call(this, this.params).subtract(this.currPos);
				  }
				: function () {
						return pt.subtract(this.currPos);
				  },
			angle,
			r
		);
	}

	public lineWithCorner(delta: Parameterized<Point, Params, PathData<Params>>, angle: number = Math.PI / 2, r: number = 2.5): this {
		return this.line(
			typeof delta === 'function'
				? function () {
						const pdelta = delta.call(this, this.params);
						return pdelta.scaleTo(pdelta.magnitude() - r);
				  }
				: delta.scaleTo(delta.magnitude() - r)
		).arc(r, angle);
	}

	public nubAt(pt: Parameterized<Point, Params, PathData<Params>>): this {
		return this.lineToCorner(
			typeof pt === 'function'
				? function () {
						const ppt = pt.call(this, this.params);
						return ppt.add(this.currPos.subtract(ppt).scaleTo(4 + 2));
				  }
				: function () {
						return pt.add(this.currPos.subtract(pt).scaleTo(4 + 2));
				  },
			(-Math.PI * 2) / 3,
			1
		)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(4);
				},
				(Math.PI * 2) / 3,
				1
			)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(8);
				},
				(Math.PI * 2) / 3,
				1
			)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(4);
				},
				(-Math.PI * 2) / 3,
				1
			);
	}

	public notchAt(pt: Parameterized<Point, Params, PathData<Params>>): this {
		return this.lineToCorner(
			typeof pt === 'function'
				? function () {
						const ppt = pt.call(this, this.params);
						return ppt.add(this.currPos.subtract(ppt).scaleTo(4 + 2));
				  }
				: function () {
						return pt.add(this.currPos.subtract(pt).scaleTo(4 + 2));
				  },
			(Math.PI * 2) / 3,
			1
		)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(4);
				},
				(-Math.PI * 2) / 3,
				1
			)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(8);
				},
				(-Math.PI * 2) / 3,
				1
			)
			.lineWithCorner(
				function () {
					return this.lastStroke.scaleTo(4);
				},
				(Math.PI * 2) / 3,
				1
			);
	}

	public circle(center: Parameterized<Point, Params, PathData<Params>>, r: number): MovablePath<Params> {
		const builder = this;

		return new MovablePath(
			[
				typeof center === 'function'
					? function (path) {
							const [x, y] = builder.spaceToCanvas(this.offset.add(center.call(this, this.params)), this.params);

							path.arc(x, y, r, 0, 2 * Math.PI);
					  }
					: function (path) {
							const [x, y] = builder.spaceToCanvas(this.offset.add(center), this.params);

							path.arc(x, y, r, 0, 2 * Math.PI);
					  }
			],
			this.width,
			this.height
		);
	}

	public build(): MovablePath<Params> {
		const path = new MovablePath(this._script, this.width, this.height);

		this._script = [];

		return path;
	}

	public spaceToCanvas(point: Point, params: Params): Point {
		return this.norm(params).add(point.invert('y'));
	}

	public canvasToSpace(point: Point, params: Params): Point {
		return point.invert('y').add(this.norm(params).invert('x'));
	}
}


export class Point {
	public x: number;
	public y: number;

	constructor(x?: number, y?: number) {
		this.x = x ?? 0;
		this.y = y ?? 0;
	}

	public add(other: Point): Point {
		return new Point(this.x + other.x, this.y + other.y);
	}

	public subtract(other: Point): Point {
		return new Point(this.x - other.x, this.y - other.y);
	}

	public times(scale: number): Point {
		return new Point(this.x * scale, this.y * scale);
	}

	public scale(scaleX: number, scaleY: number = scaleX): Point {
		return new Point(this.x * scaleX, this.y * scaleY);
	}

	public scaleTo(magnitude: number): Point {
		const currentMagnitude = this.magnitude();

		return new Point((this.x * magnitude) / currentMagnitude, (this.y * magnitude) / currentMagnitude);
	}

	public divide(scale: number): Point {
		return new Point(this.x / scale, this.y / scale);
	}

	public distanceTo(other: Point): number {
		return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
	}

	public magnitude(): number {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}

	public refAngle(): number {
		return Math.atan2(this.y, this.x);
	}

	public rotate(angle: number): Point {
		return new Point(Math.cos(-angle) * this.x - Math.sin(-angle) * this.y, Math.sin(-angle) * this.x + Math.cos(-angle) * this.y);
	}

	public invert(axis?: 'x' | 'y'): Point {
		if (axis) {
			switch (axis) {
				case 'x':
					return new Point(-this.x, this.y);
				case 'y':
					return new Point(this.x, -this.y);
			}
		} else {
			return new Point(-this.x, -this.y);
		}
	}

	public normal(rh: boolean = true): Point {
		return (rh ? new Point(this.y, -this.x) : new Point(-this.y, this.x)).scaleTo(1);
	}

	public clone(): Point {
		return new Point(this.x, this.y);
	}

	public *[Symbol.iterator]() {
		yield this.x;
		yield this.y;
		return;
	}

	public static midpoint(a: Point, b: Point): Point {
		return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
	}
}


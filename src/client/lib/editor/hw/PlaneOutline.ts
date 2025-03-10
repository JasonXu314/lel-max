import { Entity, type Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';

export class PlaneOutline extends Entity {
	public readonly shape: ResolvedPath;

	public constructor() {
		super();

		this.position = new Point(100, 0);

		this.shape = new PathBuilder(800, 800)
			.begin(new Point(-300, 50))
			.line(new Point(500, 0))
			.line(new Point(-500, 0))
			.lineToCorner(new Point(-50, 50), -(Math.PI * 2) / 3, 10)
			.forward(350)
			.line(new Point(50, 0))
			.lineToCorner(
				new Point(100, 50),
				function () {
					return -(Math.PI + new Point(100, 50).subtract(this.currPos).refAngle());
				},
				5
			)
			.lineToCorner(new Point(400 - 50 * Math.sqrt(3), 50), (Math.PI * 5) / 6, 20)
			.lineToCorner(new Point(400, 0), Math.PI / 3, 10)
			.lineToCorner(new Point(400 - 50 * Math.sqrt(3), -50), (Math.PI * 5) / 6, 20)
			.lineTo(new Point(-100, -50))
			.lineToCorner(new Point(-50, -50), (Math.PI * 2) / 3, 10)
			.forward(350)
			.line(new Point(50, 0))
			.lineToCorner(
				new Point(100, -50),
				function () {
					return Math.PI - new Point(100, -50).subtract(this.currPos).refAngle();
				},
				5
			)
			.lineToCorner(new Point(-350, -50), (Math.PI * 3) / 4, 10)
			.lineToCorner(new Point(-400, 0), Math.PI / 2, 20)
			.lineToCorner(new Point(-350, 50), (Math.PI * 3) / 4, 10)
			.build()
			.withParams({});
	}

	public update(metadata: Metadata): void {}

	public render(metadata: Metadata): void {
		this.renderEngine.stroke(this.shape.move(this.position), true, 2);
	}

	public selectedBy(point: Point): boolean {
		return false;
	}
}


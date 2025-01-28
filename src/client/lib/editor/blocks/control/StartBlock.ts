import { Block } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';

export class StartBlock extends Block {
	private readonly shape: MovablePath;

	public child: Block | null;

	public constructor() {
		super();

		this.notch = null;
		this.nubs = [new Point(-80, -20)];
		this.child = null;

		this.shape = new PathBuilder(200, 40 + Math.sqrt(3) * 2)
			.begin(new Point(0, 20))
			.lineToCorner(new Point(100, 20))
			.lineToCorner(new Point(100, -20))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-100, -20))
			.lineToCorner(new Point(-100, 20))
			.build();
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this.child) this.child.drag(metadata.mouse.delta);
		}
	}

	public render(metadata: Metadata): void {
		// renderEngine.stroke(this.shape.move(this.position));
		this.renderEngine.fill(this.shape.move(this.position), '#FFBF00');
		this.renderEngine.stroke(this.shape.move(this.position), true, 0.5, 'black');
		this.renderEngine.text(this.position, 'On program start:', { align: 'left', paddingLeft: 6, color: 'white' }, this.shape);

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(this.shape.move(this.position), true, 4, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public adopt(other: Block): void {
		this.child = other;
	}

	public disown(): void {
		this.child = null;
	}

	public drag(): void {
		throw new Error('Start block should not be child of any other block');
	}

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}
}


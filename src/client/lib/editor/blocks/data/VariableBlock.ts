import { Block } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';

export class VariableBlock extends Block {
	private readonly shape: MovablePath;

	public child: Block | null;

	private _parent: Block | null;

	public constructor() {
		super();

		this.notch = new Point(-80, 20);
		this.nubs = [new Point(-80, -20)];
		this.child = null;
		this._parent = null;

		this.shape = new PathBuilder(200, 40 + Math.sqrt(3) * 2)
			.begin(new Point(0, 20))
			.lineToCorner(new Point(100, 20))
			.lineToCorner(new Point(100, -20))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-100, -20))
			.lineToCorner(new Point(-100, 20))
			.notchAt(this.notch)
			.build();
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this._parent) {
				this._parent.disown(this);
				this._parent = null;
			}

			if (this.child) this.child.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;

			this._parent = metadata.snappingTo.block;
			this._parent.adopt(this);

			if (this.child) this.child.drag(delta);
		}
	}

	public render(renderEngine: RenderEngine, metadata: Metadata): void {
		if (metadata.snappingTo && metadata.mouse?.down) {
			const snapPos = metadata.snappingTo.nub.subtract(this.notch);

			renderEngine.stroke(this.shape.move(snapPos));
		}

		this.renderEngine.fill(this.shape.move(this.position), '#FF8C1A');

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(this.shape.move(this.position), 4, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public adopt(other: Block): void {
		this.child = other;
	}

	public disown(): void {
		this.child = null;
	}

	public drag(delta: Point): void {
		this.position = this.position.add(delta);

		if (this.child) this.child.drag(delta);
	}

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}
}


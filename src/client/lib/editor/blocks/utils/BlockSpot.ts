import type { Block } from '$lib/editor/Block';
import { MouseButton, type Engine } from '$lib/engine/Engine';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';

export class BlockSpot<T extends Block> extends Entity {
	public child: T;

	public constructor(private readonly Block: new () => T, pos: Point) {
		super();

		this.position = pos;

		this.child = new Block();
		this.child.position = this.position.clone();
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.engine.add(this.child, 0);
	}

	public update(metadata: Metadata): void {
		if (
			metadata.selectedEntity === this.child &&
			metadata.mouse?.down &&
			metadata.mouse.button === MouseButton.LEFT &&
			(metadata.mouse.delta.x !== 0 || metadata.mouse.delta.y !== 1)
		) {
			this.child = new this.Block();
			this.child.position = this.position.clone();

			this.engine.add(this.child, 0);
		}
	}

	public render(metadata: Metadata): void {}

	public selectedBy(point: Point): boolean {
		return false;
	}
}


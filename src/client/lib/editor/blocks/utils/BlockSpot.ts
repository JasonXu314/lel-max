import type { Block } from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import type { EngineContext } from '$lib/engine/EngineContext';
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

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		this.context.add(this.child);
	}

	public update(metadata: Metadata): void {
		if (
			metadata.selectedEntity === this.child &&
			metadata.mouse.down &&
			metadata.mouse.button === MouseButton.LEFT &&
			(metadata.mouse.delta.x !== 0 || metadata.mouse.delta.y !== 0)
		) {
			this.child.drag(metadata.mouse.delta); // need to make up for engine's missing the tick
			this.context.migrate(this.child);

			this.child = new this.Block();
			this.child.position = this.position.clone();

			this.context.add(this.child);
		}
	}

	public render(): void {}

	public selectedBy(): boolean {
		return false;
	}
}


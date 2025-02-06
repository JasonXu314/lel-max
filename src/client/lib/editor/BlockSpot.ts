import type { Engine } from '$lib/engine/Engine';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import type { Block } from './Block';

export class BlockSpot<T extends Block> extends Entity {
	private _child: T;

	public constructor(private readonly Block: new () => T, pos: Point) {
		super();

		this.position = pos;

		this._child = new Block();
		this._child.position = this.position.clone();
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.engine.add(this._child, 0);
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this._child && metadata.mouse?.down && (metadata.mouse.delta.x !== 0 || metadata.mouse.delta.y !== 1)) {
			this._child = new this.Block();
			this._child.position = this.position.clone();

			this.engine.add(this._child, 0);
		}
	}

	public render(metadata: Metadata): void {}

	public selectedBy(point: Point): boolean {
		return false;
	}
}


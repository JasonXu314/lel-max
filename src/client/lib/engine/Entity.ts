import type { Block } from '$lib/editor/Block';
import type { EngineContext } from './EngineContext';
import { Point } from './Point';
import type { RenderEngine } from './RenderEngine';

export interface Metadata {
	selectedEntity: Entity;
	mouse: MouseData;
	snappingTo: SnapData | null;
}

export type MouseData = { position: Point | null; dropped: boolean } & (
	| { down: true; button: number; delta: Point }
	| { down: false; button: null; delta: null }
);
export type SnapData = { block: Block; nub: Point };

export abstract class Entity {
	public position: Point = new Point();
	public readonly renderEngine: RenderEngine;
	public readonly context: EngineContext;

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		(this as any).renderEngine = renderEngine;
		(this as any).context = context;
	}

	public abstract update(metadata: Metadata): void;
	public abstract render(metadata: Metadata): void;
	public abstract selectedBy(point: Point): boolean;
}


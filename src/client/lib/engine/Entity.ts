import type { Block } from '$lib/editor/Block';
import type { Engine } from './Engine';
import { Point } from './Point';
import type { RenderEngine } from './RenderEngine';

export interface Metadata {
	selectedEntity: Entity;
	mouse: MouseData | null;
	snappingTo: SnapData | null;
}

export type MouseData = { position: Point | null; dropped: boolean } & ({ down: true; delta: Point } | { down: false; delta: null });
export type SnapData = { block: Block; nub: Point };

export abstract class Entity {
	public position: Point = new Point();
	protected readonly renderEngine: RenderEngine;
	protected readonly engine: Engine;

	public init(renderEngine: RenderEngine, engine: Engine): void {
		(this as any).renderEngine = renderEngine;
		(this as any).engine = engine;
	}

	public abstract update(metadata: Metadata): void;
	public abstract render(metadata: Metadata): void;
	public abstract selectedBy(point: Point, getMetrics: (label: string) => TextMetrics): boolean;
}


import { Entity } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';

export abstract class Block extends Entity {
	public abstract get width(): number;
	public abstract get height(): number;

	public adopt(other: Block, ...args: any): void {}
	public disown(other: Block, ...args: any): void {}

	public drag(delta: Point): void {
		this.position = this.position.add(delta);
	}

	public abstract snap(other: Block): Point | null;

	public delete(): void {
		this.engine.remove(this);
	}

	public abstract traverse(cb: (block: Block) => void): void;
	public abstract reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;

	public abstract traverseUp(cb: (block: Block) => void): void;
	public abstract reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;
}


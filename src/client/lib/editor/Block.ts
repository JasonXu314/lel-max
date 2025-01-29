import { Entity } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';

export abstract class Block extends Entity {
	public abstract get notch(): Point | null;
	public abstract get nubs(): Point[];

	public abstract get width(): number;
	public abstract get height(): number;

	public adopt(other: Block): void {}
	public disown(other: Block): void {}

	public drag(delta: Point): void {
		this.position = this.position.add(delta);
	}

	public snap(other: Block): Point | null {
		if (!this.notch) return null;

		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}

	public delete(): void {
		this.engine.remove(this);
	}

	public abstract traverse(cb: (block: Block) => void): void;
	public abstract reduce<T>(cb: (prev: T, block: Block) => T, init: T): T;
}


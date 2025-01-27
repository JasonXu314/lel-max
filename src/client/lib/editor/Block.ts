import { Entity } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';

export abstract class Block extends Entity {
	public notch: Point | null;
	public nubs: Point[];

	public abstract adopt(other: Block): void;
	public abstract disown(other: Block): void;
	public abstract drag(delta: Point): void;

	public snap(other: Block): Point | null {
		if (!this.notch) return null;

		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}
}


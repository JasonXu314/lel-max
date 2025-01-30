import type { Block } from '$lib/editor/Block';
import type { Point } from '$lib/engine/Point';
import type { PredicateHost } from './hosts/PredicateHost';
import type { ValueHost } from './hosts/ValueHost';
import type { Predicate } from './Predicate';
import type { Value } from './Value';

type Host<T extends Predicate | Value> = Block & (T extends Predicate ? PredicateHost : ValueHost);

export class Slot<T extends Predicate | Value> {
	public value: T | null;

	public constructor(private readonly host: Host<T>, private readonly pos: (width: number, height: number) => Point) {
		this.value = null;
	}

	public get position(): Point {
		return this.host.position.add(this.pos(this.width, this.height));
	}

	public get width(): number {
		return this.value !== null ? this.value.width : 30;
	}

	public get height(): number {
		return this.value !== null ? this.value.height : 14;
	}

	public drag(delta: Point): void {
		if (this.value) this.value.drag(delta);
	}
}


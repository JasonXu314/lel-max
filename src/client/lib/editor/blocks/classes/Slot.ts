// TODO: move this file lmao

import type { Block, Connection } from '$lib/editor/Block';
import type { Point } from '$lib/engine/Point';
import type { Predicate, Value } from '.';
import type { PredicateHost, ValueHost } from './hosts';

type Host<T extends Predicate | Value> = Block & (T extends Predicate ? PredicateHost : ValueHost);

export class Slot<T extends Predicate | Value> implements Connection {
	public value: T | null;

	public constructor(
		private readonly host: Host<T>,
		private readonly pos: (width: number, height: number) => Point,
		public readonly Slottable: abstract new () => T
	) {
		this.value = null;
	}

	public get block(): Block | null {
		return this.value;
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


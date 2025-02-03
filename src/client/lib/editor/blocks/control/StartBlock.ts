import { Block } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { ChainBlock } from '../classes/ChainBlock';

export class StartBlock extends ChainBlock {
	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath;

	public child: Block | null;

	public constructor() {
		super();

		this.child = null;

		this.shape = new PathBuilder(100, 20)
			.begin(new Point(0, 10))
			.lineToCorner(new Point(50, 10))
			.lineToCorner(new Point(50, -10))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-50, -10))
			.lineToCorner(new Point(-50, 10))
			.build()
			.withParams({});
	}

	public get nubs(): Point[] {
		return [new Point(-35, -10)];
	}

	public get width(): number {
		return 100;
	}

	public get height(): number {
		return 20;
	}

	public get children(): Block[] {
		return [this.child].filter((block) => !!block);
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this.child) this.child.drag(metadata.mouse.delta);
		}
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, 'On program start:', { align: 'left', paddingLeft: 6, color: 'white' }, this.shape);
	}

	public adopt(other: Block): void {
		this.child = other;
	}

	public disown(): void {
		this.child = null;
	}

	public drag(): void {
		throw new Error('Start block should not be child of any other block');
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduce(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}
}


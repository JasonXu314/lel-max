import { Block, type CompileResult, type Connection } from '$lib/editor/Block';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { DataType } from '$lib/utils/DataType';
import { COLORS, type BlockClass } from '../colors/colors';

export interface Typed {
	dataType: DataType;
}

export class DataTypeIndicator<T extends Typed & Block> extends Block {
	public readonly type: BlockClass;
	public readonly shape: ResolvedPath<{}>;

	public constructor(public readonly master: T) {
		super();

		this.type = 'SPECIAL';
		this.shape = new PathBuilder(8, 8).circle(new Point(0, 0), 4).withParams({});
	}

	public get width(): number {
		return 8;
	}

	public get height(): number {
		return 8;
	}

	public get alignGroup(): Connection[] {
		return [];
	}

	public update(): void {}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);

		this.renderEngine.fill(shape, this.master.dataType.color);

		if (metadata.selectedEntity === this) {
			if (metadata.selectedEntity === this) {
				this.renderEngine.stroke(shape, true, 2, COLORS.SPECIAL.HIGHLIGHT);
			}
		}
	}

	public snap(other: Block): Point | null {
		return null;
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	public traverseUp(cb: (block: Block) => void): void {
		cb(this);

		if (this.master !== null) this.master.traverseUp(cb);
	}

	public reduceUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.master !== null ? this.master.reduceUp(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(): CompileResult {
		throw new Error('Should not compile data type indicator');
	}
}


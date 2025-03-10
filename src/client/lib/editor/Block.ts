import type { LexicalScope, OperatorPrecedence } from '$lib/compiler';
import { hasPredicate, hasValue } from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { Point } from '$lib/engine/Point';
import type { DataType } from '$lib/utils/DataType';
import { COLORS, type BlockClass } from './blocks/colors/colors';
import { EMPTY_PREDICATE, EMPTY_VALUE } from './blocks/conditions/utils';

export interface Connection {
	block: Block | null;
	position: Point;
}

export interface StructureChangeEvent {
	child: Block;
	block: Block;
	chain: Block[];
	delta: Point;
}

export interface CheckCompileResult {
	lines: string[];
	meta: Pick<CompileResultMeta, 'requires'>;
}

export interface ExpressionAttributes {
	lvalue: boolean;
	resolvedType: DataType | null;
}

export interface CompileResultMeta {
	requires: Set<string>;
	precedence: OperatorPrecedence | null;
	checks: CheckCompileResult[];
	attributes: ExpressionAttributes;
}

export interface BlockCompileResult {
	lines: string[];
	meta: CompileResultMeta;
}

export interface ExprCompileResult {
	code: string;
	meta: CompileResultMeta;
}

export type CompileResult = BlockCompileResult | ExprCompileResult;

export abstract class Block extends Entity {
	public static readonly EMPTY_HEIGHT: number;

	public abstract get width(): number;
	public abstract get height(): number;

	public abstract get alignGroup(): Connection[];

	public abstract readonly type: BlockClass;
	public abstract readonly shape: ResolvedPath;

	public readonly ctxEnabled: boolean = true;

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);

			this.alignGroup.forEach(({ block }) => block?.drag(metadata.mouse.delta));

			const [x, y] = this.position,
				[cx, cy] = this.context.position;
			const { width: cw, height: ch } = this.context,
				{ width, height } = this;

			// context entity check looks pointless, but tells whether or not is in migration state
			if (
				this.context.entities.includes(this) &&
				(x - width / 2 < cx - cw / 2 || x + width / 2 > cx + cw / 2 || y - height / 2 < cy - ch / 2 || y + height / 2 > cy + ch / 2)
			) {
				this.context.migrate(this);
			}
		}
	}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);

		if (this.type !== 'SPECIAL') {
			const type = this.type;

			this.renderEngine.fill(shape, COLORS[type].LIGHT);
			this.renderEngine.stroke(shape, true, 0.5, COLORS.SPECIAL.OUTLINE);

			if (metadata.selectedEntity === this) {
				this.renderEngine.stroke(shape, true, 4, COLORS.SPECIAL.HIGHLIGHT);
			}

			if (hasPredicate(this)) {
				this.predicateSlots.forEach((slot) => {
					if (slot.value === null) {
						this.renderEngine.fill(EMPTY_PREDICATE.move(slot.position), COLORS[type].DARK);
					}
				});
			}

			if (hasValue(this)) {
				this.valueSlots.forEach((slot) => {
					if (slot.value === null) {
						this.renderEngine.fill(EMPTY_VALUE.move(slot.position), COLORS[type].DARK);
					}
				});
			}
		}
	}

	public adopt(other: Block, ...args: any): void {}
	public disown(other: Block, ...args: any): void {}

	public notifyAdoption(evt: StructureChangeEvent): void {}
	public notifyDisownment(evt: StructureChangeEvent): void {}

	public drag(delta: Point): void {
		this.position = this.position.add(delta);

		this.alignGroup.forEach((child) => child.block?.drag(delta));
	}

	public abstract snap(other: Block): Point | null;

	public delete(): void {
		this.context.remove(this);
	}

	public duplicate(): Block[][] {
		return [];
	}

	public duplicateChain(): Block[][] {
		return [];
	}

	public abstract traverseChain(cb: (block: Block) => void): void;
	public abstract reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;

	public abstract traverseByLayer(cb: (block: Block, depth: number) => void, depth?: number): void;

	public abstract traverseChainUp(cb: (block: Block) => void): void;
	public abstract reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T;

	public encapsulates(block: Block): boolean {
		return false;
	}

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}

	public ensureAlignment(fn: (reval: () => void) => void): void {
		let preDims = new Point(this.width, this.height);

		fn(() => (preDims = new Point(this.width, this.height)));

		const postDims = new Point(this.width, this.height);

		this.drag(preDims.subtract(postDims).invert('x').times(0.5));
	}

	public abstract compile(scope: LexicalScope): CompileResult;
}


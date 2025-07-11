import { EMPTY_BLOCK_RESULT, LexicalScope, union, type CompilerOptions } from '$lib/compiler';
import { createNotification } from '$lib/components/Notifications.svelte';
import { Block, ChainBlock, ChainBranchBlock, findDelta, WhenBlock, type BlockCompileResult, type Connection } from '$lib/editor';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { compileDependencies, lns, mergeLayers } from '$lib/utils/utils';

export class StartBlock extends ChainBlock {
	public static readonly EMPTY_HEIGHT: number = 20;

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

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			{
				block: this.child,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			}
		];
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position, 'On program start:', { align: 'left', paddingLeft: 5, color: 'white' }, this.shape);
	}

	public adopt(other: Block): void {
		const child = this.child;

		if (child && child instanceof ChainBranchBlock) {
			child.parent = null;
			this.disown();
		}

		this.child = other;
		if (child) child.drag(findDelta(this, child));
	}

	public disown(): void {
		this.child = null;
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.child?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[StartBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.child = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public drag(): void {
		throw new Error('Start block should not be child of any other block');
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		if (this.child !== null) this.child.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduceChain(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	public delete(): void {
		super.delete();

		createNotification({ type: 'alert', text: 'ur a fucking idiot', expiration: 5000 });
	}

	// FIXME: default argument is a hack to avoid changing the entire compilation up/down the chain, yet still allow start block to access copmilation options
	public compile(scope: LexicalScope, options: CompilerOptions = null): BlockCompileResult {
		const mainScope = new LexicalScope(scope);
		const result = this.child !== null ? this.child.compile(mainScope) : EMPTY_BLOCK_RESULT;
		const daemons = new Map<string, BlockCompileResult[]>();

		this.context.entities
			.filter((e) => e instanceof WhenBlock)
			.map((when) => when.compile(scope))
			.forEach((result) => {
				if (daemons.has(result.meta.parentISR)) {
					daemons.get(result.meta.parentISR).push(result);
				} else {
					daemons.set(result.meta.parentISR, [result]);
				}
			});

		const requires = union<string>(result.meta.requires, ...[...daemons.values()].flatMap((results) => results.map((result) => result.meta.requires)));

		return {
			lines: lns([
				...compileDependencies(requires),
				'int main() {',
				...(daemons.has('tick') ? [[`__CLK_CTR_THRESHOLD = ${options.tickRate};`]] : []),
				[...daemons.keys()].map((interrupt) => `init_ISR_${interrupt}();`),
				...(daemons.size > 0 ? [''] : []),
				'lines' in result ? result.lines : [result.code],
				['return 0;'],
				'}',
				'',
				...[...daemons.entries()].flatMap(([interrupt, results]) =>
					lns([`void ISR_${interrupt}(void) {`, results.flatMap((result) => result.lines), '}', ''])
				)
			]),
			meta: {
				requires,
				precedence: null,
				checks: [],
				attributes: { lvalue: false, resolvedType: null },
				ISRs: [...daemons.keys()],
				parentISR: null
			}
		};
	}
}


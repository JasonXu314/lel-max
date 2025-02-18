import { ChainBlock, ChainBranchBlock, IfBlock, SlottableBlock, type Block } from '$lib/editor';
import { Point } from '$lib/engine/Point';

export function effectiveHeight(height: number, block: Block, prune: (arg: number) => number): number {
	return height === 0
		? block.height
		: (block instanceof ChainBranchBlock && block.parent?.encapsulates(block)) || (block instanceof SlottableBlock && block.host.encapsulates(block)) // TODO: consider if slottable blocks will 100% be encapsulated? (think except for ringed blocks?)
		? prune(height)
		: height + block.height;
}

export function hasIfBlock(result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean {
	return result || (block instanceof IfBlock ? prune(true) : false);
}

export function hasInChain(target: Block): (result: boolean, block: Block, prune: (arg: boolean) => boolean) => boolean {
	return (result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean => result || (block === target ? prune(true) : false);
}

// NOTE: leaving this as point, even though no x shift for now, in case in the future i want to realign stuff with this
export function findDelta(anchor: Block, from: Block): Point {
	const root = anchor.reduceChainUp<Block>(
		(root, block, prune) =>
			root
				? root
				: (block instanceof ChainBlock && !(block instanceof ChainBranchBlock)) ||
				  (block instanceof ChainBranchBlock && block.parent === null) ||
				  (block instanceof SlottableBlock && block.host === null)
				? prune(block)
				: null,
		null
	);
	const chainHeight = root.reduceChain(effectiveHeight, 0);

	return new Point(from.position.x, root.position.y)
		.add(new Point(0, root.height / 2))
		.add(new Point(0, -chainHeight))
		.add(new Point(0, -from.height / 2))
		.add(new Point(0, -20))
		.subtract(from.position);
}


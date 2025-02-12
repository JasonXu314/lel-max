import type { Block } from '../../Block';
import { ChainBranchBlock, SlottableBlock } from '../classes';
import { IfBlock } from '../control/If.block';

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


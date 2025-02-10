import type { Block } from '../../Block';
import { ChainBranchBlock } from '../classes';
import { IfBlock } from '../control/IfBlock';

export function effectiveHeight(height: number, block: Block, prune: (arg: number) => number): number {
	return height === 0 ? block.height : block instanceof ChainBranchBlock && block.parent.encapsulates(block) ? prune(height) : height + block.height;
}

export function hasIfBlock(result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean {
	return result || (block instanceof IfBlock ? prune(true) : false);
}

export function hasInChain(target: Block): (result: boolean, block: Block, prune: (arg: boolean) => boolean) => boolean {
	return (result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean => result || (block === target ? prune(true) : false);
}


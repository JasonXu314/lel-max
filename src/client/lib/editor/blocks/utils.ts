import type { Block } from '../Block';
import { ChainBranchBlock } from './classes/ChainBranchBlock';
import { IfBlock } from './control/IfBlock';

export function effectiveHeight(height: number, block: Block, prune: (arg: number) => number): number {
	return height === 0
		? block.height
		: block instanceof ChainBranchBlock && block.parent instanceof IfBlock && block === block.parent.affChild
		? prune(height)
		: height + block.height;
}

export function hasIfBlock(result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean {
	return result || (block instanceof IfBlock ? prune(true) : false);
}


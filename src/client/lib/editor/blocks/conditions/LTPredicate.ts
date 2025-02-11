import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate } from '$lib/editor';

export class LTPredicate extends BinOpPredicate {
	public readonly displayOp: string = '<';
	public readonly codeOp: string = '<';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.LT;
}


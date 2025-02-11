import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate } from '$lib/editor';

export class GTEPredicate extends BinOpPredicate {
	public readonly displayOp: string = '\u2265';
	public readonly codeOp: string = '>=';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.GTE;
}


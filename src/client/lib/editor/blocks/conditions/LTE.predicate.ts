import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate } from '$lib/editor';

export class LTEPredicate extends BinOpPredicate {
	public readonly displayOp: string = '\u2264';
	public readonly codeOp: string = '<=';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.LTE;
}


import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '$lib/editor';

export class SubtractionValue extends BinOpValue {
	public readonly displayOp: string = '-';
	public readonly codeOp: string = '-';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.SUB;
}


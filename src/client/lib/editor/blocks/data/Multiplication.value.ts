import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '$lib/editor';

export class MultiplicationValue extends BinOpValue {
	public readonly displayOp: string = '\u00D7';
	public readonly codeOp: string = '*';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.ADD;
	public readonly lvalue: boolean = false;
}


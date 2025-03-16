import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '$lib/editor';
import type { DataType } from '$lib/utils/DataType';

export class MultiplicationValue extends BinOpValue {
	public readonly displayOp: string = '\u00D7';
	public readonly codeOp: string = '*';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.ADD;
	public readonly lvalue: boolean = false;

	public validateTypes(left: DataType, right: DataType): void {
		if (!left.numeric || !right.numeric) throw new Error("Operator '\u00D7' requires both operands to be numeric");
	}
}


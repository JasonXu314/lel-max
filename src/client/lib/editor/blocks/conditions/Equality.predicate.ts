import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Slot, Value } from '$lib/editor';
import { DataType } from '$lib/utils/DataType';

export class EqualityPredicate extends BinOpPredicate<Value> {
	public readonly displayOp: string = '=';
	public readonly codeOp: string = '==';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.EQ;

	public constructor() {
		super(Value, Value);
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}

	public validateTypes(left: DataType, right: DataType): void {
		if (left.numeric !== right.numeric) throw new Error("Operator '=' requires either both operands to be numeric or not");
	}
}


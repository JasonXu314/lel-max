import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Slot, Value } from '$lib/editor';
import type { DataType } from '$lib/utils/DataType';

export class LTPredicate extends BinOpPredicate<Value> {
	public readonly displayOp: string = '<';
	public readonly codeOp: string = '<';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.LT;

	public constructor() {
		super(Value, Value);
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}

	public validateTypes(left: DataType, right: DataType): void {
		if (!left.numeric || !right.numeric) throw new Error("Operator '<' requires both operands to be numeric");
	}
}


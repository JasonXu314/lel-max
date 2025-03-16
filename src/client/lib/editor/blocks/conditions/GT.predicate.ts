import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Slot, Value } from '$lib/editor';

export class GTPredicate extends BinOpPredicate<Value> {
	public readonly displayOp: string = '>';
	public readonly codeOp: string = '>';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.GT;

	public constructor() {
		super(Value, Value);
	}

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}
}


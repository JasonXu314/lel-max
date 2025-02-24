import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Slot, Value } from '$lib/editor';

export class EqualityPredicate extends BinOpPredicate<Value> {
	public readonly displayOp: string = '=';
	public readonly codeOp: string = '==';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.EQ;

	public get valueSlots(): Slot<Value>[] {
		return [this.left, this.right];
	}
}


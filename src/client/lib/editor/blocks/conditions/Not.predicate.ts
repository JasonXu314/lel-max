import { OperatorPrecedence } from '$lib/compiler';
import { Predicate, Slot } from '$lib/editor';
import { DataType } from '$lib/utils/DataType';
import { UnOpPredicate } from '../classes/UnOpPredicate';

export class NotPredicate extends UnOpPredicate<Predicate> {
	public readonly displayOp: string = 'not';
	public readonly codeOp: string = '!';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.BOOL_NOT;

	public constructor() {
		super(Predicate);
	}

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.operand];
	}

	public validateType(type: DataType): void {
		if (type !== DataType.PRIMITIVES.BOOL) throw new Error("Operator 'not' requires operand to be boolean");
	}
}


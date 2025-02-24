import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Predicate, Slot } from '$lib/editor';

export class AndPredicate extends BinOpPredicate<Predicate> {
	public readonly displayOp: string = 'and';
	public readonly codeOp: string = '&&';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.BOOL_AND;

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.left, this.right];
	}
}


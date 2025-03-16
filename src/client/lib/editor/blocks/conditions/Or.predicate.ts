import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Predicate, Slot } from '$lib/editor';

export class OrPredicate extends BinOpPredicate<Predicate> {
	public readonly displayOp: string = 'or';
	public readonly codeOp: string = '||';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.BOOL_OR;

	public constructor() {
		super(Predicate, Predicate);
	}

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.left, this.right];
	}
}


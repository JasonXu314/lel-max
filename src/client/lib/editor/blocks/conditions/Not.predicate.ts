import { OperatorPrecedence } from '$lib/compiler';
import { Predicate, Slot } from '$lib/editor';
import { UnOpPredicate } from '../classes/UnOpPredicate';

export class NotPredicate extends UnOpPredicate<Predicate> {
	public readonly displayOp: string = 'not';
	public readonly codeOp: string = '!';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.BOOL_NOT;

	public get predicateSlots(): Slot<Predicate>[] {
		return [this.operand];
	}
}


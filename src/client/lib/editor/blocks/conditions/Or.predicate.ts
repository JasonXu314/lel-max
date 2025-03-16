import { OperatorPrecedence } from '$lib/compiler';
import { BinOpPredicate, Predicate, Slot } from '$lib/editor';
import { DataType } from '$lib/utils/DataType';

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

	public validateTypes(left: DataType, right: DataType): void {
		if (!(left === DataType.PRIMITIVES.BOOL && right === DataType.PRIMITIVES.BOOL)) throw new Error("Operator 'or' requires both operands to be booleans");
	}
}


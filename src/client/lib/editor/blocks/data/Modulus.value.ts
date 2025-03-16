import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '$lib/editor';
import type { DataType } from '$lib/utils/DataType';

export class ModulusValue extends BinOpValue {
	public readonly displayOp: string = '%';
	public readonly codeOp: string = '%';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.MOD;
	public readonly lvalue: boolean = false;

	public validateTypes(left: DataType, right: DataType): void {
		if (!left.numeric || !right.numeric) throw new Error("Operator '%' requires both operands to be numeric");
		if (!left.integral) throw new Error("Operator '%' requires right operand to be integral type");
	}
}


import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '../classes/BinOpValue';

export class ModulusValue extends BinOpValue {
	public readonly displayOp: string = '%';
	public readonly codeOp: string = '%';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.MOD;
}


import { OperatorPrecedence } from '$lib/compiler';
import { BinOpValue } from '../classes/BinOpValue';

interface AdditionValueShapeParams {
	width: number;
	height: number;
}

export class AdditionValue extends BinOpValue {
	public readonly displayOp: string = '+';
	public readonly codeOp: string = '+';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.ADD;
}


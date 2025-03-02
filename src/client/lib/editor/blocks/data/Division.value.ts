import { LexicalScope, OperatorPrecedence } from '$lib/compiler';
import { BinOpValue, VariableRefValue, type ExprCompileResult } from '$lib/editor';
import { lns } from '$lib/utils/utils';

export class DivisionValue extends BinOpValue {
	public readonly displayOp: string = '\u00F7';
	public readonly codeOp: string = '/';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.DIV;
	public readonly lvalue: boolean = false;

	public compile(scope: LexicalScope): ExprCompileResult {
		const result = super.compile(scope);

		if (this.right.value instanceof VariableRefValue && this.right.value.master.checked) {
			const checkScope = new LexicalScope(scope);

			result.meta.checks.push({
				lines: lns([
					`if (${this.right.value.compile(checkScope).code} == 0) {`,
					[`std::cerr << "Illegal division by variable '${this.right.value.master.name}' with value 0" << std::endl;`, 'return 1;'],
					'}'
				]),
				meta: {
					requires: new Set(['iostream'])
				}
			});
		}

		return result;
	}
}


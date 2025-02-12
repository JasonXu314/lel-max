import { LexicalScope, OperatorPrecedence } from '$lib/compiler';
import { BinOpValue, LiteralValue, VariableRefValue, type ExprCompileResult } from '$lib/editor';
import { DataType } from '$lib/utils/DataType';
import { lns } from '$lib/utils/utils';

export class SubtractionValue extends BinOpValue {
	public readonly displayOp: string = '-';
	public readonly codeOp: string = '-';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.SUB;

	public compile(scope: LexicalScope): ExprCompileResult {
		const result = super.compile(scope);

		// TODO: handle when variable is on RHS
		if (this.left.value instanceof VariableRefValue) {
			const varRef = this.left.value;

			// TODO: refine constexpr-able checks
			if (this.right.value instanceof LiteralValue) {
				const val = this.right.value.value as number;

				const rangeFacility = `lellib::subtraction<${varRef.dataType.compile().code}>`;
				const checkScope = new LexicalScope(scope);

				result.meta.checks.push({
					lines: lns([
						`if (${varRef.compile(scope).code} ${
							val < 0 ? `> ${rangeFacility}::maxNegative<${val}>()` : `< ${rangeFacility}::minPositive<${val}>()`
						}) {`,
						[
							`std::cerr << "Variable '${varRef.master.name}' (value " << ${varRef.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''}${
								varRef.compile(checkScope).code
							} << ") would overflow upon subtracting ${val}" << std::endl;`,
							'return 1;'
						],
						'}'
					]),
					meta: {
						requires: new Set(['$lib:RangeChecks', 'iostream']),
						precedence: null,
						checks: []
					}
				});
			} else if (this.right.value instanceof VariableRefValue) {
				const other = this.right.value;

				const rangeFacility = `lellib::subtraction<${varRef.dataType.compile().code}>`;
				const checkScope = new LexicalScope(scope);

				result.meta.checks.push({
					lines: lns([
						`if (!${rangeFacility}::safe(${varRef.compile(scope).code}, ${other.compile(scope).code})) {`,
						[
							`std::cerr << "Variable '${varRef.master.name}' (value " << ${varRef.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''}${
								varRef.compile(checkScope).code
							} << ") would overflow upon subtracting '${other.master.name}' (value " << ${
								other.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''
							}${other.compile(checkScope).code} << ")" << std::endl;`,
							'return 1;'
						],
						'}'
					]),
					meta: {
						requires: new Set(['$lib:RangeChecks', 'iostream']),
						precedence: null,
						checks: []
					}
				});
			}
		}

		return result;
	}
}


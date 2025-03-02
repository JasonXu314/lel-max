import { LexicalScope, OperatorPrecedence } from '$lib/compiler';
import { BinOpValue, LiteralValue, VariableRefValue, type ExprCompileResult } from '$lib/editor';
import { DataType } from '$lib/utils/DataType';
import { lns } from '$lib/utils/utils';

export class AdditionValue extends BinOpValue {
	public readonly displayOp: string = '+';
	public readonly codeOp: string = '+';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.ADD;
	public readonly lvalue: boolean = false;

	public compile(scope: LexicalScope): ExprCompileResult {
		const result = super.compile(scope);

		const operands = [this.left.value, this.right.value];

		const varIdx = operands.findIndex((val) => val instanceof VariableRefValue && val.master.checked);
		if (varIdx !== -1) {
			const varRef = operands[varIdx] as VariableRefValue,
				other = operands[varIdx === 0 ? 1 : 0];

			// TODO: refine constexpr-able checks
			if (other instanceof LiteralValue) {
				const val = other.value as number;
				const rangeFacility = `lellib::addition<${varRef.dataType.compile().code}>`;
				const checkScope = new LexicalScope(scope);

				result.meta.checks.push({
					lines: lns([
						`if (${varRef.compile(scope).code} ${
							val < 0 ? `< ${rangeFacility}::minNegative<${val}>()` : `> ${rangeFacility}::maxPositive<${val}>()`
						}) {`,
						[
							`std::cerr << "Variable '${varRef.master.name}' (value " << ${varRef.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''}${
								varRef.compile(checkScope).code
							} << ") would overflow upon adding ${val}" << std::endl;`,
							'return 1;'
						],
						'}'
					]),
					meta: {
						requires: new Set(['$lib:RangeChecks', 'iostream'])
					}
				});
			} else if (other instanceof VariableRefValue) {
				const rangeFacility = `lellib::addition<${varRef.dataType.compile().code}>`;
				const checkScope = new LexicalScope(scope);

				result.meta.checks.push({
					lines: lns([
						`if (!${rangeFacility}::safe(${varRef.compile(scope).code}, ${other.compile(scope).code})) {`,
						[
							`std::cerr << "Variable '${varRef.master.name}' (value " << ${varRef.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''}${
								varRef.compile(checkScope).code
							} << ") would overflow upon adding '${other.master.name}' (value " << ${
								other.dataType === DataType.PRIMITIVES.BYTE ? '(int)' : ''
							}${other.compile(checkScope).code} << ")" << std::endl;`,
							'return 1;'
						],
						'}'
					]),
					meta: {
						requires: new Set(['$lib:RangeChecks', 'iostream'])
					}
				});
			}
		}

		return result;
	}
}


import { Associativity, LexicalScope, OPERATOR_ASSOCIATIVITY, OperatorPrecedence, resolveNumerics, union } from '$lib/compiler';
import { BinOpValue, VariableRefValue, type ExprCompileResult } from '$lib/editor';
import type { DataType } from '$lib/utils/DataType';
import { lns, parenthesize } from '$lib/utils/utils';

export class DivisionValue extends BinOpValue {
	public readonly displayOp: string = '\u00F7';
	public readonly codeOp: string = '/';
	public readonly precedence: OperatorPrecedence = OperatorPrecedence.DIV;
	public readonly lvalue: boolean = false;

	public compile(scope: LexicalScope): ExprCompileResult {
		if (!this.left.value) throw new Error(`Operator '${this.displayOp}' missing left operand`);
		if (!this.right.value) throw new Error(`Operator '${this.displayOp}' missing right operand`);

		const leftResult = this.left.value.compile(scope),
			rightResult = this.right.value.compile(scope);

		this.validateTypes(leftResult.meta.attributes.resolvedType, leftResult.meta.attributes.resolvedType);
		const integral = leftResult.meta.attributes.resolvedType.integral && rightResult.meta.attributes.resolvedType.integral;

		const result = {
			code: `${integral ? `static_cast<double>(${leftResult.code})` : parenthesize(leftResult, this.precedence)} ${this.codeOp} ${parenthesize(
				rightResult,
				this.precedence
			)}`,
			meta: {
				requires: union(leftResult.meta.requires, rightResult.meta.requires),
				precedence: this.precedence,
				checks:
					OPERATOR_ASSOCIATIVITY[this.precedence] === Associativity.LTR
						? leftResult.meta.checks.concat(rightResult.meta.checks)
						: rightResult.meta.checks.concat(leftResult.meta.checks),
				attributes: {
					lvalue: false,
					// TODO: rework this to consider whether operands are actually numeric or not
					resolvedType: resolveNumerics(leftResult.meta.attributes.resolvedType, rightResult.meta.attributes.resolvedType)
				}
			}
		};

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

	public validateTypes(left: DataType, right: DataType): void {
		if (!left.numeric || !right.numeric) throw new Error("Operator '\u00F7' requires both operands to be numeric");
	}
}


import {
	AdditionValue,
	AndPredicate,
	BinOpPredicate,
	BinOpValue,
	ChainBlock,
	ChainBranchBlock,
	DivisionValue,
	EqualityPredicate,
	ForIndexRefValue,
	GTEPredicate,
	GTPredicate,
	IfBlock,
	IfElseBlock,
	LiteralValue,
	LTEPredicate,
	LTPredicate,
	ModulusValue,
	MultiplicationValue,
	NotPredicate,
	OrPredicate,
	Predicate,
	SubtractionValue,
	Value,
	VariableBlock,
	VariableRefValue
} from '$lib/editor';
import { UnOpPredicate } from '$lib/editor/blocks/classes/UnOpPredicate';
import type { Engine } from '$lib/engine/Engine';
import { DataType } from '$lib/utils/DataType';
import {
	AddExpr,
	AndExpr,
	DivExpr,
	EQExpr,
	FalseExpr,
	GTExpr,
	LTExpr,
	MExpr,
	MultExpr,
	NegExpr,
	OrExpr,
	RemExpr,
	SubExpr,
	TrueExpr,
	ValExpr
} from './math/expr';
import { ExprSet, IntersectionSet, IntervalSet, MSet, UnionSet, ValSet } from './math/sets';

export function analyze(block: ChainBlock, from: ChainBlock | null, engine: Engine): Record<string, MExpr> {
	if (block instanceof ChainBranchBlock) {
		if (block.parent) {
			const parent = analyze(block.parent, block, engine);

			if (block instanceof VariableBlock) {
				parent[block.name] = new TrueExpr();
			} else if (block instanceof IfBlock) {
				if (from === block.affChild) {
					applyAffCondition(block.condition.value, parent);
				} else {
					applyNegCondition(block.condition.value, parent);
				}
			} else if (block instanceof IfElseBlock) {
				if (from === block.affChild) {
					applyAffCondition(block.condition.value, parent);
				} else if (from === block.negChild) {
					applyNegCondition(block.condition.value, parent);
				} else {
					throw new Error('Disjoint conjunction not implemented');
				}
			}

			return parent;
		} else {
			throw new Error('Block chain has no starting point, and so will never be executed!');
		}
	} else {
		return Object.fromEntries(engine.hwDevices.map(({ name }) => [name, new TrueExpr()]));
	}
}

export function satisfy(vars: Record<string, number>, constraints: Record<string, MExpr>): Record<string, MSet> {
	// console.log(vars, constraints);

	const substituted = { ...constraints };
	const varVals = Object.fromEntries<MSet | null>(Object.keys(substituted).map((name) => [name, null]));

	Object.entries(vars).forEach(([name, val]) => ((varVals[name] = new ValSet([val])), (substituted[name] = new ValExpr(val))));
	// console.log('substituted', substituted);

	while (true) {
		// substitute in unconstrained variables with universal set for data type
		const roundConstraints = Object.fromEntries(
			Object.entries(substituted).map(([name, constraint]) => [
				name,
				replace(constraint, (expr) =>
					expr instanceof ValExpr && (expr.val instanceof VariableRefValue || expr.val instanceof ForIndexRefValue) && expr.val.master.name !== name
						? // ? ((console.log('substituting', expr, varVals[expr.val.master.name]) ??
						  // 		new ValExpr(varVals[expr.val.master.name] ?? MSet.universal(expr.val.dataType))) as any)
						  new ValExpr(varVals[expr.val.master.name] ?? MSet.universal(expr.val.dataType))
						: expr
				)
			])
		);
		// console.log('round', roundConstraints);

		let simplified = false;

		const wrap = (op: (expr: MExpr) => MExpr | null) => (expr: MExpr) => {
			const result = op(expr);

			if (result) {
				simplified = true;
				return result;
			} else {
				return expr;
			}
		};

		do {
			simplified = false;

			Object.entries(roundConstraints).forEach(([name, expr]) => {
				// arithmetic logic
				roundConstraints[name] = replace(
					expr,
					wrap((expr) => {
						const varExpr = findVar(expr);

						if (varExpr) {
							return null;
						} else {
							const result = simplify(expr);

							return new ValExpr(result).eq(expr) ? null : new ValExpr(result);
						}
					})
				);

				// boolean logic
				roundConstraints[name] = replace(
					roundConstraints[name],
					wrap((expr) => (expr instanceof AndExpr && (expr.left instanceof FalseExpr || expr.right instanceof FalseExpr) ? new FalseExpr() : null))
				);
				roundConstraints[name] = replace(
					roundConstraints[name],
					wrap((expr) => (expr instanceof AndExpr && expr.left instanceof TrueExpr && expr.right instanceof TrueExpr ? new TrueExpr() : null))
				);
				roundConstraints[name] = replace(
					roundConstraints[name],
					wrap((expr) => (expr instanceof OrExpr && (expr.left instanceof TrueExpr || expr.right instanceof TrueExpr) ? new TrueExpr() : null))
				);
				roundConstraints[name] = replace(
					roundConstraints[name],
					wrap((expr) => (expr instanceof OrExpr && expr.left instanceof FalseExpr && expr.right instanceof FalseExpr ? new FalseExpr() : null))
				);
			});
		} while (simplified);
		// console.log('done simplified');
		// if (Math.random() < 0.25) throw '';

		const constrainedValues = Object.fromEntries(
			Object.entries(roundConstraints).map(([name, expr]) => {
				if (expr instanceof MExpr) {
					// console.log('expr', expr);
					const varExpr = findVar(expr);
					const ref = varExpr && (varExpr.val as VariableRefValue | ForIndexRefValue);

					if (expr instanceof GTExpr) {
						if (varExpr && (varExpr === expr.left || varExpr === expr.right)) {
							return [name, reduceExpr(expr)];
						} else if (!varExpr) {
							if (expr.left instanceof ValExpr && expr.right instanceof ValExpr) {
								expr = expr.left.val > expr.right.val ? new TrueExpr() : new FalseExpr();
							} else {
								expr = new FalseExpr();
							}
						}
					}

					if (expr instanceof AndExpr)
						return [name, reduceSet(new IntersectionSet(collate(expr, AndExpr).map((expr) => reduceExpr(expr))), ref.dataType)];
					if (expr instanceof OrExpr) return [name, reduceSet(new UnionSet(collate(expr, OrExpr).map((expr) => reduceExpr(expr))), ref.dataType)];
					if (expr instanceof TrueExpr) return [name, MSet.universal(ref.dataType)];
					if (expr instanceof FalseExpr) return [name, MSet.empty()];
					if (expr instanceof ValExpr) return [name, expr.val instanceof MSet ? expr.val : new ValSet([expr.val])];
					else return [name, new ExprSet(expr)];
				} else {
					return [name, expr];
				}
			})
		);

		// console.log('reduced', constrainedValues);

		let narrowed = false;
		for (const name in constrainedValues) {
			if (!constrainedValues[name].eq(varVals[name])) {
				varVals[name] = constrainedValues[name];
				narrowed = true;
			}
		}

		if (!narrowed) return constrainedValues;
	}
}

export function applyAffCondition(pred: Predicate, vals: Record<string, MExpr>): void {
	const constrainedVars = pred.reduceChain<(VariableRefValue | ForIndexRefValue)[]>(
		(list, block) => ((block instanceof VariableRefValue || block instanceof ForIndexRefValue) && !list.includes(block) ? [...list, block] : list),
		[]
	);

	constrainedVars.forEach((ref) =>
		vals[ref.master.name] instanceof TrueExpr
			? (vals[ref.master.name] = composeExpr(pred))
			: (vals[ref.master.name] = new AndExpr(vals[ref.master.name], composeExpr(pred)))
	);
}

export function applyNegCondition(pred: Predicate, vals: Record<string, MExpr>): void {
	const constrainedVars = pred.reduceChain<(VariableRefValue | ForIndexRefValue)[]>(
		(list, block) => ((block instanceof VariableRefValue || block instanceof ForIndexRefValue) && !list.includes(block) ? [...list, block] : list),
		[]
	);

	constrainedVars.forEach((ref) =>
		vals[ref.master.name] instanceof TrueExpr
			? (vals[ref.master.name] = new NegExpr(composeExpr(pred)))
			: (vals[ref.master.name] = new NegExpr(new AndExpr(vals[ref.master.name], composeExpr(pred))))
	);
}

export function composeExpr(expr: Predicate | Value): MExpr {
	if (expr instanceof BinOpPredicate) {
		const left = composeExpr(expr.left.value),
			right = composeExpr(expr.right.value);

		if (expr instanceof AndPredicate) {
			return new AndExpr(left, right);
		} else if (expr instanceof EqualityPredicate) {
			return new EQExpr(left, right);
		} else if (expr instanceof GTPredicate) {
			return new GTExpr(left, right);
		} else if (expr instanceof GTEPredicate) {
			return new OrExpr(new GTExpr(left, right), new EQExpr(left, right));
		} else if (expr instanceof LTPredicate) {
			return new LTExpr(left, right);
		} else if (expr instanceof LTEPredicate) {
			return new OrExpr(new LTExpr(left, right), new EQExpr(left, right));
		} else if (expr instanceof OrPredicate) {
			return new OrExpr(left, right);
		} else {
			console.error(expr);
			throw new Error('Unrecognized binary predicate operator');
		}
	} else if (expr instanceof UnOpPredicate) {
		const val = composeExpr(expr.operand.value);

		if (expr instanceof NotPredicate) {
			return new NegExpr(val);
		} else {
			console.error(expr);
			throw new Error('Unrecognized unary predicate operator');
		}
	} else if (expr instanceof BinOpValue) {
		const left = composeExpr(expr.left.value),
			right = composeExpr(expr.right.value);

		if (expr instanceof AdditionValue) {
			return new AddExpr(left, right);
		} else if (expr instanceof DivisionValue) {
			return new DivExpr(left, right);
		} else if (expr instanceof ModulusValue) {
			return new RemExpr(left, right);
		} else if (expr instanceof MultiplicationValue) {
			return new MultExpr(left, right);
		} else if (expr instanceof SubtractionValue) {
			return new SubExpr(left, right);
		} else {
			console.error(expr);
			throw new Error('Unrecognized binary predicate operator');
		}
	} else if (expr instanceof LiteralValue) {
		return new ValExpr(expr.value);
	} else if (expr instanceof VariableRefValue || expr instanceof ForIndexRefValue) {
		return new ValExpr(expr);
	} else {
		console.error(expr);
		throw new Error('Unrecognized predicate/value type');
	}
}

export function replace(expr: MExpr, op: (expr: MExpr) => MExpr): MExpr {
	if (expr instanceof ValExpr) return op(expr);
	else if (expr instanceof TrueExpr || expr instanceof FalseExpr) return expr;
	else if (expr instanceof NegExpr) return new NegExpr(replace(expr.expr, op));
	else if (expr instanceof AndExpr) return new AndExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof OrExpr) return new OrExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof EQExpr) return new EQExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof LTExpr) return new LTExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof GTExpr) return new GTExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof AddExpr) return new AddExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof SubExpr) return new SubExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof MultExpr) return new MultExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof DivExpr) return new DivExpr(replace(expr.left, op), replace(expr.right, op));
	else if (expr instanceof RemExpr) return new RemExpr(replace(expr.left, op), replace(expr.right, op));
	else {
		console.error(expr);
		throw new Error('Unrecognized expr type when executing replace operation');
	}
}

export function findVar(expr: MExpr): ValExpr | null {
	if (expr instanceof ValExpr) return expr.val instanceof VariableRefValue || expr.val instanceof ForIndexRefValue ? expr : null;
	else if (expr instanceof TrueExpr || expr instanceof FalseExpr) return null;
	else if (expr instanceof NegExpr) return findVar(expr.expr);
	else if (expr instanceof AndExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof OrExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof EQExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof LTExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof GTExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof AddExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof SubExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof MultExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof DivExpr) return findVar(expr.left) ?? findVar(expr.right);
	else if (expr instanceof RemExpr) return findVar(expr.left) ?? findVar(expr.right);
	else {
		console.error(expr);
		throw new Error('Unrecognized expr type when finding vars');
	}
}

// requires findVar(expr) to return null
export function simplify(expr: MExpr): MSet {
	if (expr instanceof ValExpr) {
		if (expr.val instanceof MSet) return expr.val;
		else return new ValSet([expr.val]);
	} else if (expr instanceof AddExpr) {
		const left = simplify(expr.left),
			right = simplify(expr.right);

		return MSet.cross(left, right, (a, b) => a + b, DataType.PRIMITIVES.DOUBLE);
	} else if (expr instanceof SubExpr) {
		const left = simplify(expr.left),
			right = simplify(expr.right);

		return MSet.cross(left, right, (a, b) => a - b, DataType.PRIMITIVES.DOUBLE);
	} else {
		console.error(expr);
		throw new Error('Unrecognized expr type when simplifying');
	}
}

// requires findVar(expr) to be either expr.left or expr.right and expr to be an arithmetic comparison
export function reduceExpr(expr: MExpr): MSet {
	// console.log('reducing', expr, 'var', findVar(expr));

	const varExpr = findVar(expr)!;
	const ref = varExpr.val as VariableRefValue | ForIndexRefValue;

	if (expr instanceof GTExpr) {
		if (varExpr === expr.left) {
			if (expr.right instanceof ValExpr) {
				if (expr.right.val instanceof MSet) {
					return new IntervalSet(Math.max(...expr.right.val.enumerate(ref.dataType)), Infinity);
				} else {
					return new IntervalSet(expr.right.val, Infinity);
				}
			} else {
				return MSet.universal(ref.dataType);
			}
		} else {
			if (expr.left instanceof ValExpr) {
				if (expr.left.val instanceof MSet) {
					return new IntervalSet(-Infinity, Math.min(...expr.left.val.enumerate(ref.dataType)));
				} else {
					return new IntervalSet(-Infinity, expr.left.val);
				}
			} else {
				return MSet.universal(ref.dataType);
			}
		}
	} else if (expr instanceof LTExpr) {
		if (varExpr === expr.left) {
			if (expr.right instanceof ValExpr) {
				if (expr.right.val instanceof MSet) {
					return new IntervalSet(-Infinity, Math.min(...expr.right.val.enumerate(ref.dataType)));
				} else {
					return new IntervalSet(-Infinity, expr.right.val);
				}
			} else {
				return MSet.universal(ref.dataType);
			}
		} else {
			if (expr.left instanceof ValExpr) {
				if (expr.left.val instanceof MSet) {
					return new IntervalSet(Math.max(...expr.left.val.enumerate(ref.dataType)), Infinity);
				} else {
					return new IntervalSet(expr.left.val, Infinity);
				}
			} else {
				return MSet.universal(ref.dataType);
			}
		}
	} else {
		console.error(expr);
		throw new Error('Unrecognized expr type when reducing');
	}
}

export function reduceSet(set: MSet, domain: DataType): MSet {
	if (set instanceof ValSet) return set;
	if (set instanceof IntersectionSet) {
		if (set.finite(domain)) return new ValSet(set.enumerate(domain));

		if (set.sets.every((set) => set instanceof IntervalSet)) {
			let lo = -Infinity,
				hi = Infinity,
				lox = true,
				hix = true;

			set.sets.forEach((set) => {
				if (set.lo > lo) {
					lo = set.lo;
					lox = set.lox;
				}

				if (set.hi < hi) {
					hi = set.hi;
					hix = set.hix;
				}
			});

			return reduceSet(new IntervalSet(lo, hi, lox, hix), domain);
		}
	}
	if (set instanceof UnionSet) {
		if (set.finite(domain)) return new ValSet(set.enumerate(domain));
	}
	if (set instanceof IntervalSet) {
		if (set.finite(domain)) return new ValSet(set.enumerate(domain));
		else return set;
	}
	if (set instanceof ExprSet) return set;

	throw new Error('Reducing unknown set');
}

export function collate<T extends AndExpr | OrExpr>(expr: MExpr, Expr: abstract new (...args: any) => T): MExpr[] {
	if (expr instanceof Expr) {
		return [...collate(expr.left, Expr), ...collate(expr.right, Expr)];
	} else {
		return [expr];
	}
}


import { DataType } from '$lib/utils/DataType';
import { AndExpr, EQExpr, GTExpr, LTExpr, OrExpr, ValExpr, type MExpr } from './expr';

export abstract class MSet {
	public static universal(type: DataType): UniversalSet {
		return new UniversalSet(type);
	}

	public static empty(): EmptySet {
		return new EmptySet();
	}

	public static intersection(...sets: MSet[]): IntersectionSet {
		return new IntersectionSet(sets);
	}

	public static union(...sets: MSet[]): UnionSet {
		return new UnionSet(sets);
	}

	public static cross(a: MSet, b: MSet, op: (a: any, b: any) => any, domain: DataType): MSet {
		const out = [];

		a.enumerate(domain).forEach((a) =>
			b.enumerate(domain).forEach((b) => {
				const result = op(a, b);

				if (!out.includes(result)) out.push(result);
			})
		);

		return new ValSet(out);
	}

	public abstract eq(other: MSet): boolean;

	public abstract finite(domain: DataType): boolean;

	public abstract enumerate(domain: DataType): any[];
}

export class UniversalSet extends MSet {
	public constructor(public readonly type: DataType) {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof UniversalSet && other.type === this.type;
	}

	public finite(): boolean {
		return false;
	}

	public enumerate(): any[] {
		throw new Error('Enumerating infinite set');
	}
}

export class EmptySet extends MSet {
	public constructor() {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof EmptySet;
	}

	public finite(): boolean {
		return true;
	}

	public enumerate(): any[] {
		return [];
	}
}

export class IntersectionSet extends MSet {
	public constructor(public readonly sets: MSet[]) {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof IntersectionSet && this.sets.length === other.sets.length && this.sets.every((set, i) => set.eq(other.sets[i]));
	}

	public finite(domain: DataType): boolean {
		return this.sets.some((set) => set.finite(domain));
	}

	public enumerate(domain: DataType): any[] {
		if (!this.finite(domain)) throw new Error('Enumerating infinite intersection');

		const finite = this.sets.filter((set) => set.finite(domain));

		return finite[0].enumerate(domain).filter((val) => finite.slice(1).every((set) => set.enumerate(domain).includes(val)));
	}
}

export class UnionSet extends MSet {
	public constructor(public readonly sets: MSet[]) {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof UnionSet && this.sets.length === other.sets.length && this.sets.every((set, i) => set.eq(other.sets[i]));
	}

	public finite(domain: DataType): boolean {
		return this.sets.every((set) => set.finite(domain));
	}

	public enumerate(domain: DataType): any[] {
		if (!this.finite(domain)) throw new Error('Enumerating infinite intersection');

		const out = [];
		this.sets.forEach((set) =>
			set.enumerate(domain).forEach((val) => {
				if (!out.includes(val)) out.push(val);
			})
		);

		return out;
	}
}

export class ExprSet extends MSet {
	public constructor(public readonly expr: MExpr, public readonly subVal: MExpr | null = null) {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof ExprSet && this.expr.eq(other.expr);
	}

	// TODO: refine these
	public finite(_: DataType): boolean {
		return false;
	}

	public enumerate(_: DataType): any[] {
		throw new Error('Enumerating infinite set');
	}
}

export class ValSet extends MSet {
	public constructor(public readonly vals: any[]) {
		super();
	}

	public eq(other: MSet): boolean {
		return other instanceof ValSet && this.vals.length === other.vals.length && this.vals.every((val, i) => val === other.vals[i]);
	}

	public finite(): boolean {
		return true;
	}

	public enumerate(): any[] {
		return this.vals;
	}
}

export class IntervalSet extends ExprSet {
	public constructor(public readonly lo: number, public readonly hi: number, public readonly lox: boolean = true, public readonly hix: boolean = true) {
		const val = new ValExpr(null);
		super(
			new AndExpr(
				lox ? new GTExpr(val, new ValExpr(lo)) : new OrExpr(new GTExpr(val, new ValExpr(lo)), new EQExpr(val, new ValExpr(lo))),
				hix ? new LTExpr(val, new ValExpr(hi)) : new OrExpr(new LTExpr(val, new ValExpr(hi)), new EQExpr(val, new ValExpr(hi)))
			),
			val
		);
	}

	public finite(domain: DataType): boolean {
		return domain.integral && this.lo !== -Infinity && this.hi !== Infinity;
	}

	public enumerate(domain: DataType): any[] {
		if (!this.finite(domain)) throw new Error('Enumerating infinite interval');

		const result = [];
		for (let i = this.lox ? this.lo + 1 : this.lo; i < (this.hix ? this.hi : this.hi + 1); i++) {
			result.push(i);
		}

		return result;
	}
}


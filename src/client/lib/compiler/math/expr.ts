export abstract class MExpr {
	public abstract eq(other: MExpr): boolean;
}

export class ValExpr extends MExpr {
	public constructor(public readonly val: any) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof ValExpr && this.val === other.val;
	}
}

export class TrueExpr extends ValExpr {
	public constructor() {
		super(true);
	}

	public eq(other: MExpr): boolean {
		return other instanceof TrueExpr;
	}
}

export class FalseExpr extends ValExpr {
	public constructor() {
		super(false);
	}

	public eq(other: MExpr): boolean {
		return other instanceof FalseExpr;
	}
}

export class NegExpr extends MExpr {
	public constructor(public readonly expr: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof NegExpr && this.expr.eq(other.expr);
	}
}

export class AndExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof AndExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class OrExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof OrExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class EQExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof EQExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class LTExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof LTExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class GTExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof GTExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class AddExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof AddExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class SubExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof SubExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class MultExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof MultExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class DivExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof DivExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}

export class RemExpr extends MExpr {
	public constructor(public readonly left: MExpr, public readonly right: MExpr) {
		super();
	}

	public eq(other: MExpr): boolean {
		return other instanceof RemExpr && this.left.eq(other.left) && this.right.eq(other.right);
	}
}


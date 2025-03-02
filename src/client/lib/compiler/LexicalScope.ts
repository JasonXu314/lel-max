import type { Block, Typed, Value } from '$lib/editor';

export interface Declarator<D extends Block, R extends SymbolRef<D>> extends Block, Typed {
	refs: Set<R>;
}

export interface SymbolRef<D extends Block> extends Value {
	master: D;
}

export interface VarEntry<D extends Declarator<any, any>> {
	block: D;
	scope: LexicalScope;
}

export class LexicalScope {
	public readonly registry: Map<Declarator<any, any>, VarEntry<Declarator<any, any>>>;
	public readonly children: LexicalScope[];

	public constructor(public readonly parent: LexicalScope | null = null) {
		this.registry = new Map();
		this.children = [];

		if (parent) parent.children.push(this);
	}

	public declare<D extends Declarator<D, R>, R extends SymbolRef<D>>(block: D): this {
		this.registry.set(block, { block, scope: this });

		return this;
	}

	public lookup<D extends Declarator<D, R>, R extends SymbolRef<D>>(ref: R): VarEntry<D> | null {
		if (this.registry.has(ref.master)) {
			return this.registry.get(ref.master) as VarEntry<D>;
		} else if (this.parent === null) {
			return null;
		} else {
			return this.parent.lookup(ref);
		}
	}
}


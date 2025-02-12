import type { VariableBlock, VariableRefValue } from '$lib/editor';
import type { RecursiveStringArray } from '$lib/utils/utils';

export interface VarEntry {
	block: VariableBlock;
	scope: LexicalScope;
}

export class LexicalScope {
	public readonly registry: Map<VariableBlock, VarEntry>;
	public readonly children: LexicalScope[];

	private _lns: RecursiveStringArray;

	public constructor(public readonly parent: LexicalScope | null = null) {
		this.registry = new Map();
		this.children = [];

		this._lns = [];

		if (parent) parent.children.push(this);
	}

	public declare(block: VariableBlock): this {
		this.registry.set(block, { block, scope: this });

		return this;
	}

	public lookup(ref: VariableRefValue): VarEntry | null {
		if (this.registry.has(ref.master)) {
			return this.registry.get(ref.master);
		} else if (this.parent === null) {
			return null;
		} else {
			return this.parent.lookup(ref);
		}
	}
}


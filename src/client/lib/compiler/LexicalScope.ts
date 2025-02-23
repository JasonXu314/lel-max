import type { VariableBlock, VariableRefValue } from '$lib/editor';
import type { ForBlock, ForIndexRefValue } from '$lib/editor/blocks/control/For.block';

export interface VarEntry {
	block: VariableBlock | ForBlock;
	scope: LexicalScope;
}

export class LexicalScope {
	public readonly registry: Map<VariableBlock | ForBlock, VarEntry>;
	public readonly children: LexicalScope[];

	public constructor(public readonly parent: LexicalScope | null = null) {
		this.registry = new Map();
		this.children = [];

		if (parent) parent.children.push(this);
	}

	public declare(block: VariableBlock | ForBlock): this {
		this.registry.set(block, { block, scope: this });

		return this;
	}

	public lookup(ref: VariableRefValue | ForIndexRefValue): VarEntry | null {
		if (this.registry.has(ref.master)) {
			return this.registry.get(ref.master);
		} else if (this.parent === null) {
			return null;
		} else {
			return this.parent.lookup(ref);
		}
	}
}


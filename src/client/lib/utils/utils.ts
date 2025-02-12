import { union, type OperatorPrecedence } from '$lib/compiler';
import type { BlockCompileResult, CompileResult, ExprCompileResult } from '$lib/editor';

export type RecursiveStringArray = (string | RecursiveStringArray)[];

export function indent(level: number = 0) {
	return new Array(level).fill('    ').join('');
}

export function lns(src: RecursiveStringArray, level: number = 0): string[] {
	return src.flatMap((part) => (Array.isArray(part) ? lns(part, level + 1) : part)).map((ln) => indent(level) + ln);
}

export function mergeLayers<T>(...layersArr: T[][][]): T[][] {
	const out = layersArr[0];

	if (!out) return [];

	layersArr.slice(1).forEach((layers) =>
		layers.forEach((layer, i) => {
			if (out[i]) {
				out[i] = out[i].concat(layer);
			} else {
				out[i] = layer;
			}
		})
	);

	return out;
}

// TODO: consider associativity of op
export function parenthesize(result: ExprCompileResult, against: OperatorPrecedence): string {
	if (result.meta.precedence <= against) {
		return result.code;
	} else {
		return `(${result.code})`;
	}
}

export function compileDependencies(deps: Iterable<string>): string[] {
	const out = [];

	for (const dep of deps) {
		const match = /^\$lib:(.+)$/.exec(dep);

		if (match) {
			out.push(`#include "lib/${match[1]}.h"`);
		} else {
			out.push(`#include <${dep}>`);
		}
	}

	return out;
}

export function mergeChecks(master: BlockCompileResult, ...fragments: CompileResult[]): BlockCompileResult {
	const newCode = fragments.flatMap((result) => result.meta.checks.flatMap((check) => check.lines));
	const newDeps = union(...fragments.flatMap((result) => result.meta.checks.map((check) => check.meta.requires)));

	master.lines.unshift(...newCode);
	master.meta.requires = master.meta.requires.union(newDeps);

	return master;
}


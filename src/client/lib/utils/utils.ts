import type { OperatorPrecedence } from '$lib/compiler';
import type { ExprCompileResult } from '$lib/editor';

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


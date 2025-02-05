export type RecursiveStringArray = (string | RecursiveStringArray)[];

export function indent(level: number = 0) {
	return new Array(level).fill('    ').join('');
}

export function lns(src: RecursiveStringArray, level: number = 0): string[] {
	return src.flatMap((part) => (Array.isArray(part) ? lns(part, level + 1) : part)).map((ln) => indent(level) + ln);
}


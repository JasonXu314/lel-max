import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';

export const EMPTY_PREDICATE = new PathBuilder(30, 14)
	.begin(new Point(0, 7))
	.line(new Point(10, 0))
	.line(new Point(5, -7))
	.line(new Point(-5, -7))
	.line(new Point(-20, 0))
	.line(new Point(-5, 7))
	.line(new Point(5, 7))
	.build()
	.withParams({});

export const EMPTY_VALUE = new PathBuilder(30, 14)
	.begin(new Point(0, 7))
	.line(new Point(8, 0))
	.arc(7)
	.arc(7)
	.line(new Point(-16, 0))
	.arc(7)
	.arc(7)
	.build()
	.withParams({});


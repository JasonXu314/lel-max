import type { EngineContext } from './EngineContext';
import { MovableGradient } from './MovableGradient';
import type { ResolvedPath } from './MovablePath';
import { Point } from './Point';

interface TextStyles {
	underline: boolean;
	underlineStyle: string | CanvasGradient | CanvasPattern;
	underlineDashed: boolean;
	align: 'center' | 'left' | 'right';
	color: string;
	paddingRight: number;
	paddingLeft: number;
}

interface ShapeStyles {
	dashed: boolean;
}

interface BoundingBox {
	width: number;
	height: number;
}

export class RenderEngine {
	private readonly norm: Point;

	constructor(
		private readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		private readonly canvas: HTMLCanvasElement | OffscreenCanvas
	) {
		context.strokeStyle = 'black';
		context.lineWidth = 1;
		context.textAlign = 'center';
		context.font = '10px sans-serif';

		this.norm = new Point(canvas.width / 2, canvas.height / 2);
	}

	public get raw(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
		return this.context;
	}

	public line(from: Point, to: Point, width = 1, style: string | CanvasGradient | CanvasPattern = 'black') {
		const [fx, fy] = this.spaceToCanvas(from);
		const [tx, ty] = this.spaceToCanvas(to);

		this.context.lineWidth = width;
		this.context.strokeStyle = style;

		this.context.beginPath();
		this.context.moveTo(fx, fy);
		this.context.lineTo(tx, ty);
		this.context.stroke();

		this.context.lineWidth = 1;
		this.context.strokeStyle = 'black';
	}

	public rect(center: Point, width: number, height: number): void {
		const [x, y] = this.norm.add(center.invert('y')).add(new Point(-width / 2, -height / 2));

		this.context.strokeRect(x, y, width, height);
	}

	public fillRect(center: Point, width: number, height: number, fillStyle: string | CanvasGradient): void {
		const [x, y] = this.norm.add(center.invert('y')).add(new Point(-width / 2, -height / 2));

		this.context.fillStyle = fillStyle;

		this.context.fillRect(x, y, width, height);
	}

	public shape(path: Point[], closed = true): void {
		const [sx, sy] = this.spaceToCanvas(path[0]);

		this.context.beginPath();
		this.context.moveTo(sx, sy);

		for (let i = 1; i < path.length; i++) {
			const [x, y] = this.spaceToCanvas(path[i]);
			this.context.lineTo(x, y);
		}

		if (closed) {
			this.context.closePath();
		}

		this.context.stroke();
	}

	public fillShape(path: Point[], style: string | CanvasGradient | CanvasPattern): void {
		const [sx, sy] = this.spaceToCanvas(path[0]);

		this.context.fillStyle = style;

		this.context.beginPath();
		this.context.moveTo(sx, sy);

		for (let i = 1; i < path.length; i++) {
			const [x, y] = this.spaceToCanvas(path[i]);
			this.context.lineTo(x, y);
		}

		this.context.closePath();
		this.context.fill();
	}

	public stroke<T>(path: ResolvedPath<T>, close: boolean = true, width: number = 1, style: string | CanvasGradient | CanvasPattern = 'black'): void {
		this.context.strokeStyle = style;
		this.context.lineWidth = width;

		this.context.stroke(path.move(this.norm.invert('y').add(new Point(-path.width / 2, path.height / 2))).path(close));
	}

	public fill<T>(path: ResolvedPath<T>, style: string | MovableGradient): void {
		this.context.fillStyle = style instanceof MovableGradient ? this.createGradient(style, path.src.offset, path.height) : style;

		this.context.fill(path.move(this.norm.invert('y').add(new Point(-path.width / 2, path.height / 2))).path());
	}

	public pathContains<T>(path: ResolvedPath<T>, pt: Point): boolean {
		const p = path.move(this.norm.invert('y').add(new Point(-path.width / 2, path.height / 2))).path();
		const [x, y] = this.spaceToCanvas(pt);

		return this.context.isPointInPath(p, x, y);
	}

	public arc(start: Point, center: Point, radius: number, angle: number): void {
		const [sx, sy] = this.spaceToCanvas(start);
		const [cx, cy] = this.spaceToCanvas(center);
		const delta = center.subtract(start);
		const startAngle = Math.atan2(delta.x, delta.y) + Math.PI / 2;

		this.context.beginPath();
		this.context.moveTo(sx, sy);

		this.context.arc(cx, cy, radius, startAngle, startAngle + angle);

		this.context.stroke();
	}

	public text(center: Point, text: string, styles: Partial<TextStyles> = {}, box: Partial<BoundingBox> = {}): void {
		const metrics = this.context.measureText(text);

		const measuredWidth = metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft;

		const defaultStyles: TextStyles = {
			underline: false,
			underlineStyle: 'black',
			underlineDashed: false,
			align: 'center',
			color: 'black',
			paddingRight: 0,
			paddingLeft: 0
		};
		const sx = { ...defaultStyles, ...styles };
		const bb = {
			width: measuredWidth + sx.paddingLeft + sx.paddingRight
		};

		if ('width' in box) bb.width = box.width;

		this.context.fillStyle = sx.color;

		let adjusted = center.clone();

		if (styles.align === 'left') {
			adjusted = adjusted.add(new Point(-bb.width / 2 + measuredWidth / 2 + sx.paddingLeft, 0));
		} else if (styles.align === 'right') {
			adjusted = adjusted.add(new Point(bb.width / 2 - measuredWidth / 2 - sx.paddingRight, 0));
		}

		const [x, y] = this.spaceToCanvas(adjusted).add(new Point(0, 10 / 3));

		this.context.fillText(text, x, y);

		if (sx.underline) {
			this.context.strokeStyle = sx.underlineStyle;
			if (sx.underlineDashed) {
				this.context.setLineDash([3, 2]);
			}

			this.context.beginPath();
			this.context.moveTo(x - metrics.actualBoundingBoxLeft, y + (metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent));
			this.context.lineTo(x + metrics.actualBoundingBoxRight, y + (metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent));
			this.context.stroke();

			this.context.strokeStyle = 'black';
			this.context.setLineDash([]);
		}
	}

	public circle(center: Point, radius: number, style: string | CanvasGradient | CanvasPattern): void {
		const [x, y] = this.spaceToCanvas(center);

		this.context.strokeStyle = style;

		this.context.beginPath();
		this.context.arc(x, y, radius, 0, Math.PI * 2);
		this.context.stroke();

		this.context.strokeStyle = 'black';
	}

	public fillCircle(center: Point, radius: number, fillStyle: string | CanvasGradient | CanvasPattern): void {
		const [x, y] = this.spaceToCanvas(center);

		this.context.fillStyle = fillStyle;

		this.context.beginPath();
		this.context.arc(x, y, radius, 0, Math.PI * 2);
		this.context.fill();
	}

	public ellipse(center: Point, xRadius: number, yRadius: number, styles: Partial<ShapeStyles> = {}): void {
		const [x, y] = this.spaceToCanvas(center);

		const defaultStyles: ShapeStyles = {
			dashed: false
		};
		const sx = { ...defaultStyles, ...styles };

		this.context.strokeStyle = 'black';
		if (sx.dashed) {
			this.context.setLineDash([3, 2]);
		}

		this.context.beginPath();
		this.context.ellipse(x, y, xRadius, yRadius, 0, 0, 2 * Math.PI);
		this.context.stroke();

		this.context.strokeStyle = 'black';
		this.context.setLineDash([]);
	}

	public fillEllipse(center: Point, xRadius: number, yRadius: number, fillStyle: string | CanvasGradient): void {
		const [x, y] = this.spaceToCanvas(center);

		this.context.fillStyle = fillStyle;

		this.context.beginPath();
		this.context.ellipse(x, y, xRadius, yRadius, 0, 0, 2 * Math.PI);
		this.context.fill();
	}

	public createGradient(gradient: MovableGradient, center: Point, height: number): CanvasGradient {
		const [sx, sy] = this.canvasToSpace(center.add(new Point(0, height / 2)));
		const [ex, ey] = this.canvasToSpace(center.add(new Point(0, -height / 2)));

		const grad = this.context.createLinearGradient(sx, sy, ex, ey);

		gradient.print(grad);

		return grad;
	}

	public print(context: EngineContext): void {
		const [dx, dy] = this.spaceToCanvas(context.position.add(new Point(-context.width / 2, context.height / 2)));

		this.context.drawImage(context.canvas, dx, dy, context.width, context.height, dx, dy, context.width, context.height);
	}

	public measure(text: string): TextMetrics {
		return this.context.measureText(text);
	}

	public measureWidth(text: string): number {
		const { actualBoundingBoxLeft, actualBoundingBoxRight } = this.measure(text);

		return actualBoundingBoxLeft + actualBoundingBoxRight;
	}

	public spaceToCanvas(point: Point): Point {
		return this.norm.add(point.invert('y'));
	}

	public canvasToSpace(point: Point): Point {
		return point.invert('y').add(this.norm.invert('x'));
	}
}


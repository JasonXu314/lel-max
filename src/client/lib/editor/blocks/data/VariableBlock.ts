import { Block } from '$lib/editor/Block';
import type { Engine } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';

export class VariableBlock extends Block {
	public child: Block | null;
	public name: string;

	private _parent: Block | null;
	private _ref: VariableRefPill;

	public constructor() {
		super();

		this.child = null;
		this.name = 'var_name';
		this._parent = null;

		// this.topShade = new PathBuilder(200, 40 + Math.sqrt(3) * 4)
		// 	.begin(new Point(-100, 20 - 4))
		// 	.lineToCorner(new Point(-100, 19))
		// 	.notchAt(this.notch)
		// 	.lineToCorner(new Point(100, 19))
		// 	.build();
		// this.botShade = new PathBuilder(200, 40 + Math.sqrt(3) * 4)
		// 	.begin(new Point(100, -20 + 4))
		// 	.lineToCorner(new Point(100, -19))
		// 	.nubAt(this.nubs[0])
		// 	.lineToCorner(new Point(-100, -19))
		// 	.build();
	}

	public get notch(): Point | null {
		return new Point(-this._width() / 2 + 15, 10);
	}

	public get nubs(): Point[] {
		return [new Point(-this._width() / 2 + 15, -10)];
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.refDetached();
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down) {
			this.position = this.position.add(metadata.mouse.delta);
			this._ref.position = this._ref.position.add(metadata.mouse.delta);

			if (this._parent) {
				this._parent.disown(this);
				this._parent = null;
			}

			if (this.child) this.child.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;
			this._ref.position = this._ref.position.add(delta);

			this._parent = metadata.snappingTo.block;
			this._parent.adopt(this);

			if (this.child) this.child.drag(delta);
		}
	}

	public render(metadata: Metadata): void {
		const shape = this._shape();

		if (metadata.snappingTo && metadata.mouse?.down) {
			const snapPos = metadata.snappingTo.nub.subtract(this.notch);

			this.renderEngine.stroke(shape.move(snapPos));
		}

		this.renderEngine.fill(shape.move(this.position), '#FF8C1A');
		this.renderEngine.stroke(shape.move(this.position), true, 0.5, 'black');
		this.renderEngine.text(this.position, 'Var', { align: 'left', paddingLeft: 6, color: 'white' }, shape);

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape.move(this.position), true, 4, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public adopt(other: Block): void {
		this.child = other;
	}

	public disown(): void {
		this.child = null;
	}

	public drag(delta: Point): void {
		super.drag(delta);
		this._ref.position = this._ref.position.add(delta);

		if (this.child) this.child.drag(delta);
	}

	public snap(other: Block): Point | null {
		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}

	public refDetached(): void {
		const newRef = new VariableRefPill(this);

		newRef.position = this.position.add(new Point(10, 0));

		this.engine.add(newRef, 1);
		this._ref = newRef;
	}

	public selectedBy(point: Point): boolean {
		const shape = this._shape();

		return this.renderEngine.pathContains(shape.move(this.position), point);
	}

	private _shape(): MovablePath {
		const width = this._width();

		return new PathBuilder(width, 20 + Math.sqrt(3) * 2)
			.begin(new Point(0, 10))
			.lineToCorner(new Point(width / 2, 10))
			.lineToCorner(new Point(width / 2, -10))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-width / 2, -10))
			.lineToCorner(new Point(-width / 2, 10))
			.notchAt(this.notch)
			.build();
	}

	private _width(): number {
		const metrics = this.renderEngine.measure(this.name);
		return metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8 + 40;
	}
}

export class VariableRefPill extends Block {
	private _attached: boolean;

	public constructor(public readonly master: VariableBlock) {
		super();

		this._attached = true;
	}

	public get notch(): Point | null {
		return null;
	}

	public get nubs(): Point[] {
		return [];
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this._attached) {
				this.master.refDetached();
				this._attached = false;
			}
		}
	}

	public render(metadata: Metadata): void {
		const shape = this._shape();

		this.renderEngine.fill(shape.move(this.position), '#FF8C1A');
		this.renderEngine.stroke(shape.move(this.position), true, 0.5, 'black');

		this.renderEngine.text(this.position, this.master.name, { color: 'white' }, shape);

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape.move(this.position), true, 2, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public selectedBy(point: Point): boolean {
		const shape = this._shape();

		return this.renderEngine.pathContains(shape.move(this.position), point);
	}

	public snap(): Point | null {
		return null;
	}

	private _shape(): MovablePath {
		const metrics = this.renderEngine.measure(this.master.name);
		const width = metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8;

		// double 8-radius arc of pi/2 to do arc of pi for numerical stability (or possibly because im bad at math lol)
		return new PathBuilder(width, 14)
			.begin(new Point(0, 7))
			.lineTo(new Point(width / 2 - 7, 7))
			.arc(7)
			.arc(7)
			.line(new Point(-(width - 14), 0))
			.arc(7)
			.arc(7)
			.build();
	}
}


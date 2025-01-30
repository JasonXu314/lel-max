import { Block } from '$lib/editor/Block';
import { MouseButton, type Engine } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import type { ChainBlock } from '../classes/ChainBlock';
import { ChainBranchBlock } from '../classes/ChainBranchBlock';
import { Value } from '../classes/Value';
import type { ValueHost } from '../classes/hosts/ValueHost';
import { effectiveHeight } from '../utils';

export class VariableBlock extends ChainBranchBlock {
	public child: ChainBranchBlock | null;
	private _ref: VariableRefValue;
	private _name: string;

	public constructor() {
		super();

		this.parent = null;
		this.child = null;
		this._name = 'var_name';

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
		return new Point(-this.width / 2 + 15, 10);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 15, -10)];
	}

	public get name(): string {
		return this._name;
	}

	public get width(): number {
		const metrics = this.renderEngine.measure(this._name);
		return metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8 + 40;
	}

	public get height(): number {
		return 20;
	}

	public set name(val: string) {
		const widthBefore = this.width;

		this._name = val;

		const widthAfter = this.width;

		this.position = this.position.add(new Point((widthAfter - widthBefore) / 2, 0));
		this._ref.position = this._ref.position.add(new Point((widthAfter - widthBefore) / 2, 0));
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		this.refDetached();
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);
			this._ref.position = this._ref.position.add(metadata.mouse.delta);

			if (this.parent) {
				const parent = this.parent;
				this.parent = null;
				parent.disown(this);
			}

			if (this.child) this.child.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;
			this._ref.position = this._ref.position.add(delta);

			const parent = metadata.snappingTo.block as ChainBlock;
			parent.adopt(this);
			this.parent = parent;

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

	public adopt(other: ChainBranchBlock): void {
		if (this.child) {
			this.child.drag(new Point(0, -other.reduce(effectiveHeight, 0) + 20));
			this.child.parent = null;
			this.disown(this.child);
		}

		this.child = other;

		super.adopt(other);
	}

	public disown(other: Block): void {
		this.child = null;

		super.disown(other);
	}

	public drag(delta: Point): void {
		super.drag(delta);
		this._ref.position = this._ref.position.add(delta);

		if (this.child) this.child.drag(delta);
	}

	public refDetached(): void {
		const newRef = new VariableRefValue(this);

		newRef.position = this.position.add(new Point(10, 0));

		this.engine.add(newRef, 1);
		this._ref = newRef;
	}

	public selectedBy(point: Point): boolean {
		const shape = this._shape();

		return this.renderEngine.pathContains(shape.move(this.position), point);
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.child !== null) this.child.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.child !== null ? this.child.reduce(cb, thisResult) : thisResult;
		} else {
			return thisResult;
		}
	}

	private _shape(): MovablePath {
		const width = this.width;

		return new PathBuilder(width, 20)
			.begin(new Point(0, 10))
			.lineToCorner(new Point(width / 2, 10))
			.lineToCorner(new Point(width / 2, -10))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-width / 2, -10))
			.lineToCorner(new Point(-width / 2, 10))
			.notchAt(this.notch)
			.build();
	}
}

export class VariableRefValue extends Value {
	private _attached: boolean;

	public constructor(public readonly master: VariableBlock) {
		super();

		this.host = null;

		this._attached = true;
	}

	public get width(): number {
		const metrics = this.renderEngine.measure(this.master.name);
		return metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8;
	}

	public get height(): number {
		return 14;
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this._attached) {
				this.master.refDetached();
				this._attached = false;
			}

			if (this.host) {
				this.host.disown(this);
			}
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const slot = this.snapSlot(metadata.snappingTo.block as ValueHost)!;

			metadata.snappingTo.block.adopt(this, slot);
		}
	}

	public render(metadata: Metadata): void {
		const shape = this._shape();

		if (metadata.snappingTo && metadata.mouse?.down) {
			this.renderEngine.stroke(shape.move(metadata.snappingTo.nub));
		}

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

	public delete(): void {
		if (!this._attached) {
			super.delete();
		}
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);
	}

	public reduce<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		return cb(init, this, (arg) => arg);
	}

	private _shape(): MovablePath {
		let width = this.width;

		if (width < 16) width = 16;

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


import { Block } from '$lib/editor/Block';
import { MouseButton } from '$lib/engine/Engine';
import type { Metadata } from '$lib/engine/Entity';
import type { MovablePath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import { EMPTY_PREDICATE } from '../values/utils';

export class IfBlock extends Block {
	public condition: Block | null;
	public affChild: Block | null;
	public negChild: Block | null;
	private _parent: Block | null;
	private _prevHeight: number;

	public constructor() {
		super();

		this.condition = null;
		this.affChild = null;
		this.negChild = null;
		this._parent = null;
	}

	public get notch(): Point | null {
		return new Point(-this.width / 2 + 15, this.height / 2);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 20 + 15, this.height / 2 - 20), new Point(-this.width / 2 + 15, -this.height / 2)];
	}

	public get width(): number {
		if (this.condition !== null) {
			return 0;
		} else {
			return 40 + EMPTY_PREDICATE.width;
		}
	}

	public get height(): number {
		// TODO: instead of double arm, include padding for condition on top arm
		const height = 20 * 2 + (this.affChild === null ? 20 : this.affChild.reduce<number>((height, block) => block.height + height, 20));

		if (this._prevHeight === undefined) {
			this._prevHeight = height;
		} else {
			this.position = this.position.add(new Point(0, -(height - this._prevHeight) / 2));
			if (this.negChild !== null) {
				this.negChild.drag(new Point(0, -(height - this._prevHeight)));
			}

			this._prevHeight = height;
		}

		return height;
	}

	public update(metadata: Metadata): void {
		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT) {
			this.position = this.position.add(metadata.mouse.delta);

			if (this._parent) {
				this._parent.disown(this);
				this._parent = null;
			}

			if (this.affChild) this.affChild.drag(metadata.mouse.delta);
			if (this.negChild) this.negChild.drag(metadata.mouse.delta);
		}

		if (metadata.mouse?.dropped && metadata.snappingTo) {
			const newPos = metadata.snappingTo.nub.subtract(this.notch),
				delta = newPos.subtract(this.position);

			this.position = newPos;

			this._parent = metadata.snappingTo.block;
			this._parent.adopt(this);

			if (this.affChild) this.affChild.drag(delta);
			if (this.negChild) this.negChild.drag(delta);
		}
	}

	public render(metadata: Metadata): void {
		const shape = this._shape();

		if (metadata.snappingTo && metadata.mouse?.down) {
			const snapPos = metadata.snappingTo.nub.subtract(this.notch);

			this.renderEngine.stroke(shape.move(snapPos));
		}

		this.renderEngine.fill(shape.move(this.position), '#FFBF00');
		this.renderEngine.stroke(shape.move(this.position), true, 0.5, 'black');

		this.renderEngine.text(this.position.add(new Point(5, this.height / 2 - 10)), 'If', { align: 'left', color: 'white' }, shape);
		this.renderEngine.text(this.position.add(new Point(5, 0)), '➡️', { align: 'left', color: 'white' }, shape);
		this.renderEngine.text(this.position.add(new Point(5, -this.height / 2 + 10)), 'Else', { align: 'left', color: 'white' }, shape);

		if (this.condition === null) {
			this.renderEngine.fill(EMPTY_PREDICATE.move(this.position.add(new Point(0, this.height / 2 - 10))), '#D9A200');
		}

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape.move(this.position), true, 4, 'rgba(200, 200, 255, 0.75)');
		}
	}

	public adopt(other: Block): void {
		const nub = other.snap(this)!;

		if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
			this.affChild = other;
		} else {
			this.negChild = other;
		}
	}

	public disown(other: Block): void {
		// TODO: consider making these single-line ifs
		if (this.affChild === other) {
			this.affChild = null;
		} else if (this.negChild === other) {
			this.negChild = null;
		} else {
			console.error(other);
			throw new Error('If block disowning non-child');
		}
	}

	public drag(delta: Point): void {
		super.drag(delta);

		if (this.affChild) this.affChild.drag(delta);
		if (this.negChild) this.negChild.drag(delta);
	}

	public snap(other: Block): Point | null {
		const notch = this.position.add(this.notch);
		const nubs = other.nubs.map((nub) => other.position.add(nub));

		return nubs.find((nub) => nub.distanceTo(notch) < 20) ?? null;
	}

	public selectedBy(point: Point): boolean {
		const shape = this._shape();

		return this.renderEngine.pathContains(shape.move(this.position), point);
	}

	public traverse(cb: (block: Block) => void): void {
		cb(this);

		if (this.affChild !== null) this.affChild.traverse(cb);
		if (this.negChild !== null) this.negChild.traverse(cb);
	}

	public reduce<T>(cb: (prev: T, block: Block) => T, init: T): T {
		return cb(this.negChild !== null ? this.negChild.reduce(cb, this.affChild !== null ? this.affChild.reduce(cb, init) : init) : init, this);
	}

	private _shape(): MovablePath {
		const width = this.width,
			height = this.height;

		return new PathBuilder(width, height)
			.begin(new Point(0, height / 2))
			.lineToCorner(new Point(width / 2, height / 2))
			.lineToCorner(new Point(width / 2, height / 2 - 20))
			.nubAt(this.nubs[0])
			.lineToCorner(new Point(-width / 2 + 20, height / 2 - 20), -Math.PI / 2)
			.lineToCorner(new Point(-width / 2 + 20, -height / 2 + 20), -Math.PI / 2)
			.lineToCorner(new Point(width / 2, -height / 2 + 20))
			.lineToCorner(new Point(width / 2, -height / 2))
			.nubAt(this.nubs[1])
			.lineToCorner(new Point(-width / 2, -height / 2))
			.lineToCorner(new Point(-width / 2, height / 2))
			.notchAt(this.notch)
			.build();
	}
}


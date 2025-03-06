import { Block, BlockSpot, ChainBlock, ChainBranchBlock, SlottableBlock } from '$lib/editor';
import { Engine, MouseButton } from './Engine';
import type { Entity, MouseData } from './Entity';
import { Point } from './Point';
import { RenderEngine } from './RenderEngine';

export class EngineContext {
	public readonly canvas: OffscreenCanvas;
	public readonly ctx: OffscreenCanvasRenderingContext2D;
	public readonly renderer: RenderEngine;
	public readonly entities: Entity[];

	private _forcedSelectedEntity: Entity | null;
	private _selectedEntity: Entity | null;

	public constructor(
		public readonly engine: Engine,
		public readonly position: Point,
		public readonly width: number,
		public readonly height: number,
		public readonly background: string = 'white',
		public readonly displayOnly: boolean = false
	) {
		// TODO: consider modifying normalization code to allow for properly sized canvas
		this.canvas = new OffscreenCanvas(innerWidth, innerHeight * 0.9);
		this.ctx = this.canvas.getContext('2d');
		this.renderer = new RenderEngine(this.ctx, this.canvas);
		this.entities = [];

		this._forcedSelectedEntity = null;
		this._selectedEntity = null;
	}

	public get layers(): Entity[][] {
		const out: Entity[][] = [];

		this.entities.forEach((entity) => {
			if (entity instanceof Block) {
				if (entity instanceof ChainBlock) {
					if (entity instanceof ChainBranchBlock) {
						if (!entity.parent) {
							this._follow(entity, out);
						}
					} else {
						this._follow(entity, out);
					}
				} else if (entity instanceof SlottableBlock) {
					if (!entity.host) {
						this._follow(entity, out);
					}
				}
			} else {
				if (out[0]) {
					out[0].push(entity);
				} else {
					out[0] = [entity];
				}
			}
		});

		return out;
	}

	public get partition(): { selection: Entity[][] | null; layers: Entity[][] } {
		const layers: Entity[][] = [];
		let selection = null;

		this.entities.forEach((entity) => {
			if (entity instanceof Block && entity === this._selectedEntity) {
				selection = [];

				this._follow(entity, selection);
			}

			if (entity instanceof Block) {
				if (entity instanceof ChainBlock) {
					if (entity instanceof ChainBranchBlock) {
						if (!entity.parent) {
							this._follow(entity, layers);
						}
					} else {
						this._follow(entity, layers);
					}
				} else if (entity instanceof SlottableBlock) {
					if (!entity.host) {
						this._follow(entity, layers);
					}
				}
			} else {
				if (layers[0]) {
					layers[0].push(entity);
				} else {
					layers[0] = [entity];
				}
			}
		});

		return { selection, layers };
	}

	public get selectedEntity(): Entity | null {
		return this._selectedEntity;
	}

	public update(mouse: MouseData): void {
		if (
			!this.engine.migrationUnit &&
			(!(this._selectedEntity instanceof Block) || (!(mouse.down && mouse.button === MouseButton.LEFT) && !mouse.dropped))
		) {
			this._updateSelectedEntity(mouse);
		}

		const [snappedBlock, nub] = this.calculateSnapping(mouse);

		const se = this.engine.migrationUnit?.[0][0] ?? this._selectedEntity;
		this.entities.forEach((entity) =>
			entity.update({
				selectedEntity: se,
				mouse,
				snappingTo: snappedBlock !== null && nub !== null && entity === se ? { block: snappedBlock, nub } : null
			})
		);

		// 2-pass update to trigger block alignment before rendering, this update pass
		// should be carefully constructed to be a NOOP in regards to block dragging & selection state
		this.entities.forEach((entity) =>
			entity.update({
				selectedEntity: se,
				mouse: {
					down: mouse.down,
					dropped: false,
					delta: new Point(0, 0),
					button: mouse.button ?? null,
					position: mouse.position?.clone() ?? null
				} as MouseData,
				snappingTo: null
			})
		);
	}

	public render(mouse: MouseData): void {
		const [snappedBlock, nub] = this.calculateSnapping(mouse);

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = this.background;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = 'black';

		const se = this.engine.migrationUnit?.[0][0] ?? this._selectedEntity;
		const { selection, layers } = this.partition;
		layers.forEach((layer) =>
			layer.forEach((entity) =>
				entity.render({
					selectedEntity: se,
					mouse,
					snappingTo: snappedBlock !== null && nub !== null && entity === se ? { block: snappedBlock, nub } : null
				})
			)
		);

		if (selection && mouse.down)
			selection.forEach((layer) =>
				layer.forEach((entity) =>
					entity.render({
						selectedEntity: se,
						mouse,
						snappingTo: snappedBlock !== null && nub !== null && entity === se ? { block: snappedBlock, nub } : null
					})
				)
			);
	}

	public add(entity: Entity): void {
		this.entities.push(entity);
		entity.init(this.renderer, this);
	}

	public find<T extends new (...args: any) => unknown>(Block: T): InstanceType<T> | null {
		for (const entity of this.entities) {
			if (entity instanceof Block) return entity as InstanceType<T>;
		}

		return null;
	}

	public remove(entity: Entity): void {
		const idx = this.entities.indexOf(entity);

		if (idx !== -1) {
			this.entities.splice(idx, 1);
		}
	}

	public migrate(entity: Block): void {
		const layers: Block[][] = [];

		this._follow(entity, layers);

		layers.flat().forEach((e) => this.entities.splice(this.entities.indexOf(e), 1));

		if (this._selectedEntity === entity) this._selectedEntity = null;

		this.engine.migrate(layers);
	}

	public encapsulates(entity: Entity): boolean {
		const [px, py] = this.position;
		const [ex, ey] = entity.position;

		return ex >= px - this.width / 2 && ex <= px + this.width / 2 && ey >= py - this.height / 2 && ey <= py + this.height / 2;
	}

	public calculateSnapping(mouse: MouseData): [Block, Point] {
		if (this.displayOnly) return [null, null];

		if (this.engine.migrationUnit && mouse.down && mouse.position) {
			const se = this.engine.migrationUnit[0][0];

			const snappedBlock =
				this.entities
					.filter((e): e is Block => e !== se && e instanceof Block && !!se.snap(e))
					.sort((a, b) => se.snap(a).distanceTo(mouse.position) - se.snap(b).distanceTo(mouse.position))[0] ?? null;
			const nub = (snappedBlock && se.snap(snappedBlock)!) ?? null;

			return [snappedBlock, nub];
		} else if (this._selectedEntity && this._selectedEntity instanceof Block && (mouse.down || mouse.dropped) && mouse.position) {
			const se = this._selectedEntity;

			const snappedBlock =
				this.entities
					.filter((e): e is Block => e !== se && e instanceof Block && !!se.snap(e))
					.sort((a, b) => se.snap(a).distanceTo(mouse.position) - se.snap(b).distanceTo(mouse.position))[0] ?? null;
			const nub = (snappedBlock && se.snap(snappedBlock)!) ?? null;

			return [snappedBlock, nub];
		} else {
			return [null, null];
		}
	}

	public forceSelection(entity: Entity): void {
		this._forcedSelectedEntity = entity;
	}

	private _updateSelectedEntity(mouse: MouseData): void {
		if (this._forcedSelectedEntity) {
			this._selectedEntity = this._forcedSelectedEntity;
			this._forcedSelectedEntity = null;
			return;
		}

		if (mouse.position) {
			for (const layer of this.layers.toReversed()) {
				for (const entity of layer.toReversed()) {
					if (
						entity.selectedBy(mouse.position) &&
						(!this.displayOnly || !(entity instanceof Block) || this.entities.some((e) => e instanceof BlockSpot && entity === e.child))
					) {
						this._selectedEntity = entity;
						return;
					}
				}
			}
		}

		this._selectedEntity = null;
	}

	private _follow(block: Block, into: Entity[][]): void {
		block.traverseByLayer((block, depth) => {
			if (into[depth]) {
				into[depth].push(block);
			} else {
				into[depth] = [block];
			}
		});
	}
}


import { Block } from '$lib/editor/Block';
import type { Entity, MouseData } from './Entity';
import { Point } from './Point';
import { RenderEngine } from './RenderEngine';

interface EngineEvents {
	entityClicked: (entity: Entity, metadata: { button: MouseButton; spacePos: Point; pagePos: Point }) => void;
	entityDblClicked: (entity: Entity) => void;
	click: (evt: MouseEvent) => void;
}

export enum MouseButton {
	LEFT,
	MIDDLE,
	RIGHT,
	BACK,
	FORWARD
}

export class Engine {
	private readonly context: CanvasRenderingContext2D;
	private readonly layers: Entity[][] = [];
	private readonly renderEngine: RenderEngine;

	private _selectedEntity: Entity | null = null;
	private _mousePos: Point | null = null;
	private _mouseDown = false;
	private _dropped = false;
	private _mouseDelta: Point | null = null;
	private _mouseButton: MouseButton | null = null;

	private _listeners: { [K in keyof EngineEvents]: EngineEvents[K][] };

	private mouseListener: (evt: MouseEvent) => void = (evt) => {
		if (this._mousePos) {
			this._mousePos = this.renderEngine.canvasToSpace(new Point(evt.offsetX, evt.offsetY));

			if (this._mouseDelta) {
				this._mouseDelta.x += evt.movementX;
				this._mouseDelta.y -= evt.movementY;
			}
		}
	};

	constructor(private readonly canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');

		if (ctx) {
			this.context = ctx;
			this.renderEngine = new RenderEngine(ctx, canvas);

			this._listeners = { entityClicked: [], click: [], entityDblClicked: [] };

			canvas.addEventListener('mouseout', () => {
				this._mousePos = null;

				canvas.removeEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mouseover', (evt) => {
				this._mousePos = new Point(evt.offsetX, evt.offsetY);

				canvas.addEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mousedown', (evt) => {
				this._mouseDown = true;
				this._dropped = false;
				this._mouseDelta = new Point();
				this._mouseButton = evt.button;
			});

			canvas.addEventListener('mouseup', (evt: MouseEvent) => {
				this._mouseDown = false;
				this._dropped = true;
				this._mouseDelta = null;
				this._mouseButton = null;

				if (this._selectedEntity) {
					for (const listener of this._listeners.entityClicked) {
						listener(this._selectedEntity, {
							button: evt.button,
							spacePos: this._mousePos!,
							pagePos: this.renderEngine.spaceToCanvas(this._mousePos!)
						});
					}
				} else {
					for (const listener of this._listeners.click) {
						listener(evt);
					}
				}
			});

			canvas.addEventListener('dblclick', () => {
				if (this._selectedEntity) {
					for (const listener of this._listeners.entityDblClicked) {
						listener(this._selectedEntity);
					}
				}
			});

			canvas.addEventListener('contextmenu', (evt: MouseEvent) => {
				if (this._selectedEntity) {
					evt.preventDefault();
				}
			});
		} else {
			throw new Error('Unable to get canvas context');
		}
	}

	public add(entity: Entity, layer: number): void {
		while (layer >= this.layers.length) {
			this.layers.push([]);
		}

		this.layers[layer].push(entity);
		entity.init(this.renderEngine, this);
	}

	public remove(entity: Entity, layer?: number): void {
		if (layer === undefined) {
			for (const layer of this.layers) {
				if (layer.includes(entity)) {
					layer.splice(layer.indexOf(entity), 1);
				}
			}
		} else {
			if (!this.layers[layer]) {
				throw new Error(`Layer ${layer} does not exist!`);
			} else if (!this.layers[layer].includes(entity)) {
				throw new Error(`Layer ${layer} does not contain entity!`);
			} else {
				this.layers[layer].splice(this.layers[layer].indexOf(entity), 1);
			}
		}
	}

	public start(): void {
		this._tick();
	}

	public on<T extends keyof EngineEvents>(evt: T, listener: EngineEvents[T]): () => void {
		this._listeners[evt].push(listener);

		return () => {
			this._listeners[evt].splice(this._listeners[evt].indexOf(listener), 1);
		};
	}

	private _tick(): void {
		requestAnimationFrame(() => this._tick());

		if (!this._mouseDown) {
			this._updateSelectedEntity();
		}

		if (this._selectedEntity) {
			this.canvas.style.cursor = 'pointer';
		} else {
			this.canvas.style.cursor = 'unset';
		}

		const snappedBlock =
			((this._selectedEntity &&
				this.layers
					.flat()
					.sort((a, b) => a.position.distanceTo(this._selectedEntity.position) - b.position.distanceTo(this._selectedEntity.position))
					.find((e) => e instanceof Block && this._selectedEntity instanceof Block && this._selectedEntity.snap(e))) as Block | undefined) ?? null;
		const nub = (snappedBlock && (this._selectedEntity as Block).snap(snappedBlock)!) ?? null;

		this.layers.forEach((layer) => {
			layer.forEach((entity) => {
				entity.update({
					selectedEntity: this._selectedEntity,
					mouse: {
						down: this._mouseDown,
						dropped: this._dropped,
						delta: this._mouseDelta,
						button: this._mouseButton,
						position: this._mousePos?.clone() || null
					} as MouseData,
					snappingTo: snappedBlock === null || entity !== this._selectedEntity ? null : { block: snappedBlock, nub }
				});
			});
		});

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'white';
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'black';
		this.layers.forEach((layer) => {
			layer.forEach((entity) => {
				entity.render({
					selectedEntity: this._selectedEntity,
					mouse: {
						down: this._mouseDown,
						dropped: this._dropped,
						delta: this._mouseDelta,
						button: this._mouseButton,
						position: this._mousePos?.clone() || null
					} as MouseData,
					snappingTo: snappedBlock === null || entity !== this._selectedEntity ? null : { block: snappedBlock, nub }
				});
			});
		});

		if (this._mouseDelta) this._mouseDelta = new Point();
		if (this._dropped) this._dropped = false;
	}

	private _updateSelectedEntity(): void {
		if (this._mousePos) {
			const reversedLayers = this.layers.reduce<Entity[][]>((arr, layer) => [layer, ...arr], []);

			for (const layer of reversedLayers) {
				const reversedEntities = layer.reduce<Entity[]>((arr, entity) => [entity, ...arr], []);

				for (const entity of reversedEntities) {
					if (entity.selectedBy(this._mousePos, (label: string) => this.renderEngine.measure(label))) {
						this._selectedEntity = entity;
						return;
					}
				}
			}
		}

		this._selectedEntity = null;
	}
}


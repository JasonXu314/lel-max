import {
	AdditionValue,
	EqualityPredicate,
	GTEPredicate,
	GTPredicate,
	hasInChain,
	IfBlock,
	IfElseBlock,
	LiteralValue,
	LTEPredicate,
	LTPredicate,
	ModulusValue,
	PrintBlock,
	SetVarBlock,
	SubtractionValue,
	VariableBlock,
	WhileBlock
} from '$lib/editor';
import { Block } from '$lib/editor/Block';
import { COLORS } from '$lib/editor/blocks/colors/colors';
import { BlockSpot } from '$lib/editor/blocks/utils/BlockSpot';
import type { Entity, MouseData } from './Entity';
import { Point } from './Point';
import { RenderEngine } from './RenderEngine';
import { TabButton } from './TabButton';
import { BlockPages } from './utils';

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
	private readonly spots: BlockSpot<Block>[][];

	private _selectedEntity: Entity | null = null;
	private _mousePos: Point | null = null;
	private _mouseDown = false;
	private _dropped = false;
	private _mouseDelta: Point | null = null;
	private _mouseButton: MouseButton | null = null;
	private _blockPage: BlockPages = BlockPages.CONTROL;

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

				if (
					this._selectedEntity &&
					!this.layers.some((layer) =>
						layer.some(
							(e) => e instanceof BlockSpot && this._selectedEntity instanceof Block && this._selectedEntity.reduceUp(hasInChain(e.child), false)
						)
					)
				) {
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

		this.spots = [
			[IfBlock, IfElseBlock, WhileBlock],
			[GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate],
			[LiteralValue, VariableBlock, SetVarBlock, AdditionValue, SubtractionValue, ModulusValue],
			[PrintBlock]
		].map((group) => {
			const x = -canvas.width / 2 + 100;
			let y = canvas.height / 2 - 75;

			return group.map((Blk: { EMPTY_HEIGHT: number } & (new () => Block)) => {
				y -= Blk.EMPTY_HEIGHT / 2 + 20;

				const spot = new BlockSpot<InstanceType<typeof Blk>>(Blk, new Point(x, y));

				y -= Blk.EMPTY_HEIGHT / 2;

				spot.init(this.renderEngine, this);

				return spot;
			});
		});

		this.layers[0] = this.spots[BlockPages.CONTROL];

		[
			{ tab: BlockPages.CONTROL, color: COLORS.CONTROL.LIGHT, pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 10), label: 'Control Flow' },
			{ tab: BlockPages.DATA, color: COLORS.DATA.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 10), label: 'Data' },
			{
				tab: BlockPages.CONDITION,
				color: COLORS.CONDITION.LIGHT,
				pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 29),
				label: 'Conditionals'
			},
			{ tab: BlockPages.SYSTEM, color: COLORS.SYSTEM.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 29), label: 'System' }
		].forEach(({ tab, color, pos, label }) => {
			const btn = new TabButton(tab, color, label);
			btn.position = pos;

			this.add(btn, 9);
		});
	}

	public get blockPage(): BlockPages {
		return this._blockPage;
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

	public setPage(page: BlockPages): void {
		this._blockPage = page;
		this.layers[0] = this.spots[page];
	}

	public duplicate(block: Block): void {
		// TODO: enhance this to lock block to cursor till click
		const newBlocks = block.duplicate();

		if (newBlocks.length > 0) {
			const startLayer = this.layers.findIndex((layer) => layer.includes(block));

			newBlocks.forEach((layer, i) => layer.forEach((block) => this.add(block, startLayer + i)));
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

	public enforceHierarchy(a: Entity, b: Entity): void {
		const aLayer = this.layers.findIndex((layer) => layer.includes(a)),
			bLayer = this.layers.findIndex((layer) => layer.includes(b));

		if (aLayer === bLayer) {
			const layer = this.layers[aLayer];

			const aIdx = layer.indexOf(a),
				bIdx = layer.indexOf(b);

			if (aIdx > bIdx) {
				layer.splice(bIdx, 1);
				layer.splice(aIdx, 0, b);
			}
		} else if (aLayer > bLayer) {
			throw new Error('Cannot enforce hierarchy between entities on different layers');
		}
	}

	private _tick(): void {
		requestAnimationFrame(() => this._tick());

		if (!(this._mouseDown && this._mouseButton === MouseButton.LEFT) && !this._dropped) {
			this._updateSelectedEntity();
		}

		if (this._selectedEntity) {
			this.canvas.style.cursor = 'pointer';
		} else {
			this.canvas.style.cursor = 'unset';
		}

		const dummies: Block[] = [];
		(this.spots.filter((group) => group !== this.layers[0]) as BlockSpot<Block>[][]).forEach((group) => group.forEach((e) => dummies.push(e.child)));

		const layers = this.layers.map((layer) => layer.filter((e) => !(e instanceof Block && dummies.some((block) => e.reduceUp(hasInChain(block), false)))));

		let [snappedBlock, nub] = this._calculateSnapping();

		layers.forEach((layer) => {
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

		// 2-pass update to trigger block alignment before rendering, this update pass
		// should be carefully constructed to be a NOOP in regards to block dragging & selection state
		layers.forEach((layer) => {
			layer.forEach((entity) => {
				entity.update({
					selectedEntity: this._selectedEntity,
					mouse: {
						down: this._mouseDown,
						dropped: false,
						delta: new Point(0, 0),
						button: this._mouseButton,
						position: this._mousePos?.clone() || null
					} as MouseData,
					snappingTo: null
				});
			});
		});

		// recalculate snapping because update (responding to mouse movements) may have changed snapping status
		[snappedBlock, nub] = this._calculateSnapping();

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'white';
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'gray';
		this.context.fillRect(0, 0, 200, this.canvas.height);
		this.context.fillStyle = 'black';
		layers.forEach((layer) => {
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

		// dbg crosshairs
		// this.renderEngine.line(new Point(-600, 0), new Point(600, 0));
		// this.renderEngine.line(new Point(0, 400), new Point(0, -400));

		if (this._mouseDelta) this._mouseDelta = new Point();
		if (this._dropped) this._dropped = false;
	}

	private _updateSelectedEntity(): void {
		if (this._mousePos) {
			const dummies = new Set();
			this.layers.forEach((layer) => layer.forEach((e) => e instanceof BlockSpot && dummies.add(e.child)));

			const hiddenDummies: Block[] = [];
			(this.spots.filter((group) => group !== this.layers[0]) as BlockSpot<Block>[][]).forEach((group) =>
				group.forEach((e) => hiddenDummies.push(e.child))
			);
			const layers = this.layers.map((layer) =>
				layer.filter((e) => !(e instanceof Block && hiddenDummies.some((block) => e.reduceUp(hasInChain(block), false))))
			);

			for (const layer of layers.toReversed()) {
				for (const entity of layer.toReversed()) {
					if (
						!(
							entity instanceof Block &&
							entity.reduceUp(
								(result: boolean, block: Block, prune: (arg: boolean) => boolean): boolean =>
									result || (block !== entity && dummies.has(block) ? prune(true) : false),
								false
							)
						) &&
						entity.selectedBy(this._mousePos)
					) {
						this._selectedEntity = entity;
						return;
					}
				}
			}
		}

		this._selectedEntity = null;
	}

	private _calculateSnapping(): [Block, Point] {
		if (this._selectedEntity && this._selectedEntity instanceof Block && (this._mouseDown || this._dropped) && this._mousePos) {
			const se = this._selectedEntity;

			const dummies = new Set<Block>();
			this.spots.forEach((group) => group.forEach((e) => dummies.add(e.child)));

			const snappedBlock =
				this.layers
					.flat()
					.filter((e): e is Block => e !== se && e instanceof Block && !dummies.has(e) && !!se.snap(e))
					.sort((a, b) => se.snap(a).distanceTo(this._mousePos) - se.snap(b).distanceTo(this._mousePos))[0] ?? null;
			const nub = (snappedBlock && se.snap(snappedBlock)!) ?? null;

			return [snappedBlock, nub];
		} else {
			return [null, null];
		}
	}
}


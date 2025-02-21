import {
	AdditionValue,
	EqualityPredicate,
	ForBlock,
	GTEPredicate,
	GTPredicate,
	IfBlock,
	IfElseBlock,
	InputBlock,
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
import { EngineContext } from './EngineContext';
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
	// tuple [spawner pane, editor pane] (turn to array if allow dynamic paning, but keep element 0 as spawner pane)
	private readonly activePanes: [EngineContext, EngineContext];
	private readonly editorPanes: EngineContext[];
	private readonly spawnPanes: EngineContext[];
	private readonly renderEngine: RenderEngine;

	private _mousePos: Point | null = null;
	private _mouseDown = false;
	private _dropped = false;
	private _mouseDelta: Point | null = null;
	private _mouseButton: MouseButton | null = null;
	private _blockPage: BlockPages = BlockPages.CONTROL;
	private _migrationUnit: Block[][] | null = null;

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

				const se =
					this.activePanes[1].selectedEntity ??
					(this.activePanes[0].selectedEntity instanceof TabButton ? this.activePanes[0].selectedEntity : null);

				if (se) {
					for (const listener of this._listeners.entityClicked) {
						listener(se, {
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
				if (this.activePanes[1].selectedEntity) {
					for (const listener of this._listeners.entityDblClicked) {
						listener(this.activePanes[1].selectedEntity);
					}
				}
			});

			canvas.addEventListener('contextmenu', (evt: MouseEvent) => {
				if (this.activePanes[1].selectedEntity) {
					evt.preventDefault();
				}
			});
		} else {
			throw new Error('Unable to get canvas context');
		}

		this.editorPanes = [new EngineContext(this, new Point(100, 0), canvas.width - 200, canvas.height)];

		const spawnPanePos = new Point(-canvas.width / 2 + 100, 0);
		this.spawnPanes = [
			[IfBlock, IfElseBlock, WhileBlock, ForBlock],
			[GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate],
			[LiteralValue, VariableBlock, SetVarBlock, AdditionValue, SubtractionValue, ModulusValue],
			[PrintBlock, InputBlock]
		].map((group) => {
			const ctx = new EngineContext(this, spawnPanePos.clone(), 200, canvas.height, 'gray', true);

			[
				{
					tab: BlockPages.CONTROL,
					color: COLORS.CONTROL.LIGHT,
					pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 10),
					label: 'Control Flow'
				},
				{ tab: BlockPages.DATA, color: COLORS.DATA.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 10), label: 'Data' },
				{
					tab: BlockPages.CONDITION,
					color: COLORS.CONDITION.LIGHT,
					pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 29),
					label: 'Conditionals'
				},
				{ tab: BlockPages.SYSTEM, color: COLORS.SYSTEM.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 29), label: 'System' }
			].forEach(({ tab, color, pos, label }) => {
				const btn = new TabButton(tab, color, label, this);
				btn.position = pos;

				ctx.add(btn);
			});

			const x = -canvas.width / 2 + 100;
			let y = canvas.height / 2 - 75;

			group.forEach((Blk: { EMPTY_HEIGHT: number } & (new () => Block)) => {
				y -= Blk.EMPTY_HEIGHT / 2 + 20;

				const spot = new BlockSpot<InstanceType<typeof Blk>>(Blk, new Point(x, y));

				y -= Blk.EMPTY_HEIGHT / 2;

				ctx.add(spot);
			});

			return ctx;
		});

		this.activePanes = [this.spawnPanes[BlockPages.CONTROL], this.editorPanes[0]];
	}

	public get blockPage(): BlockPages {
		return this._blockPage;
	}

	public get migrationUnit(): Block[][] {
		return this._migrationUnit;
	}

	public setPage(page: BlockPages): void {
		this._blockPage = page;
		this.activePanes[0] = this.spawnPanes[page];
	}

	public duplicate(block: Block): void {
		// TODO: enhance this to lock block to cursor till click
		const newBlocks = block.duplicateChain();

		if (newBlocks.length > 0) {
			// TODO: rework Block::duplicate api to return unlayered array of blocks
			newBlocks.forEach((layer) => layer.forEach((b) => block.context.add(b)));
		}
	}

	public migrate(layers: Block[][]): void {
		this._migrationUnit = layers;
		this._migrationUnit.forEach((layer) => layer.forEach((block) => ((block as any).renderEngine = this.renderEngine)));
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

		const mouseData = {
			position: this._mousePos?.clone() ?? null,
			dropped: this._dropped,
			down: this._mouseDown,
			button: this._mouseButton,
			delta: this._mouseDelta
		} as MouseData;

		let [snappedBlock, nub] = this.activePanes[1].calculateSnapping(mouseData);

		if (this._migrationUnit) {
			if (mouseData.dropped) {
				if (this.activePanes[0].encapsulates(this._migrationUnit[0][0])) {
					// destroy blocks if dropped in spawn area
					this._migrationUnit = null;
				} else {
					this._migrationUnit.flat().forEach((block) => this.activePanes[1].add(block));
					this._migrationUnit = null;
				}
			} else {
				// migratory unit must be selected, and root should be first block of first layer
				this._migrationUnit.flat().forEach((block) =>
					block.update({
						selectedEntity: this._migrationUnit[0][0],
						mouse: mouseData,
						snappingTo: snappedBlock !== null && nub !== null ? { block: snappedBlock, nub } : null
					})
				);
			}
		}

		this.activePanes.forEach((ctx) => ctx.update(mouseData));

		[snappedBlock, nub] = this.activePanes[1].calculateSnapping(mouseData);

		if (this._migrationUnit || this.activePanes.some((ctx) => ctx.selectedEntity)) {
			this.canvas.style.cursor = 'pointer';
		} else {
			this.canvas.style.cursor = 'unset';
		}

		this.activePanes.forEach((ctx) => ctx.render(mouseData));
		this.activePanes.forEach((ctx) => this.renderEngine.print(ctx));

		if (this._migrationUnit) {
			// migratory unit must be selected, and root should be first block of first layer
			this._migrationUnit.forEach((layer, i) =>
				layer.forEach((block, j) =>
					block.render({
						selectedEntity: this._migrationUnit[0][0],
						mouse: mouseData,
						snappingTo: snappedBlock !== null && nub !== null && i === 0 && j === 0 ? { block: snappedBlock, nub } : null
					})
				)
			);
		}

		// dbg crosshairs
		// this.renderEngine.line(new Point(-600, 0), new Point(600, 0));
		// this.renderEngine.line(new Point(0, 400), new Point(0, -400));

		if (this._mouseDelta) this._mouseDelta = new Point();
		if (this._dropped) this._dropped = false;
	}
}


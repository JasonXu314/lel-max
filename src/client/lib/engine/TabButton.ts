import { COLORS } from '$lib/editor/blocks/colors/colors';
import { MouseButton, type Engine } from './Engine';
import { Entity, type Metadata } from './Entity';
import type { ResolvedPath } from './MovablePath';
import { PathBuilder } from './PathBuilder';
import { Point } from './Point';
import type { RenderEngine } from './RenderEngine';
import type { BlockPages } from './utils';

export class TabButton extends Entity {
	private readonly shape: ResolvedPath<{}>;

	public constructor(public readonly tab: BlockPages, public readonly color: string, public readonly label: string) {
		super();

		this.shape = new PathBuilder<{}>(80, 14)
			.begin(new Point(0, 7))
			.lineTo(new Point(33, 7))
			.arc(7)
			.arc(7)
			.line(new Point(-66, 0))
			.arc(7)
			.arc(7)
			.build()
			.withParams({});
	}

	public init(renderEngine: RenderEngine, engine: Engine): void {
		super.init(renderEngine, engine);

		engine.on('entityClicked', (entity, meta) => {
			if (entity === this && meta.button === MouseButton.LEFT) {
				engine.setPage(this.tab);
			}
		});
	}

	public update(metadata: Metadata): void {}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);

		if (this.engine.blockPage === this.tab) {
			this.renderEngine.fill(shape, this.color);
		} else {
			this.renderEngine.fill(shape, '#333333');
		}

		this.renderEngine.stroke(shape, true, 1, this.color);
		this.renderEngine.text(this.position, this.label, { align: 'left', paddingLeft: 8, color: 'white' }, this.shape.move(this.position));

		if (metadata.selectedEntity === this) {
			this.renderEngine.stroke(shape, true, 2, COLORS.SPECIAL.HIGHLIGHT);
		}
	}

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}
}


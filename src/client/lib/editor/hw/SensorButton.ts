import type { EngineContext } from '$lib/engine/EngineContext';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { PhantomSensor } from './Sensor';

export class SensorButton extends Entity {
	public readonly shape: ResolvedPath;

	public constructor() {
		super();

		this.shape = new PathBuilder(130, 40)
			.begin(new Point(0, 20))
			.lineToCorner(new Point(65, 20), Math.PI / 2, 10)
			.lineToCorner(new Point(65, -20), Math.PI / 2, 10)
			.lineToCorner(new Point(-65, -20), Math.PI / 2, 10)
			.lineToCorner(new Point(-65, 20), Math.PI / 2, 10)
			.build()
			.withParams({});
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		context.engine.on('entityClicked', (entity) => {
			if (entity === this) {
				context.engine.activePanes[1].add(new PhantomSensor());
			}
		});
	}

	public update(): void {}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);

		if (metadata.selectedEntity === this) {
			this.renderEngine.fill(shape, '#017EC0');
			this.renderEngine.stroke(shape, true, 1, '#003F60');
		} else {
			this.renderEngine.fill(shape, '#0172AD');
			this.renderEngine.stroke(shape, true, 1, '#002E45');
		}

		this.renderEngine.text(this.position, '+ Add Sensor', { color: 'white', fontSize: 15 });
	}

	public selectedBy(point: Point): boolean {
		return this.renderEngine.pathContains(this.shape.move(this.position), point);
	}
}


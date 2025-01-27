import { MovableGradient } from './MovableGradient';

export interface GradientCheckpoint {
	color: string;
	offset: number;
}

export class GradientBuilder {
	private readonly checkpoints: GradientCheckpoint[];

	public constructor(color: string) {
		this.checkpoints = [{ color, offset: 0 }];
	}

	public add(checkpoint: { color?: string; offset: number }): this {
		this.checkpoints.push(
			checkpoint.color === undefined ? { color: this.checkpoints.at(-1).color, offset: checkpoint.offset } : (checkpoint as GradientCheckpoint)
		);
		this.checkpoints.sort((a, b) => a.offset - b.offset);

		return this;
	}

	public build(): MovableGradient {
		return new MovableGradient(this.checkpoints);
	}
}


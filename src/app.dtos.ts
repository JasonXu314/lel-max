import { IsObject, IsString, NotContains } from 'class-validator';
import { fi } from './utils/utils';

export type DirObject = { [segment: string]: string | DirObject };

export class CreateBundleDTO {
	@IsString({ each: true })
	@NotContains('/', { each: true })
	@NotContains('..', { each: true })
	includes: string[] = fi();

	@IsObject()
	sources: any = fi();
}


import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Readable } from 'stream';
import Tar from 'tar-js';
import { createGzip } from 'zlib';
import { CreateBundleDTO, DirObject } from './app.dtos';

@Injectable()
export class AppService {
	public validateDirObj(obj: any): obj is DirObject {
		return (
			!Array.isArray(obj) &&
			Object.keys(obj).every((key) => typeof obj[key] === 'string' || (typeof obj[key] === 'object' && this.validateDirObj(obj[key])))
		);
	}

	public async bundle({ includes, sources }: CreateBundleDTO): Promise<Readable> {
		if (!this.validateDirObj(sources)) throw new BadRequestException('Invalid sources collection');
		if (includes.some((lib) => !/^\w+$/.test(lib))) throw new BadRequestException('Invalid lib path');

		const bundle = new Tar();

		this.traverseDir(sources, (path: string, file: string) => bundle.append(path, file));
		includes.forEach((lib: string) => bundle.append(`lib/${lib}.h`, new Uint8Array(readFileSync(`lib/${lib}.h`))));

		const compressor = createGzip();
		compressor.write(bundle.out);
		compressor.end();

		return compressor;
	}

	public traverseDir(obj: DirObject, cb: (path: string, file: string) => void, dir: string = ''): void {
		Object.entries(obj).forEach(([path, entry]) => {
			if (typeof entry === 'string') {
				cb(dir === '' ? path : `${dir}/${path}`, entry);
			} else {
				this.traverseDir(entry, cb, dir === '' ? path : `${dir}/${path}`);
			}
		});
	}
}


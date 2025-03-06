import { Body, Controller, Get, Post, StreamableFile } from '@nestjs/common';
import { CreateBundleDTO } from './app.dtos';
import { AppService } from './app.service';
import { Page } from './utils/decorators/page.decorator';

@Controller()
export class AppController {
	constructor(private readonly service: AppService) {}

	@Page()
	@Get('/')
	public index(): PageProps {
		return {};
	}

	@Post('/bundle')
	public async bundle(@Body() data: CreateBundleDTO): Promise<StreamableFile> {
		return this.service.bundle(data).then((str) => new StreamableFile(str));
	}
}


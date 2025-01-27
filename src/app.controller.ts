import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Page } from './utils/decorators/page.decorator';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Page()
	@Get('/')
	public index(): PageProps {
		return {};
	}
}


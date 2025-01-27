import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { serveClient } from './utils/utils';

@Module({
	imports: [...serveClient()],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}


import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../seed/seed.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn']
  });

  try {
    const seedService = app.get(SeedService);
    const result = await seedService.seed();

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          stage: 'stage-3',
          result
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
}

void bootstrap();

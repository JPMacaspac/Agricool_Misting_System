import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000', 'http://192.168.56.1:3000'],
    credentials: true,
  });
  const port = process.env.PORT ?? 8081;
  await app.listen(8081);
  console.log(`Backend server is running on http://localhost:${port}`);
}
bootstrap();

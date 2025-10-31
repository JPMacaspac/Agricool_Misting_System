import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow CORS from any origin for local/LAN testing. For production, lock this down.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 8081;
  // Bind to 0.0.0.0 so the server is reachable from other devices on the LAN
  await app.listen(port, '0.0.0.0');
  console.log(`Backend server is running on http://0.0.0.0:${port}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import bonjour from 'bonjour';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Allow CORS from any origin for local/LAN testing
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = Number(process.env.PORT) || 8081;
  
  // Bind to 0.0.0.0 so server is reachable from other devices on LAN
  await app.listen(port, '0.0.0.0');
  
  console.log(`\n======================================`);
  console.log(`Backend server is running on http://0.0.0.0:${port}`);
  console.log(`======================================\n`);
  
  // Start mDNS/Bonjour service for automatic discovery
  const bonjourInstance = bonjour();
  
  bonjourInstance.publish({
    name: 'AgriCool Backend',
    type: 'http',
    port: port,
    host: 'agricool-server.local'
  });
  
  console.log(`✓ mDNS service published as: agricool-server.local:${port}`);
  console.log(`✓ ESP32 can now find this server automatically!`);
  console.log(`✓ No more IP address configuration needed!\n`);
}

bootstrap();
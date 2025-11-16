import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private isConnected = false;
  private connectionAttempted = false;

  onModuleInit() {
    this.connectWithFallback();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connectWithFallback() {
    const primaryBroker = 'mqtt://agricool-mqtt:1883';
    const fallbackBroker = 'mqtt://192.168.1.3:1883';

    console.log('🔌 Initializing MQTT client...');
    console.log(`🌐 Primary broker: ${primaryBroker}`);
    console.log(`🌐 Fallback broker: ${fallbackBroker}`);

    // Try primary broker first
    this.client = mqtt.connect(primaryBroker, {
      clientId: 'agricool-backend',
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    // Set a timeout to try fallback if primary fails
    const fallbackTimeout = setTimeout(() => {
      if (!this.isConnected && !this.connectionAttempted) {
        console.log('⚠️ Primary broker timeout, trying fallback...');
        this.connectionAttempted = true;
        this.tryFallback(fallbackBroker);
      }
    }, 10000);

    this.client.on('connect', () => {
      clearTimeout(fallbackTimeout);
      this.isConnected = true;
      this.connectionAttempted = true;
      console.log('✅ MQTT connected to broker');
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT connection error:', err.message);
      if (!this.connectionAttempted) {
        clearTimeout(fallbackTimeout);
        this.connectionAttempted = true;
        this.tryFallback(fallbackBroker);
      }
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting...');
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      console.log('📵 MQTT offline');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('🔌 MQTT connection closed');
    });
  }

  private tryFallback(fallbackBroker: string) {
    console.log('⚠️ Attempting fallback connection...');
    
    // Close existing client
    if (this.client) {
      this.client.end(true);
    }

    // Create new client with fallback broker
    this.client = mqtt.connect(fallbackBroker, {
      clientId: 'agricool-backend-fallback',
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ MQTT connected to fallback broker (192.168.1.3)');
    });

    this.client.on('error', (fallbackErr) => {
      console.error('❌ MQTT fallback connection failed:', fallbackErr.message);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting (fallback)...');
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      console.log('📵 MQTT fallback offline');
    });
  }

  // 📤 Publish a message to a topic
  publish(topic: string, message: string): boolean {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ Failed to publish to ${topic}:`, err.message);
        } else {
          console.log(`📤 MQTT published to ${topic}: ${message}`);
        }
      });
      return true;
    } else {
      console.error('❌ MQTT not connected, cannot publish');
      return false;
    }
  }

  // 📥 Subscribe to a topic and handle incoming messages
  subscribe(topic: string, callback: (message: string) => void): boolean {
    if (!this.client) {
      console.error('❌ MQTT client not initialized');
      return false;
    }

    // Wait for connection before subscribing
    const attemptSubscribe = () => {
      if (this.isConnected) {
        this.client.subscribe(topic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`📥 MQTT subscribed to ${topic}`);
          } else {
            console.error(`❌ Failed to subscribe to ${topic}:`, err.message);
          }
        });

        this.client.on('message', (t, payload) => {
          if (t === topic) {
            console.log(`📨 Received message on ${topic}: ${payload.toString()}`);
            callback(payload.toString());
          }
        });
      } else {
        console.log(`⏳ Waiting for MQTT connection to subscribe to ${topic}...`);
        setTimeout(attemptSubscribe, 1000);
      }
    };

    attemptSubscribe();
    return true;
  }

  // Helper method to check connection status
  isClientConnected(): boolean {
    return this.isConnected;
  }
}
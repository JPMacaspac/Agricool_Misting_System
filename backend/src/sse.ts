import { EventEmitter } from 'events';

// Simple server-side event emitter for sensor updates.
const sseEmitter = new EventEmitter();

export default sseEmitter;


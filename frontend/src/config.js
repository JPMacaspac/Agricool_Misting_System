export const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8081',
  MQTT_BROKER: process.env.REACT_APP_MQTT_BROKER || 'broker.hivemq.com',
  MQTT_PORT: parseInt(process.env.REACT_APP_MQTT_PORT) || 1883,
};

export default config;
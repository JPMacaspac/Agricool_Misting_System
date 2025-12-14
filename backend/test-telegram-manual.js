/**
 * Manual Telegram Test Script
 * Run this to test if Telegram notifications work before deploying
 */

const TelegramBot = require('node-telegram-bot-api');

// Your bot credentials
const BOT_TOKEN = '8589380779:AAFeQAQx_kFJ9Bpv0JAunkPz5RH_A1xoKss';
const CHAT_ID = '5547764940';

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN);

console.log('🧪 Testing Telegram Bot...\n');

// Test 1: Simple message
async function testSimpleMessage() {
  console.log('📤 Test 1: Sending simple message...');
  try {
    await bot.sendMessage(CHAT_ID, '✅ Test message from AgriCool backend!');
    console.log('✅ Simple message sent successfully!\n');
  } catch (error) {
    console.error('❌ Simple message failed:', error.message, '\n');
  }
}

// Test 2: High temperature alert (your actual use case)
async function testHighTempAlert() {
  console.log('📤 Test 2: Sending high temperature alert...');
  
  const message = `🌡️ *AgriCool Alert*

🔥 *High Temperature Detected!*
━━━━━━━━━━━━━━━━━━━━
Temperature: *35.2°C*
Humidity: *87.2%*
Heat Index: *40.1°C*
Water Level: *67%*

⚡ Pump Status: *ON (AUTO)*
🕐 Time: ${new Date().toLocaleString()}`;

  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('✅ High temp alert sent successfully!\n');
  } catch (error) {
    console.error('❌ High temp alert failed:', error.message, '\n');
  }
}

// Test 3: Low water alert
async function testLowWaterAlert() {
  console.log('📤 Test 3: Sending low water alert...');
  
  const message = `💧 *AgriCool Alert*

⚠️ *Low Water Level!*
━━━━━━━━━━━━━━━━━━━━
Water Level: *25%*

Please refill the water tank soon.
🕐 Time: ${new Date().toLocaleString()}`;

  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('✅ Low water alert sent successfully!\n');
  } catch (error) {
    console.error('❌ Low water alert failed:', error.message, '\n');
  }
}

// Run all tests
async function runAllTests() {
  await testSimpleMessage();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  await testHighTempAlert();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  await testLowWaterAlert();
  
  console.log('✅ All tests completed! Check your Telegram app for messages.');
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

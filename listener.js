const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const APP_ID = 1089;
const SYMBOL = "R_100";
const DATA_FILE = 'data.json';

// Initial data structure
let finalData = {
  last_update: new Date().toISOString(),
  symbol: SYMBOL,
  current_price: null,
  bid: null,
  ask: null,
  last_tick: null,
  ohlc: {}
};

// Load existing data if available
function loadExistingData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      const saved = JSON.parse(fileContent);
      finalData.ohlc = saved.ohlc || {};
      console.log('Loaded existing OHLC data');
    }
  } catch (err) {
    console.error('Error loading existing data:', err.message);
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
  } catch (err) {
    console.error('Error saving data:', err.message);
  }
}

// Connect and listen to WebSocket
function connectWebSocket() {
  console.log(`[${new Date().toISOString()}] Connecting to WebSocket...`);
  
  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
  
  ws.on('open', () => {
    console.log(`[${new Date().toISOString()}] WebSocket connected`);
    
    // Subscribe to tick stream (real-time updates)
    ws.send(JSON.stringify({
      "ticks": SYMBOL,
      "subscribe": 1
    }));
    
    console.log(`[${new Date().toISOString()}] Subscribed to ${SYMBOL} ticks`);
  });
  
  ws.on('message', (data) => {
    try {
      const res = JSON.parse(data);
      
      // Handle tick update
      if (res.tick) {
        finalData.last_update = new Date().toISOString();
        finalData.last_tick = {
          epoch: res.tick.epoch,
          quote: res.tick.quote,
          timestamp: new Date(res.tick.epoch * 1000).toISOString()
        };
        finalData.current_price = res.tick.quote;
        
        saveData();
        console.log(`[${new Date().toISOString()}] Tick: ${res.tick.quote}`);
      }
      
      // Handle subscribe confirmation
      if (res.subscribe) {
        console.log(`[${new Date().toISOString()}] Successfully subscribed`);
      }
      
      // Handle connection status
      if (res.connection_status) {
        console.log(`[${new Date().toISOString()}] Connection status: ${res.connection_status}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error parsing message:`, err.message);
    }
  });
  
  ws.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, err.message);
  });
  
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket closed, reconnecting in 5 seconds...`);
    setTimeout(connectWebSocket, 5000);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] Shutting down gracefully...`);
    ws.close();
    saveData();
    process.exit(0);
  });
}

// Start the listener
console.log(`[${new Date().toISOString()}] Starting OHLC Real-time Listener`);
loadExistingData();
connectWebSocket();

// Save data every 30 seconds (periodic backup)
setInterval(() => {
  saveData();
  console.log(`[${new Date().toISOString()}] Data saved (periodic backup)`);
}, 30000);

// Log status every minute
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Status: Last price = ${finalData.current_price || 'waiting...'}`);
}, 60000);

const WebSocket = require('ws');
const fs = require('fs');
const { execSync } = require('child_process');

const APP_ID = 1089;
const SYMBOL = "R_100";
const DATA_FILE = 'data.json';

// Initial data structure
let finalData = {
  last_update: new Date().toISOString(),
  symbol: SYMBOL,
  current_price: null,
  last_tick: null,
  ticks: []
};

let lastPushTime = Date.now();
let tickCount = 0;

// Load existing data if available
function loadExistingData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      const saved = JSON.parse(fileContent);
      finalData.ticks = saved.ticks || [];
      console.log(`[${new Date().toISOString()}] Loaded ${finalData.ticks.length} existing ticks`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error loading data:`, err.message);
  }
}

// Save and push to GitHub
function saveAndPush(tickData) {
  try {
    // Simpan tick ke array
    finalData.last_update = new Date().toISOString();
    finalData.last_tick = tickData;
    finalData.current_price = tickData.quote;
    finalData.ticks.push(tickData);
    
    // Limit array ke 10000 ticks terakhir (untuk hemat memory)
    if (finalData.ticks.length > 10000) {
      finalData.ticks = finalData.ticks.slice(-10000);
    }
    
    // Simpan ke file
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
    
    tickCount++;
    console.log(`[${new Date().toISOString()}] 📊 Tick #${tickCount}: ${tickData.quote}`);
    
    // Push ke GitHub setiap tick
    try {
      execSync('git add data.json', { cwd: '/root/candle', stdio: 'pipe' });
      execSync(`git commit -m "Tick ${tickCount}: ${tickData.quote} at ${new Date().toISOString()}"`, { 
        cwd: '/root/candle',
        stdio: 'pipe'
      });
      execSync('git push origin main', { cwd: '/root/candle', stdio: 'pipe' });
      
      console.log(`[${new Date().toISOString()}] ✅ Pushed to GitHub (Tick #${tickCount})`);
    } catch (err) {
      if (err.message.includes('nothing to commit')) {
        // Skip jika tidak ada perubahan
      } else {
        console.error(`[${new Date().toISOString()}] ⚠️ Push error:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
  }
}

// Connect and listen to WebSocket
function connectWebSocket() {
  console.log(`[${new Date().toISOString()}] Connecting to WebSocket...`);
  
  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
  
  ws.on('open', () => {
    console.log(`[${new Date().toISOString()}] ✅ WebSocket connected`);
    
    // Subscribe to tick stream
    ws.send(JSON.stringify({
      "ticks": SYMBOL,
      "subscribe": 1
    }));
    
    console.log(`[${new Date().toISOString()}] 📡 Subscribed to ${SYMBOL}`);
  });
  
  ws.on('message', (data) => {
    try {
      const res = JSON.parse(data);
      
      // Handle tick update
      if (res.tick) {
        const tickData = {
          epoch: res.tick.epoch,
          quote: res.tick.quote,
          timestamp: new Date(res.tick.epoch * 1000).toISOString()
        };
        saveAndPush(tickData);
      }
      
      // Handle subscribe confirmation
      if (res.subscribe) {
        console.log(`[${new Date().toISOString()}] Successfully subscribed`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Parse error:`, err.message);
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
    process.exit(0);
  });
}

// Start the listener
console.log(`[${new Date().toISOString()}] 🚀 Starting OHLC Real-time Listener (Save every tick)`);
loadExistingData();
connectWebSocket();

// Log status every minute
setInterval(() => {
  console.log(`[${new Date().toISOString()}] 📈 Total ticks: ${tickCount} | Last price: ${finalData.current_price || 'waiting...'}`);
}, 60000);

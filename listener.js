const WebSocket = require('ws');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const APP_ID = 1089;
const SYMBOL = "R_100";
const DATA_FILE = 'data.json';
const GIT_PUSH_INTERVAL = 30000; // Push ke GitHub setiap 30 detik

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

let lastGitPush = Date.now();
let hasChanges = false;

// Load existing data if available
function loadExistingData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      const saved = JSON.parse(fileContent);
      finalData.ohlc = saved.ohlc || {};
      console.log(`[${new Date().toISOString()}] Loaded existing OHLC data`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error loading existing data:`, err.message);
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
    hasChanges = true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error saving data:`, err.message);
  }
}

// Push to GitHub
function pushToGitHub() {
  try {
    if (!hasChanges) {
      console.log(`[${new Date().toISOString()}] No changes, skipping git push`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Pushing to GitHub...`);
    
    // Git commands
    execSync('git add data.json', { cwd: '/root/candle', stdio: 'pipe' });
    execSync(`git commit -m "Auto-update OHLC: ${new Date().toISOString()}"`, { 
      cwd: '/root/candle',
      stdio: 'pipe'
    }).toString();
    execSync('git push origin main', { cwd: '/root/candle', stdio: 'pipe' });
    
    hasChanges = false;
    console.log(`[${new Date().toISOString()}] ✅ Successfully pushed to GitHub`);
  } catch (err) {
    if (err.message.includes('nothing to commit')) {
      console.log(`[${new Date().toISOString()}] No changes to commit`);
      hasChanges = false;
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Git push error:`, err.message);
    }
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
        console.log(`[${new Date().toISOString()}] 📊 Tick: ${res.tick.quote}`);
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
    pushToGitHub(); // Push terakhir sebelum disconnect
    setTimeout(connectWebSocket, 5000);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] Shutting down gracefully...`);
    ws.close();
    saveData();
    pushToGitHub(); // Push terakhir
    process.exit(0);
  });
}

// Start the listener
console.log(`[${new Date().toISOString()}] Starting OHLC Real-time Listener with GitHub Push`);
loadExistingData();
connectWebSocket();

// Push to GitHub setiap interval
setInterval(() => {
  pushToGitHub();
}, GIT_PUSH_INTERVAL);

// Save data every 30 seconds (periodic backup)
setInterval(() => {
  saveData();
  console.log(`[${new Date().toISOString()}] 💾 Data saved (periodic backup)`);
}, 30000);

// Log status every minute
setInterval(() => {
  console.log(`[${new Date().toISOString()}] 📈 Status: Last price = ${finalData.current_price || 'waiting...'}`);
}, 60000);

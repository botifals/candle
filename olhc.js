const WebSocket = require('ws');
const fs = require('fs');

const APP_ID = 1089; // Gunakan App ID Anda jika punya
const SYMBOL = "R_100";
const TIMEFRAMES = {
  "M1": 60,
  "M5": 300,
  "M15": 900,
  "M30": 1800,
  "H1": 3600,
  "H4": 14400,
  "D1": 86400,
  "W1": 604800
};

const finalData = {
  last_update: new Date().toISOString(),
  symbol: SYMBOL,
  ohlc: {}
};

async function fetchOHLC() {
  for (const [name, seconds] of Object.entries(TIMEFRAMES)) {
    console.log(`Fetching ${name}...`);
    try {
      const candles = await getCandles(seconds);
      finalData.ohlc[name] = candles;
    } catch (err) {
      console.error(`Error fetching ${name}:`, err);
    }
  }

  // Simpan ke data.json
  fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2));
  console.log("JSON Updated with 8 Timeframes!");
  process.exit(0);
}

function getCandles(granularity) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        "ticks_history": SYMBOL,
        "count": 500, // Mengambil 500 data terbaru
        "end": "latest",
        "granularity": granularity,
        "style": "candles"
      }));
    });

    ws.on('message', (data) => {
      const res = JSON.parse(data);
      if (res.error) {
        ws.close();
        reject(res.error.message);
      }
      if (res.candles) {
        ws.close();
        resolve(res.candles);
      }
    });

    ws.on('error', (err) => {
      ws.close();
      reject(err);
    });

    // Timeout per request
    setTimeout(() => {
      ws.close();
      reject("Timeout");
    }, 10000);
  });
}

fetchOHLC();

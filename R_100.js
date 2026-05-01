const WebSocket = require('ws');
const fs = require('fs');

const APP_ID = 1089; 
const SYMBOL = "R_100";
const TIMEFRAMES = {
  "M1": 60, "M5": 300, "M15": 900, "M30": 1800,
  "H1": 3600, "H4": 14400, "D1": 86400
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
      const rawCandles = await getCandles(seconds);
      finalData.ohlc[name] = formatCandles(rawCandles);
      
      // Jika D1 berhasil, rakit W1 secara manual untuk menghindari error API
      if (name === "D1") {
        console.log("Generating W1 from D1...");
        finalData.ohlc["W1"] = generateWeeklyFromDaily(rawCandles);
      }
    } catch (err) {
      console.error(`Error fetching ${name}:`, err);
    }
  }

  fs.writeFileSync('R_100.json', JSON.stringify(finalData, null, 2));
  console.log("JSON Updated: M1 to W1 (500 bars each)");
  process.exit(0);
}

function formatCandles(candles) {
  return candles.map(c => ({
    time: c.epoch,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    volume: parseFloat(c.vol || 0)
  })).slice(-500);
}

function generateWeeklyFromDaily(daily) {
  const weekly = [];
  // Resampling 7 hari menjadi 1 minggu
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    if (chunk.length > 0) {
      weekly.push({
        time: chunk[0].time,
        open: chunk[0].open,
        high: Math.max(...chunk.map(d => d.high)),
        low: Math.min(...chunk.map(d => d.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((sum, d) => sum + (d.volume || 0), 0)
      });
    }
  }
  return weekly.slice(-500);
}

function getCandles(granularity) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        "ticks_history": SYMBOL,
        "count": 1000, 
        "end": "latest",
        "granularity": granularity,
        "style": "candles"
      }));
    });
    ws.on('message', (data) => {
      const res = JSON.parse(data);
      if (res.error) { ws.close(); reject(res.error.message); }
      if (res.candles) { ws.close(); resolve(res.candles); }
    });
    ws.on('error', (err) => { ws.close(); reject(err); });
    setTimeout(() => { ws.close(); reject("Timeout"); }, 15000);
  });
}

fetchOHLC();

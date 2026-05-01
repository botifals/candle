const WebSocket = require('ws');
const fs = require('fs');

const APP_ID = 1089;
const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

ws.on('open', () => {
    ws.send(JSON.stringify({
        "ticks_history": "R_100",
        "count": 50,
        "end": "latest",
        "granularity": 60,
        "style": "candles"
    }));
});

ws.on('message', (data) => {
    const res = JSON.parse(data);
    if (res.candles) {
        // Simpan hasil ke file JSON
        const output = {
            last_update: new Date().toISOString(),
            symbol: "R_100",
            data: res.candles
        };
        fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
        console.log("JSON Updated!");
        ws.close();
        process.exit(0);
    }
});

// Timeout agar tidak gantung jika koneksi gagal
setTimeout(() => process.exit(1), 15000);

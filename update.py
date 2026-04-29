import requests
import json
from datetime import datetime

symbol = "EURUSD=X"

urls = [
    f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d",
    f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=2d"
]

headers = {
    "User-Agent": "Mozilla/5.0"
}

candles = []

for url in urls:
    try:
        res = requests.get(url, headers=headers, timeout=10)
        data = res.json()

        if data.get("chart", {}).get("result"):
            result = data["chart"]["result"][0]
            timestamps = result.get("timestamp", [])
            quotes = result["indicators"]["quote"][0]

            for i in range(len(timestamps)):
                o = quotes["open"][i]
                h = quotes["high"][i]
                l = quotes["low"][i]
                c = quotes["close"][i]

                if o is None or h is None or l is None or c is None:
                    continue

                # ⏱️ convert ke WIB (UTC+7)
                time_wib = datetime.utcfromtimestamp(timestamps[i] + 7*3600).strftime("%Y-%m-%d %H:%M")

                candles.append({
                    "time": time_wib,
                    "open": float(f"{o:.5f}"),
                    "high": float(f"{h:.5f}"),
                    "low": float(f"{l:.5f}"),
                    "close": float(f"{c:.5f}")
                })

            if len(candles) > 0:
                break

    except Exception as e:
        print("Error:", e)

# ambil 500 candle terakhir
candles = candles[-500:]

# tetap buat file walaupun kosong
with open("data.json", "w") as f:
    json.dump(candles, f)

print("TOTAL CANDLE:", len(candles))

import requests
import json

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

                candles.append({
                    "time": timestamps[i],
                    "open": f"{o:.5f}",
"high": f"{h:.5f}",
"low": f"{l:.5f}",
"close": f"{c:.5f}"
                })

            if len(candles) > 0:
                break

    except Exception as e:
        print("Error:", e)

# ambil 500 terakhir
candles = candles[-500:]

with open("data.json", "w") as f:
    json.dump(candles, f)

print("TOTAL CANDLE:", len(candles))

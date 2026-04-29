import requests
import json

symbol = "EURUSD=X"
url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d"

res = requests.get(url).json()

# cek error
if res["chart"]["result"] is None:
    print("Error ambil data")
    exit()

result = res["chart"]["result"][0]
timestamps = result["timestamp"]
quotes = result["indicators"]["quote"][0]

candles = []

for i in range(len(timestamps)):
    if quotes["open"][i] is None:
        continue

    candles.append({
        "time": timestamps[i],
        "open": quotes["open"][i],
        "high": quotes["high"][i],
        "low": quotes["low"][i],
        "close": quotes["close"][i]
    })

# ambil 500 candle terakhir
candles = candles[-500:]

with open("data.json", "w") as f:
    json.dump(candles, f)

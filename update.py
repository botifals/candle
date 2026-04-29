import requests
import json

symbol = "EURUSD=X"
url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d"

try:
    res = requests.get(url)
    data = res.json()
except Exception as e:
    print("Error request:", e)
    exit()

# cek data kosong
if data.get("chart", {}).get("result") is None:
    print("Data kosong dari Yahoo")
    print(data)
    exit()

result = data["chart"]["result"][0]
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

candles = candles[-500:]

with open("data.json", "w") as f:
    json.dump(candles, f)

print("SUCCESS BUAT JSON")

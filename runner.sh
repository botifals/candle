#!/bin/bash
# Masuk ke folder
cd /root/candle

# 1. Jalankan Node.js untuk ambil data terbaru
/usr/bin/node /root/candle/olhc.js

# 2. Masukkan ke staging
git add /root/candle/data.json

# 3. Commit dan Push jika ada perubahan
if ! git diff --cached --exit-code > /dev/null; then
    git commit -m "Update OHLC: $(date)"
    # Ambil update terbaru dari github (rebase) lalu push
    git pull origin main --rebase
    git push origin main
    echo "Update Berhasil: $(date)"
else
    echo "Data stabil, tidak ada perubahan."
fi

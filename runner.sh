#!/bin/bash
cd /root/candle

# 1. Ambil info terbaru tanpa menggabungkan (fetch saja)
git fetch origin main

# 2. Jalankan Node.js untuk update data.json
/usr/bin/node /root/candle/R_100.js

# 3. Paksa commit dan paksa push
git add R_100.json
if ! git diff --cached --exit-code > /dev/null; then
    git commit -m "Update OHLC: $(date)"
    
    # KUNCI UTAMA: Paksa GitHub mengikuti apa yang ada di VPS
    # Ini menghilangkan error 'rejected' dan 'divergent branches'
    git push origin main --force
    
    echo "Update Berhasil dipaksa ke GitHub: $(date)"
else
    echo "Data sama, tidak ada perubahan."
fi
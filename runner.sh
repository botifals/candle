#!/bin/bash

# 1. Masuk ke direktori kerja
cd /root/candle

# 2. Bersihkan sisa-sisa perubahan lokal agar sinkron dengan GitHub
git fetch origin main
git checkout *.json 2>/dev/null || true

echo "--- Memulai Update 40 Pair Serentak: $(date) ---"

# 3. Eksekusi Paralel (Semua .js jalan sekaligus)
for script in *.js; do
    if [ -f "$script" ]; then
        # Tanda '&' di bawah ini yang membuat skrip jalan tanpa antre (background)
        /usr/bin/node "$script" & 
    fi
done

# 4. Tunggu sampai semua proses Node.js di atas selesai
wait

# 5. Tambahkan semua JSON yang terupdate
git add *.json

# 6. Push ke GitHub (Menggunakan --amend agar history tetap tipis)
if ! git diff --cached --exit-code > /dev/null; then
    # Menghapus history lama dan mengganti dengan yang baru
    git commit --amend -m "Flash Update: $(date)" || git commit -m "Flash Update: $(date)"
    
    # Force push agar proses instan tanpa konflik
    git push origin main --force
    
    echo "--- SEMUA DATA TERKIRIM KE GITHUB ---"
else
    echo "--- Tidak ada perubahan data harga. ---"
fi
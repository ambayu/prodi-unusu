# Deploy ke VPS

Panduan ini dipakai saat aplikasi dipasang di VPS `103.116.168.49`. Pada tahap
pengembangan lokal, file hosts dan mode pratinjau sudah cukup.

## 1. Prasyarat server

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
```

## 2. Siapkan database

```bash
sudo mysql -e "CREATE DATABASE prodi_unusu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'prodi_unusu'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_SANDI_KUAT';"
sudo mysql -e "GRANT ALL PRIVILEGES ON prodi_unusu_db.* TO 'prodi_unusu'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

Jangan memakai `root` tanpa kata sandi di production.

## 3. Ambil kode dan konfigurasi

```bash
sudo mkdir -p /var/www/prodi-unusu
sudo chown -R $USER:$USER /var/www/prodi-unusu
git clone <alamat-repository> /var/www/prodi-unusu
cd /var/www/prodi-unusu
npm ci
```

Buat `.env`:

```bash
cp .env.example .env
nano .env
```

Nilai wajib diubah untuk production:

| Variabel | Nilai production |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://prodi_unusu:SANDI@localhost:3306/prodi_unusu_db` |
| `JWT_SECRET` | hasil `openssl rand -hex 32`, jangan pakai nilai contoh |
| `COOKIE_DOMAIN` | `.unusu.ac.id` agar sesi berlaku lintas subdomain |
| `CORS_ORIGINS` | daftar asal produksi, misalnya `https://prodi.unusu.ac.id` |
| `TRUST_PROXY` | `true` |
| `SSO_CLIENT_KEY` | dari portal ONE UNUSU produksi |
| `SSO_BASE_URL` | alamat portal ONE UNUSU produksi |
| `SEED_SUPERADMIN_PASSWORD` | kata sandi kuat, lihat catatan di bawah |

`SEED_SUPERADMIN_PASSWORD` hanya dibaca saat seeder dijalankan. Setelah akun
dibuat, hapus nilainya dari `.env` dan ganti kata sandi lewat aplikasi.

## 4. Migrasi dan seeder

```bash
npx prisma migrate deploy
npm run db:seed
```

Seeder aman dijalankan ulang. Pada production, `ALLOW_LOCAL_PREVIEW` harus
bernilai `false` agar localhost tidak dapat dipakai sebagai jalan masuk tenant.

## 5. Build dan jalankan

```bash
npm run build
mkdir -p /var/log/pm2
pm2 start deploy/ecosystem.config.json
pm2 save
pm2 startup
```

Periksa:

```bash
pm2 logs prodi-unusu --lines 30
curl -s http://127.0.0.1:5010/api/health
```

## 6. Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/prodi-unusu
sudo nano /etc/nginx/sites-available/prodi-unusu
```

Sesuaikan `server_name` dengan inventaris domain resmi, lalu:

```bash
sudo ln -s /etc/nginx/sites-available/prodi-unusu /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Penting:** baris `proxy_set_header Host $host;` tidak boleh dihapus. Aplikasi
menentukan tenant dari header itu. Tanpa baris tersebut semua domain akan
dianggap `localhost` dan resolusi tenant gagal.

## 7. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d prodi.unusu.ac.id \
  -d unusu.ac.id -d www.unusu.ac.id \
  -d tif.unusu.ac.id -d iko.unusu.ac.id -d sin.unusu.ac.id \
  -d pgsd.unusu.ac.id -d manajemen.unusu.ac.id \
  -d agribisnis.unusu.ac.id -d itp.unusu.ac.id -d bdp.unusu.ac.id \
  -d ilmugizi.unusu.ac.id -d ankes.unusu.ac.id \
  -d piaud.unusu.ac.id -d pai.unusu.ac.id -d hki.unusu.ac.id -d studislam.unusu.ac.id
```

Perpanjangan otomatis sudah aktif lewat timer certbot. Uji dengan:

```bash
sudo certbot renew --dry-run
```

## 8. Daftarkan klien SSO produksi

Setelah portal ONE UNUSU production hidup:

```bash
npx tsx scripts/register-sso-client.ts
```

Skrip menulis `SSO_CLIENT_KEY` ke `.env`. Jalankan ulang aplikasi setelahnya:

```bash
pm2 restart prodi-unusu
```

## 9. Verifikasi setelah deploy

```bash
# Resolusi tenant per domain
curl -s https://sin.unusu.ac.id/api/v1/site-resolution
curl -s https://prodi.unusu.ac.id/api/v1/site-resolution

# Domain yang tidak terdaftar harus ditolak, bukan dialihkan
curl -s -o /dev/null -w "%{http_code}\n" https://domain-tidak-ada.unusu.ac.id/api/v1/public/site

# Kesehatan database
curl -s https://prodi.unusu.ac.id/api/health
```

Hasil yang diharapkan: `surface` bernilai `prodi` untuk domain prodi, `admin`
untuk portal, `main` untuk domain universitas, dan `404` untuk domain asing.

## 10. Backup

```bash
sudo tee /etc/cron.daily/backup-prodi-unusu > /dev/null <<'EOF'
#!/bin/bash
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /var/backups/prodi-unusu
mysqldump --single-transaction prodi_unusu_db | gzip > /var/backups/prodi-unusu/db-$STAMP.sql.gz
tar czf /var/backups/prodi-unusu/uploads-$STAMP.tar.gz /var/www/prodi-unusu/uploads
find /var/backups/prodi-unusu -type f -mtime +14 -delete
EOF

sudo chmod +x /etc/cron.daily/backup-prodi-unusu
```

Uji pemulihan secara berkala, jangan hanya mengandalkan berkas backup ada.

## 11. Daftar periksa sebelum go live

- [ ] `JWT_SECRET` hasil acak, bukan nilai contoh di `.env.example`
- [ ] `COOKIE_DOMAIN` diisi `.unusu.ac.id`
- [ ] `TRUST_PROXY=true` dan port 5010 tidak terbuka dari internet
- [ ] `ALLOW_LOCAL_PREVIEW=false`
- [ ] `SEED_SUPERADMIN_PASSWORD` dihapus dari `.env` setelah akun dibuat
- [ ] Kata sandi akun admin sudah diganti
- [ ] Seluruh 20 domain terdaftar di tabel `domains` dan `server_name`
- [ ] SSL aktif di semua domain, `certbot renew --dry-run` lulus
- [ ] `curl` resolusi tenant memberi hasil benar untuk setiap domain
- [ ] Backup harian berjalan dan pemulihan sudah diuji
- [ ] `pm2 startup` dan `pm2 save` sudah dijalankan agar proses hidup setelah reboot


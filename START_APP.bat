@echo off
title Maintenance Daily Report
echo ================================================
echo    MAINTENANCE DAILY REPORT - FRONTEND
echo ================================================
echo.

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo ERROR: npm tidak ditemukan.
  echo Install Node.js terlebih dahulu, lalu coba lagi.
  pause
  exit /b 1
)

if not exist node_modules (
  echo node_modules belum ada. Menjalankan npm install...
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo npm install gagal. Cek koneksi internet / Node.js.
    pause
    exit /b 1
  )
)

echo.
echo Menjalankan website...
echo Setelah muncul Local URL, buka di browser.
echo.
call npm run dev
pause

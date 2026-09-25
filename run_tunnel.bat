@echo off
chcp 65001 >nul
title 🌀 HireAI LocalTunnel (Auto-Reconnect)
color 0B

echo ===================================================
echo   🌀 HireAI LocalTunnel Permanent Auto-Keepalive
echo   Subdomain: hireai-typhoon
echo   Local Port: 8000
echo ===================================================
echo.

:loop
echo [%time%] 🚀 Starting LocalTunnel (hireai-typhoon)...
call npx -y localtunnel --port 8000 --subdomain hireai-typhoon
echo.
echo [%time%] ⚠️ LocalTunnel disconnected or connection dropped!
echo [%time%] 🔄 Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
echo.
goto loop

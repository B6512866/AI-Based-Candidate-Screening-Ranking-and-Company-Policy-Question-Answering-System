$Host.UI.RawUI.WindowTitle = "🌀 HireAI LocalTunnel (Auto-Reconnect)"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  🌀 HireAI LocalTunnel Permanent Auto-Keepalive" -ForegroundColor Cyan
Write-Host "  Subdomain: hireai-typhoon" -ForegroundColor Yellow
Write-Host "  Local Port: 8000" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    $now = Get-Date -Format "HH:mm:ss"
    Write-Host "[$now] 🚀 Starting LocalTunnel (hireai-typhoon)..." -ForegroundColor Green
    try {
        npx -y localtunnel --port 8000 --subdomain hireai-typhoon
    } catch {
        Write-Host "[$now] Error running localtunnel: $_" -ForegroundColor Red
    }
    $now = Get-Date -Format "HH:mm:ss"
    Write-Host "[$now] ⚠️ LocalTunnel stopped or dropped. Reconnecting in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

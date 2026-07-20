$Root = $PSScriptRoot
$Logs = Join-Path $Root ".logs"
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function Normalize-ProcessPathVariable {
    $pathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
    if (-not $pathValue) {
        $pathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
    }

    [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    if ($pathValue) {
        [Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
    }
}

Normalize-ProcessPathVariable

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "Docker is not installed or not available in PATH."
    Write-Host "Install Docker Desktop first, then rerun this command."
    Write-Host "For now use: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1"
    exit 1
}

function Stop-PortListeners {
    param([int[]] $Ports)

    foreach ($port in $Ports) {
        $lines = netstat -ano | Select-String ":$port"
        foreach ($line in $lines) {
            $parts = ($line.ToString() -split "\s+") | Where-Object { $_ }
            if ($parts.Count -lt 5 -or $parts[3] -ne "LISTENING") {
                continue
            }

            $pidValue = $parts[-1]
            if ($pidValue -and $pidValue -ne "0") {
                Stop-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
            }
        }
    }
}

function Start-MemorisProcess {
    param(
        [string] $Name,
        [string] $WorkingDirectory,
        [string] $Command,
        [string] $PidFile
    )

    $process = Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput (Join-Path $Logs "$Name.log") `
        -RedirectStandardError (Join-Path $Logs "$Name.err.log") `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path (Join-Path $Logs $PidFile) -Value $process.Id
    Write-Host "$Name started with PID $($process.Id)"
}

function Wait-ForBackend {
    for ($i = 1; $i -le 60; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -TimeoutSec 2
            if ($response.status -eq "ok") {
                Write-Host "backend health check passed"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-Error "Backend did not become healthy. Check .logs\backend.log"
    exit 1
}

Stop-PortListeners -Ports @(5173, 8080)

Push-Location (Join-Path $Root "infra")
docker compose up -d
Pop-Location

Start-MemorisProcess `
    -Name "backend" `
    -WorkingDirectory (Join-Path $Root "backend") `
    -Command ".\run-postgres.ps1" `
    -PidFile "backend.pid"

Wait-ForBackend

Start-MemorisProcess `
    -Name "frontend" `
    -WorkingDirectory (Join-Path $Root "frontend") `
    -Command "npm.cmd run dev -- --host 127.0.0.1" `
    -PidFile "frontend.pid"

Write-Host ""
Write-Host "Memoris OS is running with PostgreSQL."
Write-Host "Frontend: http://127.0.0.1:5173/"
Write-Host "Backend:  http://localhost:8080/"
Write-Host "Database: localhost:5432"

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

function Stop-OldMemorisProcess {
    param([string] $PidFile)

    $path = Join-Path $Logs $PidFile
    if (Test-Path $path) {
        $pidValue = Get-Content $path -ErrorAction SilentlyContinue
        if ($pidValue) {
            Stop-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
        }
        Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
    }
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

    $logFile = Join-Path $Logs "$Name.log"
    $errorFile = Join-Path $Logs "$Name.err.log"
    $process = Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errorFile `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path (Join-Path $Logs $PidFile) -Value $process.Id
    Write-Host "$Name started with PID $($process.Id)"
}

function Wait-ForBackend {
    $healthUrl = "http://localhost:8080/api/health"
    for ($i = 1; $i -le 45; $i++) {
        try {
            $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
            if ($response.status -eq "ok") {
                Write-Host "backend health check passed"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-Error "Backend did not become healthy at $healthUrl. Check .logs\backend.log"
    exit 1
}

Stop-OldMemorisProcess -PidFile "frontend.pid"
Stop-OldMemorisProcess -PidFile "backend.pid"
Stop-PortListeners -Ports @(5173, 8080)

Start-MemorisProcess `
    -Name "backend" `
    -WorkingDirectory (Join-Path $Root "backend") `
    -Command ".\run-local.ps1" `
    -PidFile "backend.pid"

Wait-ForBackend

Start-MemorisProcess `
    -Name "frontend" `
    -WorkingDirectory (Join-Path $Root "frontend") `
    -Command "npm.cmd run dev -- --host 127.0.0.1" `
    -PidFile "frontend.pid"

Write-Host ""
Write-Host "Memoris OS is starting."
Write-Host "Frontend: http://127.0.0.1:5173/"
Write-Host "Backend:  http://localhost:8080/"
Write-Host "Logs:     $Logs"

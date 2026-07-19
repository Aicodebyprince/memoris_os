$Root = $PSScriptRoot
$Logs = Join-Path $Root ".logs"

foreach ($file in @("frontend.pid", "backend.pid")) {
    $path = Join-Path $Logs $file
    if (Test-Path $path) {
        $pidValue = Get-Content $path -ErrorAction SilentlyContinue
        if ($pidValue) {
            Stop-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
            Write-Host "Stopped $file process $pidValue"
        }
        Remove-Item -Path $path -Force
    }
}

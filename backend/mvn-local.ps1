$Root = Split-Path -Parent $PSScriptRoot
$Maven = Join-Path $Root ".tools\apache-maven-3.9.11\bin\mvn.cmd"

if (-not (Test-Path $Maven)) {
    Write-Error "Local Maven was not found at $Maven"
    exit 1
}

& $Maven @args

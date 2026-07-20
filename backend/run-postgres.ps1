function Import-EnvFile {
    param([string] $Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $key, $value = $line.Split("=", 2)
        $value = $value.Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($key.Trim(), $value, "Process")
    }
}

Import-EnvFile (Join-Path $PSScriptRoot ".env")

$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "jdbc:postgresql://localhost:5432/memoris_os" }
$env:DATABASE_USERNAME = if ($env:DATABASE_USERNAME) { $env:DATABASE_USERNAME } else { "memoris" }
$env:DATABASE_PASSWORD = if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } else { "memoris" }
$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { "dev-only-change-this-secret-before-production-64-characters-minimum" }

$jar = Join-Path $PSScriptRoot "target\memoris-backend-0.1.0.jar"
$useJar = $env:MEMORIS_USE_JAR -eq "true"
if ($useJar -and (Test-Path $jar)) {
    & java -jar $jar
} else {
    & "$PSScriptRoot\mvn-local.ps1" spring-boot:run
}

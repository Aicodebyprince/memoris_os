$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "jdbc:postgresql://localhost:5432/memoris_os" }
$env:DATABASE_USERNAME = if ($env:DATABASE_USERNAME) { $env:DATABASE_USERNAME } else { "memoris" }
$env:DATABASE_PASSWORD = if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } else { "memoris" }
$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { "dev-only-change-this-secret-before-production-64-characters-minimum" }

& "$PSScriptRoot\mvn-local.ps1" spring-boot:run

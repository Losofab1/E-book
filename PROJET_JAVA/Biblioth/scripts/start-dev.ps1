Param(
    [string]$DbUrl = 'jdbc:postgresql://localhost:5432/biblioth_db',
    [string]$DbUser = 'postgres',
    [string]$DbPassword = ''
)

Write-Host "Starting Biblioth (profile=dev) with DB: $DbUrl" -ForegroundColor Cyan

# Export environment variables for the JVM process
$env:DB_URL = $DbUrl
$env:DB_USERNAME = $DbUser
if ($DbPassword -ne '') { $env:DB_PASSWORD = $DbPassword }

# Prefer Maven wrapper if present
if (Test-Path -Path .\mvnw.cmd) {
    & .\mvnw.cmd -Dspring-boot.run.profiles=dev -DskipTests spring-boot:run
} else {
    Write-Host "Maven wrapper not found, trying global mvn..." -ForegroundColor Yellow
    mvn -Dspring-boot.run.profiles=dev -DskipTests spring-boot:run
}

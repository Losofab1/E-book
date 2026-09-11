Param(
    [string]$Port = '8080'
)

Write-Host "Starting Biblioth (profile=local, H2) on port $Port" -ForegroundColor Cyan

$env:SPRING_PROFILES_ACTIVE = 'local'
$env:SERVER_PORT = $Port

if (Test-Path -Path .\mvnw.cmd) {
    & .\mvnw.cmd -Dspring-boot.run.profiles=local -Dspring-boot.run.jvmArguments="-Dserver.port=$Port" -DskipTests spring-boot:run
} else {
    Write-Host "Maven wrapper not found, trying global mvn..." -ForegroundColor Yellow
    mvn -Dspring-boot.run.profiles=local -Dspring-boot.run.jvmArguments="-Dserver.port=$Port" -DskipTests spring-boot:run
}

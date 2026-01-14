# Soccer Team Maker Launcher
Write-Host "Starting Soccer Team Maker..." -ForegroundColor Green
Write-Host ""

# Set the project directory
$projectDir = "C:\Users\guysa\Documents\Soccer-team-maker"
Set-Location $projectDir

try {
    # Start the data backup server first
    Write-Host "Starting data backup server (port 3001)..." -ForegroundColor Yellow
    $dataServerProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Minimized -PassThru

    # Wait a moment for data server
    Start-Sleep -Seconds 2

    # Start the development server in a new window
    Write-Host "Starting development server (port 3000)..." -ForegroundColor Yellow
    $serverProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm start" -WindowStyle Minimized -PassThru

    # Wait for server to start
    Write-Host "Waiting for server to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8

    # Try to open Chrome, fallback to default browser
    Write-Host "Opening Soccer Team Maker in browser..." -ForegroundColor Yellow
    $chromeFound = $false

    # Common Chrome installation paths
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
    )

    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            Start-Process -FilePath $path -ArgumentList "http://localhost:3000"
            $chromeFound = $true
            break
        }
    }

    if (-not $chromeFound) {
        # Fallback to default browser
        Write-Host "Chrome not found, using default browser..." -ForegroundColor Yellow
        Start-Process "http://localhost:3000"
    }

    Write-Host ""
    Write-Host "Soccer Team Maker is now running!" -ForegroundColor Green
    Write-Host "Data Server PID: $($dataServerProcess.Id)" -ForegroundColor Cyan
    Write-Host "React Server PID: $($serverProcess.Id)" -ForegroundColor Cyan
    Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your data is backed up to: soccer-data.json" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press any key to stop both servers and exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

    # Stop both server processes
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $dataServerProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure Node.js and npm are installed and the project dependencies are installed."
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

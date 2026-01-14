# Create Desktop Shortcut for Soccer Team Maker
Write-Host "Creating desktop shortcut for Soccer Team Maker..." -ForegroundColor Green

try {
    # Get desktop path
    $desktopPath = [System.Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktopPath "Soccer Team Maker.lnk"
    
    # Create WScript Shell object
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    
    # Set shortcut properties
    $Shortcut.TargetPath = "C:\Users\guysa\Documents\Soccer-team-maker\start-soccer-app.bat"
    $Shortcut.WorkingDirectory = "C:\Users\guysa\Documents\Soccer-team-maker"
    $Shortcut.Description = "Launch Soccer Team Maker with local server"
    $Shortcut.IconLocation = "shell32.dll,137"
    
    # Save the shortcut
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "Location: $shortcutPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now double-click 'Soccer Team Maker' on your desktop to:" -ForegroundColor Yellow
    Write-Host "  - Start the local development server" -ForegroundColor White
    Write-Host "  - Open Chrome to http://localhost:3000" -ForegroundColor White
    Write-Host "  - Access your Soccer Team Maker app" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Error creating shortcut: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
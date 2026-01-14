Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Soccer Team Maker.lnk")

' Set shortcut properties
oShellLink.TargetPath = "C:\Users\guysa\Documents\Soccer-team-maker\start-soccer-app.bat"
oShellLink.WorkingDirectory = "C:\Users\guysa\Documents\Soccer-team-maker"
oShellLink.Description = "Launch Soccer Team Maker with data backup"
oShellLink.IconLocation = "C:\Windows\System32\shell32.dll,137"

' Save the shortcut
oShellLink.Save

WScript.Echo "Desktop shortcut created successfully!"

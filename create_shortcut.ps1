$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Hangly.lnk"
$targetExe = "c:\Hangly for windows\Hangly-main\Hangly.exe"
$workDir = "c:\Hangly for windows\Hangly-main"
$icon = "c:\Hangly for windows\Hangly-main\Hangly.ico"

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($shortcutPath)
$s.TargetPath = $targetExe
$s.WorkingDirectory = $workDir
$s.Description = "Hangly for Windows - A tiny piece of motion for your desktop"
$s.IconLocation = "$icon,0"
$s.Save()

Write-Output "Shortcut created at: $shortcutPath"
Write-Output "Exists: $(Test-Path $shortcutPath)"

Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Hangly.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "c:\Hangly for windows\Hangly-main\Hangly.exe"
oLink.WorkingDirectory = "c:\Hangly for windows\Hangly-main"
oLink.Description = "Hangly for Windows"
oLink.IconLocation = "c:\Hangly for windows\Hangly-main\Hangly.ico, 0"
oLink.Save
WScript.Echo "Shortcut created successfully on Desktop: " & sLinkFile

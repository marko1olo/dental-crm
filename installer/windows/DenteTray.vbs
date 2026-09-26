' DENTE Dental CRM — Invisible Tray Monitor Launcher
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPs1Path = objFSO.BuildPath(strScriptDir, "DenteTray.ps1")

strCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPs1Path & """"
objShell.Run strCmd, 0, False

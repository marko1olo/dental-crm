Get-WmiObject Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId, CommandLine

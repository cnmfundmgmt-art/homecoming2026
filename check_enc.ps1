$files = @(
    'public\index.html',
    'public\book.html',
    'public\admin.html',
    'public\checkin.html',
    'server.js',
    'database.js'
)
foreach ($f in $files) {
    $full = "C:\Users\000\.openclaw\workspace\homecoming-2026\$f"
    if (Test-Path $full) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $bom3 = ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
        $bom4 = ($bytes.Count -ge 4 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE)
        $content = [System.Text.Encoding]::UTF8.GetString($bytes)
        $garbled = $content -match 'σ¢₧|τ¡╣|µÄÑ|Σ╣ë'
        Write-Host "$f : UTF8-BOM=$bom3 UTF16-BOM=$bom4 garbled=$garbled"
        if ($garbled) { Write-Host "  GARBLED! Need fix" }
    } else {
        Write-Host "$f : NOT FOUND"
    }
}

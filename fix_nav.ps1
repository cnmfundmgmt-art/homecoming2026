$content = Get-Content "C:\Users\000\.openclaw\workspace\homecoming-2026\public\index.html" -Raw
[regex]::Replace($content, '订座 Book Table', '入席 Seat Booking', 'Literal')
[regex]::Replace($content, '?? Book Table', '入席 Seat Booking', 'Literal')
[regex]::Replace($content, '?? Book', '入席', 'Literal')
[regex]::Replace($content, 'you can now book your table', 'you can now book your seat', 'IgnoreCase')
[regex]::Replace($content, 'book your table', 'book your seat', 'IgnoreCase')
Set-Content "C:\Users\000\.openclaw\workspace\homecoming-2026\public\index.html" -Value $content -NoNewline
Write-Host "Done"

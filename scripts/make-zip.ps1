# אורז את dist לקובץ ZIP להעלאה ל-Chrome Web Store.
# לא משתמשים ב-Compress-Archive: הוא יוצר נתיבים פנימיים עם backslash,
# וזה שובר את החילוץ בכלים שאינם Windows.

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$zipPath = Join-Path $root 'modesty-filter.zip'

if (-not (Test-Path $dist)) {
    Write-Error 'לא נמצאה תיקיית dist. יש להריץ npm run build קודם.'
    exit 1
}
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $prefix = (Resolve-Path $dist).Path.TrimEnd('\') + '\'
    foreach ($file in Get-ChildItem -Path $dist -Recurse -File) {
        # נתיב פנימי יחסי, תמיד עם סלאש קדמי
        $relative = $file.FullName.Substring($prefix.Length).Replace([string][char]92, '/')
        # תמונות הדוגמה של סביבת הבדיקה אינן חלק מהתוסף
        if ($relative.StartsWith('devtest/')) { continue }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $file.FullName, $relative,
            [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally { $zip.Dispose() }

# אימות: אסור שיישאר backslash באף entry
$check = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$bad = @($check.Entries | Where-Object { $_.FullName.Contains([string][char]92) }).Count
$count = $check.Entries.Count
$check.Dispose()

if ($bad -gt 0) {
    Write-Error "נמצאו $bad רשומות עם backslash — הזיפ פגום."
    exit 1
}
Write-Output "נוצר modesty-filter.zip עם $count קבצים, כל הנתיבים תקינים."

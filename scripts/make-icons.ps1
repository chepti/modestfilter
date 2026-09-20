# יוצר את אייקוני התוסף (PNG בארבעה גדלים) אל public/icons.
# מגן עם וי — אותו מוטיב כמו האייקונים בממשק, בסגנון Lucide.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'public\icons'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out -Force | Out-Null }

$brand = [System.Drawing.Color]::FromArgb(255, 59, 91, 219)

foreach ($size in 16, 32, 48, 128) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = $size / 24.0

    # גוף המגן
    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = @(
        (New-Object System.Drawing.PointF(([single](12 * $s)), ([single](2 * $s)))),
        (New-Object System.Drawing.PointF(([single](20.5 * $s)), ([single](5.5 * $s)))),
        (New-Object System.Drawing.PointF(([single](19 * $s)), ([single](14 * $s)))),
        (New-Object System.Drawing.PointF(([single](12 * $s)), ([single](22 * $s)))),
        (New-Object System.Drawing.PointF(([single](5 * $s)), ([single](14 * $s)))),
        (New-Object System.Drawing.PointF(([single](3.5 * $s)), ([single](5.5 * $s))))
    )
    $shield.AddClosedCurve($pts, 0.25)
    $brush = New-Object System.Drawing.SolidBrush($brand)
    $g.FillPath($brush, $shield)

    # סימן הווי
    $penWidth = [single][Math]::Max(1.4, 2.1 * $s)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $check = @(
        (New-Object System.Drawing.PointF(([single](8.6 * $s)), ([single](12.1 * $s)))),
        (New-Object System.Drawing.PointF(([single](11 * $s)), ([single](14.5 * $s)))),
        (New-Object System.Drawing.PointF(([single](15.6 * $s)), ([single](9.6 * $s))))
    )
    $g.DrawLines($pen, $check)

    $pen.Dispose(); $brush.Dispose(); $shield.Dispose(); $g.Dispose()
    $path = Join-Path $out "icon-$size.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "נוצר: icon-$size.png"
}

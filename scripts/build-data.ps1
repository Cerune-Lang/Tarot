# Powershell 5.1+; run from the project root:
# .\scripts\build-data.ps1 -CeruneRepo 'C:\dev\Cerune'
param(
    [string]$CeruneRepo = (Join-Path $PSScriptRoot '..\..\Cerune')
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $CeruneRepo -ErrorAction Stop).ProviderPath
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$source = Join-Path $root 'src\export.ceru'
$destination = Join-Path $root 'public\data\cards.txt'
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'cargo was not found. Install Rust/Cargo and add it to PATH.'
}
# Cerune emits UTF-8, including Japanese text. Windows PowerShell needs explicit encoding.
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
Push-Location $repo
try {
    $lines = & cargo run --quiet --locked -- run $source
    if ($LASTEXITCODE -ne 0) { throw "Cerune export failed (exit code $LASTEXITCODE)." }
}
finally { Pop-Location }
$text = ($lines -join "`n") + "`n"
if (-not $text.StartsWith('CERUNE_TAROT')) { throw 'Invalid Cerune export header.' }
# Validate the output before replacing the published snapshot.
$tmp = "$destination.tmp"
try {
    [System.IO.File]::WriteAllText($tmp, $text, $utf8)
    & node (Join-Path $root 'scripts\check-data.mjs') $tmp
    if ($LASTEXITCODE -ne 0) { throw 'Export validation failed.' }
    Move-Item -LiteralPath $tmp -Destination $destination -Force
}
finally {
    if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
Write-Host "Updated $destination (source: src/export.ceru (data: src/cards.ceru))"


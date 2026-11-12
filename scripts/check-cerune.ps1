# Compare the Cerune IR and VM execution outputs for the same source.
param([string]$CeruneRepo = (Join-Path $PSScriptRoot '..\..\Cerune'))
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $CeruneRepo -ErrorAction Stop).ProviderPath
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$source = Join-Path $root 'src\export.ceru'
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'cargo is required.' }
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
Push-Location $repo
try {
    & cargo run --quiet --locked -- check $source
    if ($LASTEXITCODE -ne 0) { throw 'Cerune check failed.' }
    $ir = & cargo run --quiet --locked -- run $source
    if ($LASTEXITCODE -ne 0) { throw 'Cerune IR execution failed.' }
    $vm = & cargo run --quiet --locked -- run-vm $source
    if ($LASTEXITCODE -ne 0) { throw 'Cerune VM execution failed.' }
}
finally { Pop-Location }
if (($ir -join "`n") -cne ($vm -join "`n")) { throw 'IR and VM output mismatch.' }
if (-not $ir[0].Equals('CERUNE_TAROT')) { throw 'Unexpected output header.' }
Write-Host 'PASS: Cerune check + IR/VM output parity.'


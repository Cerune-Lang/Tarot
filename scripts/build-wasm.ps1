# Build the Cerune tarot WebAssembly library on Windows using PowerShell.
# Usage: .\scripts\build-wasm.ps1 -CeruneRepo "C:\path\to\Cerune"
param(
    [string]$CeruneRepo = (Join-Path $PSScriptRoot '..\..\Cerune')
)

$ErrorActionPreference = 'Stop'

foreach ($tool in @('cargo', 'wat2wasm')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "'$tool' was not found. Install it and add it to PATH."
    }
}

$repo = (Resolve-Path -LiteralPath $CeruneRepo -ErrorAction Stop).ProviderPath
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$source = Join-Path $project 'src\tarot.ceru'
$out = Join-Path $project 'public\wasm'
New-Item -ItemType Directory -Force -Path $out | Out-Null

Push-Location $repo
try {
    & cargo run --locked --example wat_library -- $source $out draw_index is_reversed rank_fragment
    if ($LASTEXITCODE -ne 0) {
        throw "Cerune WAT build failed (exit code $LASTEXITCODE)."
    }
}
finally {
    Pop-Location
}

$wat = Join-Path $out 'library.wat'
$wasm = Join-Path $out 'library.wasm'
if (-not (Test-Path -LiteralPath $wat)) {
    throw "Expected WAT output was not generated: $wat"
}
& wat2wasm $wat -o $wasm
if ($LASTEXITCODE -ne 0) {
    throw "wat2wasm failed (exit code $LASTEXITCODE)."
}
if (-not (Test-Path -LiteralPath (Join-Path $out 'library.mjs'))) {
    throw "Expected JS bindings were not generated: $(Join-Path $out 'library.mjs')"
}
Write-Host "Generated $wasm and library.mjs"


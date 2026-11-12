# Build the Cerune CLI used by desktop/CeruneTarot.sln.
# Requires Cerune on PATH and a Windows x64 Clang/MSVC toolchain.
param([string]$Clang = "")
$ErrorActionPreference = 'Stop'

if (-not (Get-Command cerune -ErrorAction SilentlyContinue)) {
    throw 'cerune was not found. Install Cerune and add it to PATH.'
}
if (-not $Clang) {
    $command = Get-Command clang.exe -ErrorAction SilentlyContinue
    if (-not $command) { throw 'clang.exe was not found. Use a VS Developer PowerShell or specify -Clang.' }
    $Clang = $command.Source
}
if (-not (Test-Path -LiteralPath $Clang -PathType Leaf)) {
    throw "clang.exe was not found: $Clang"
}

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$source = Join-Path $root 'src\fortune.ceru'
$nativeDir = Join-Path $root 'desktop\CeruneTarot\native'
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cerune-tarot-" + [Guid]::NewGuid().ToString('N'))

# Cerune requires a new output directory for each Native build.
try {
    & cerune build native $source --target x86_64-pc-windows-msvc --linker $Clang -o $tempDir
    if ($LASTEXITCODE -ne 0) { throw "Cerune Native build failed (exit code $LASTEXITCODE)." }
    $program = Join-Path $tempDir 'program.exe'
    if (-not (Test-Path -LiteralPath $program -PathType Leaf)) { throw "Missing Native executable: $program" }
    New-Item -ItemType Directory -Path $nativeDir -Force | Out-Null
    $dest = Join-Path $nativeDir 'fortune.exe'
    Copy-Item -LiteralPath $program -Destination $dest -Force
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $probe = @(& $dest 1337 3 general)
    if ($LASTEXITCODE -ne 0 -or $probe.Count -ne 18 -or $probe[0] -cne 'CERUNE_TAROT_DRAW' -or $probe[-1] -cne 'END') {
        throw 'Native smoke test failed.'
    }
    Write-Host "OK: $dest"
}
finally {
    if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Force -Recurse }
}

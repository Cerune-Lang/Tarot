# Cerune Tarot

Ceruneで作った、78枚のカードを使うタロット占いアプリです。Web版とWindows版があります。

## セットアップ（Windows/PowerShell）

### 必要なもの

**共通（Web版・Windowsアプリ版）**
- [Git](https://git-scm.com/)
- [Rust / Cargo](https://rustup.rs/)
- [Node.js](https://nodejs.org/)
- [Python 3](https://www.python.org/)
- [Cerune](https://github.com/Cerune-Lang/Cerune)
- [WABT](https://github.com/WebAssembly/wabt)（npmでインストール）

**Windowsアプリ版（追加）**
- [Visual Studio 2022以降](https://visualstudio.microsoft.com/ja/)（.NET デスクトップ開発）
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [LLVM / Clang](https://releases.llvm.org/)
- MSVC C++ビルドツール（C++によるデスクトップ開発）
- Windows SDK

### Ceruneのインストール

最新の`master`をインストールします。

```powershell
cargo install --git https://github.com/Cerune-Lang/Cerune.git --branch master cerune-lang
```

WABTはnpmでインストールします（Scoopでも可）。

```powershell
npm install -g wabt
```

## Web版のビルドと起動

プロジェクトのルートで実行します。

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force

.\scripts\check-cerune.ps1
.\scripts\build-data.ps1
.\scripts\build-wasm.ps1
npm test

cd public
py -c "import http.server; http.server.SimpleHTTPRequestHandler.extensions_map.update({'.mjs':'text/javascript','.wasm':'application/wasm'}); http.server.test(port=8787, bind='127.0.0.1')"
```

[http://127.0.0.1:8787](http://127.0.0.1:8787) で確認できます。

## Windowsアプリ（WPF）

Visual StudioのWPF開発環境（.NET 10）とClang / Windows SDKが必要です。
プロジェクトのルートから実行します。

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\build-native.ps1
```

`desktop/CeruneTarot.sln` をVisual Studioで開いて実行します。
GUIはCerune Nativeの `fortune.exe` を起動し、標準出力から結果を受け取ります。

CLIだけでも試せます。

```powershell
.\desktop\CeruneTarot\native\fortune.exe 1337 3 general
```

## 構成

```text
src/main.ceru     エントリポイント
src/cards.ceru    カードと解釈文
src/export.ceru   配信用データの出力
src/tarot.ceru    Web/Native共通の占いロジック
src/fortune.ceru  Native占いのエントリポイント
public/           静的Webサイト
desktop/          Windows WPFアプリ
```

Wasmビルドでは、プロジェクト内のビルダーがCargo経由でCeruneのRust APIを取得します。

# 肉食プランナー iOS統合版

既存の2つのHTML計算機をローカル同梱し、Capacitor 8でiOSアプリ化。元のGitHub Pagesは変更しません。署名なしビルドはGitHub Actions、実機インストールは登録後TestFlightを利用します。Windows利用者にローカルXcodeは不要です。

## 起動と検証

Node.js 22以上とnpmを用意し、リポジトリのnative-appで実行：

```powershell
cd native-app
npm ci
npm run build
npm run dev
```

表示URLは http://127.0.0.1:5173 。ビルド成果物はdist。devは変更確認用で、iOSにはdistをコピーします。初回は必ずbuildを行い同梱計算機を生成します。

今回のWindows環境はNodeのみでnpmがPATHにないため、次の補助コマンドも用意しています。npmを利用者のローカルキャッシュへ取得し、整合性検証後に実行します。Gitには保存しません。

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-Planner.ps1 -Task dev
powershell -ExecutionPolicy Bypass -File .\Start-Planner.ps1 -Task build
powershell -ExecutionPolicy Bypass -File .\Start-Planner.ps1 -Task test
powershell -ExecutionPolicy Bypass -File .\Start-Planner.ps1 -Task sync
```

```powershell
npx playwright install chromium
npm test
npx cap sync ios
npm audit
```

iOSプロジェクトは既にios/App/App.xcodeprojを生成済み。`npx cap add ios` は新規作成時だけ実行し、既存プロジェクトには再実行しません。`npm run build` の後に `npx cap sync ios` を行います。

## Macなしのビルド

GitHub Actions `iOS unsigned validation` は feat/unified-ios へのpush／PRで実行。Xcode 26.3を明示し、署名なしiPhone向けコンパイル、シミュレーター向けコンパイル、起動、起動画面スクリーンショット、ブラウザ回帰テストを行います。結果はActionsのArtifacts。署名なし.appはiPhoneへ直接インストールできません。

GitHub CLIを使う場合（認証後）：

```powershell
git push -u origin feat/unified-ios
gh run list --workflow ios-unsigned.yml --branch feat/unified-ios
gh run view RUN_ID --log-failed
gh run download RUN_ID
```

手動起動はworkflowがデフォルトブランチに存在してから利用可能。そこへ統合しても元のindex.htmlは変わりません。既存Pagesの公開元は変更しません。

クラウドで実行する主要コマンド：

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ios/DerivedData-device CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
```

## 構成

- vendor：取得時点のHTML、sw.js、manifest.webmanifest、画像を完全保存。sources.jsonのSHA-256で毎回のbuild時に検証
- scripts/prepare.mjs：原本から保存APIとネイティブ用の表示のみ調整してpublic/plannersへ生成
- src：統合UI、永続化、履歴、バックアップ、共有、アダプター
- ios：生成済みネイティブプロジェクト、起動画面、アイコン、Privacy Manifest
- ../.github/workflows：署名なし検証と登録後の署名・TestFlight
- docs/AUDIT.md：既存機能、キー、通信、計算根拠、SDK調査
- docs/RELEASE.md：本人操作、署名、TestFlight、申請、費用
- docs/STORE.md：説明文、審査メモ、スクリーンショット
- docs/VALIDATION.md：実施結果と未実施事項

Bundle ID `jp.neocarnivore.planner.preview` は仮設定。正式登録時にcapacitor.config.jsonとXcodeのPRODUCT_BUNDLE_IDENTIFIERを同じ正式IDへ変更します。署名付きworkflowではGitHub Environment変数IOS_BUNDLE_IDから両方を変更します。一度配布したアプリのIDを後から変えると別アプリになり、保存データは引き継げません。

## ブラウザ版データの取り込み

ブラウザとアプリのデータ領域は独立。Windowsのブラウザで元の各サイトを開き、開発者ツール（F12）→Consoleでscripts/browser-backup.jsの内容を確認して実行すると、既知のプリセットキーだけをJSONへ出力します。内容を理解できないコードを貼り付けないでください。ダウンロードしたファイルをiCloud Drive等でiPhoneへ送り、アプリの設定→記録を読み込む。各プリセットが追加の履歴になり、再編集できます。元サイトへのスクリプト追加や公開変更は必要ありません。元サイトに日付履歴はないため、それは取り込めません。Safari/iPhoneだけでの旧版書き出しUIは元サイトへの追加が必要で、初版の対象外です。

履歴は最大500件、合計約1.5MB。JSONは暗号化されません。端末変更・アンインストール前は必ず書き出してください。

# 検証結果 — 2026-10-15

## このWindows環境で実施

- 元の2リポジトリ取得、SHA固定、AGENTS.md確認、作業ブランチfeat/unified-ios。既存の公開Web版4ファイルに変更なし。
- Node 24.19.0、npm 12.2.0（補助取得）で依存解決・ロック生成。Capacitor 8.5.3でiOSプロジェクト生成、SPM依存生成、cap sync成功。
- Vite本番ビルド成功。HTML/CSS/JS/画像をdistおよびiOS publicにコピー。server.urlなし、Service Workerなし、外部CDNなし。
- Xcodeプロジェクトをxcode npmパーサーで読込成功、PrivacyInfo.xcprivacyのResources登録、iPhone専用指定を確認。これはコンパイル成功を意味しない。
- npm audit：0 vulnerabilities。xcode→uuidを11.1.1にoverrideし、Capacitor syncとXcodeパース・UUID生成が正常。
- Playwright Chromium：5テスト成功（最終更新後の結果は実行ログを参照）。計算比較の数値はcalculation-results.json。

## 自動テストの範囲

| テスト | 内容 |
|---|---|
| 計算比較 | 肉食4ケース：維持、女性Lion、筋トレKetovore減量、TKD休息日増量。移行食4ケース：糖質150〜200、100以下、筋トレ200〜250、主食から推定。BMR/TDEE/BMI、PFC、電解質、食品表示、期間を元HTMLと比較 |
| 保存操作 | 日付保存、reload、モード切替、再編集上書き、JSON書き出し、取り込み追加、不正バージョン拒否、全削除後のreload |
| 通信・表示 | 外部リクエスト遮断、外部通信が発生しないこと、横幅320/390/440、ライト／ダーク設定 |
| オフライン | ChromiumのネットワークOFFで全要求をローカルdistバイト列から供給。初回起動・計算・保存・reload・移行食切替。ネイティブ同梱方式のWeb資産検証であり、iPhone機内モード試験の代替とはしない |
| 状態復元 | 同じモードで現在入力と異なる過去履歴を復元、曜日別運動／休息設定を保存・再起動 |

例：男性35歳175cm75kg・運動なし・Carnivore維持は両版ともBMR 1,674、TDEE/エネルギー2,009、P124g/F166g/C5g（表示丸め）。これは移植の同等性確認であり、医学的妥当性の証明ではない。

起動画面と設定画面のブラウザ画像を目視確認し、小画面の目標ボタン折返し・ファイル入力幅を調整。実機のDynamic Typeやソフトキーボードはまだ確認していない。

## GitHub Actionsで実施したiOS検証

2026-10-15、neocarnivore認証後にfeat/unified-iosを送信。mainと既存サイトのファイルは変更していない。

- 成功したRun：https://github.com/neocarnivore/carnivore-planner/actions/runs/38704226994
- 検証コミット：5354b316f53a32718e6572373221a7418c2be339
- 環境：GitHub-hosted macos-15 / Xcode 26.3（17C529）、iOS Simulator 26.2 / iPhone 17 Pro。
- 原本8ファイルのSHA-256検証、元JavaScript全6ブロックの一致検証、Webビルド、Playwright 5テストが成功。
- Release / generic iOSの署名なしビルドと、Debug / iOS Simulatorのビルドが成功。両ログにBUILD SUCCEEDEDを確認。
- シミュレーターへインストール・起動後、計算機アダプターの読み込み完了をWKWebViewから確認。診断結果：stage=ready、error=null、frameReady=true、headerTop=62。
- 取得画像で計算機の入力画面とノッチ下のヘッダーを目視確認。画像はscreenshots/ios-simulator-launch.png、診断はios-launch-diagnostics.json。
- 初回Run 38702912841はビルドと起動コマンド自体は成功したが、5秒後の画像は初期化未完了でヘッダー重なりもあった。固定待機をやめ、画面の初期化完了判定とネイティブ安全領域の反映を追加し、上記Runで再確認した。
- SDK側のAppIntents未使用に関するメタデータ抽出警告はあるが、コンパイルエラーはない。

## 未実施・保留

- Windowsローカルでxcodebuildは実行不能だが、上記クラウドでコンパイルと起動を実施した。実機は未使用。
- シミュレーターの検証は初期画面の読み込み・安全領域の確認まで。シミュレーターでの両モードの操作・計算・保存・共有の自動操作は未実施（Web側はPlaywrightで検証済み）。
- ネイティブPreferences（UserDefaults）のOS再起動後・更新後保持、Shareシート、Files選択とCache削除、外部ブラウザ、実機のノッチ／ホーム領域、数値キーボード、VoiceOver、システム文字サイズ、iPhone機内モード起動は未実施。
- 署名証明書・Profile・APIキーの設定と署名付きIPA・TestFlightは本人登録前のため未実施。署名workflowは未実行の準備構成。
- App Store審査、App Privacy検証、Archive Privacy Report確認、ストア用画像撮影、公開Privacy/Support URL、計算根拠の専門レビューは未完了。審査通過は保証しない。

## 再検証

```sh
npm ci
npm run build
npx playwright install chromium
npm test
npx cap sync ios
npm audit
```

ActionsのArtifacts（ios-validation-2）にはビルドログ、シミュレーター画像、診断JSON、ランタイムログ、Webテストレポートを保存（7日間）。主要な画面画像と診断結果は本リポジトリにも保存している。今後の検証はRun URL・コミット・結果を追記する。

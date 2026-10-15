# Macなしでの公開手順

2026-10-15に公式仕様を確認。まず署名なし検証を通し、その後に有料登録と署名へ進む。本書の署名付き工程は設定例で、本人の登録・証明書を使った実行検証は未実施。

## 1. 費用と今必要な操作

- 公開リポジトリの標準GitHub-hosted runnerは無料。今回のmacos-15が対象。larger runnerを選択しない。Artifactsは7日で削除。非公開リポジトリは無料枠・OS別料金・容量課金の条件が異なるため、有料利用前にSettings → Billing & licensing → Budgets and alertsで上限を確認。
- Apple Developer Programは年99米ドル、地域通貨・税等は本人の申込画面の表示で確定。TestFlight/App Store配布には加入が必要。署名なしActionsには不要。
- Codemagic等の別の有料ビルドサービスは契約しない。Macの購入・レンタルも初期工程には不要。
- 最初の本人操作はGitHub認証だけ。https://github.com/login/device を開き、案内された有効期限内のコードを入力。右上のアカウントがneocarnivoreであることを確認してGitHub CLIを許可。コードが失効したら `gh auth login --hostname github.com --git-protocol https --web` を再実行。パスワードやトークンをチャットに貼らない。

https://docs.github.com/en/billing/concepts/product-billing/github-actions

https://developer.apple.com/programs/

## 2. 署名なしビルドを確認

GitHub → neocarnivore/carnivore-planner → ブランチfeat/unified-ios → Actions → iOS unsigned validation。pushで実行される。緑のチェック、`Compile for iPhone without signing`、`Compile and launch simulator`を確認。Artifacts → ios-validation-番号をダウンロードし、device-build.log、simulator-build.log、simulator-launch.pngを確認。エラー時は失敗した工程のログを使用。

ワークフローはXcode 26.3、macos-15を指定。Xcodeがランナーから削除されたら、公式runner-images一覧で利用可能な26以上を選び、両workflowのDEVELOPER_DIRを同時更新。2026-04-28以降はApp Store Connect提出にiOS 26 SDK以上が必要。iOS最小実行対象は生成プロジェクトの15以上。申請直前にSDK要件を再確認。

https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md

https://developer.apple.com/news/?id=ueeok6yw

## 3. Appleへの登録（署名なし成功後・本人操作）

Windowsのブラウザで https://developer.apple.com/programs/enroll/ → Start Your Enrollment。本人のApple Accountでログインし2ファクタ認証、氏名・住所・電話等を入力、個人／組織の種別を選択。組織は法的主体名・D-U-N-S等が必要。契約内容と年会費表示を確認した本人だけが契約・支払いを実行。App Storeに表示される販売者名も確認する。iPhoneのApple Developerアプリから登録できる地域ではそちらも利用可能。

## 4. Bundle IDとApp Store Connect

developer.apple.com/account → Certificates, Identifiers & Profiles → Identifiers → ＋ → App IDs → App → Description「肉食プランナー」→ Bundle IDはExplicit。例として `jp.neocarnivore.planner` を本人が正式に選び、重複していないことを確認。HealthKit、Push、iCloud等のCapabilitiesを追加しない。仮IDは登録しない。

App Store Connect → My Apps（アプリ）→ ＋ → New App：Platform iOS、Name 肉食プランナー（空き状況次第）、Primary language Japanese、登録したBundle ID、SKU（例 carnivore-planner-ios-001）、User Accessを入力。名前・カテゴリ・年齢区分は本人が確定。Membership detailsにあるTeam IDも控える。

GitHub → リポジトリ → Settings → Environments → New environment → `app-store`。可能ならRequired reviewersを本人にし、署名付き実行を保護。Environment variablesを追加：`IOS_BUNDLE_ID`（正式ID）、`IOS_TEAM_ID`（10文字のTeam ID）。署名workflowが両方の設定ファイルへIDを適用する。仮IDのままTestFlightへ送らない。

## 5. Macなしで配布証明書を作る

WindowsのGit for Windowsに同梱されるOpenSSL等を使用。秘密鍵はリポジトリ外の本人専用フォルダーに作る。例としてPowerShellで次を実行する（OpenSSLはPATH設定済みと仮定）。これはローカル操作であり秘密値をチャットへ送らない。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\AppleSigning" | Out-Null
Set-Location "$env:USERPROFILE\AppleSigning"
openssl genrsa -aes256 -out distribution.key 2048
openssl req -new -key distribution.key -out distribution.csr -subj "/CN=Planner Distribution/emailAddress=YOUR_EMAIL"
```

パスフレーズは本人が対話入力。YOUR_EMAILを本人のメールへ変更。Apple Developer → Certificates → ＋ → Software → Apple Distribution → Continue → Choose Fileでdistribution.csrをアップロード → Generate → distribution.cerをダウンロードし同じ専用フォルダーへ保存。

```powershell
openssl x509 -inform DER -in distribution.cer -out distribution.pem
openssl pkcs12 -export -inkey distribution.key -in distribution.pem -out distribution.p12
```

Export Passwordは強い値を本人が対話入力。p12は秘密鍵を含む。CSR、cer、pemと違い特に厳重に保管する。キーチェーンのないWindowsでも証明書の秘密鍵とp12は作成可能。有効期限・失効時は作り直す。

## 6. Provisioning Profile

Apple Developer → Profiles → ＋ → Distribution → App Store Connect → 正式App ID → 先ほどのApple Distribution証明書を選択 → Profile Name（例 Planner App Store）→ Generate → Download。App Store Connect用でありAd Hoc/Developmentではない。TestFlightではiPhone UDID登録は不要。Profileは証明書、Team ID、Bundle IDと一致する必要がある。

## 7. GitHub Secretsへ保存

GitHub Settings → Environments → app-store → Environment secrets → Add environment secret：

| 名前 | 値 |
|---|---|
| IOS_CERTIFICATE_P12_BASE64 | distribution.p12のbase64 |
| IOS_CERTIFICATE_PASSWORD | p12のExport Password |
| IOS_PROFILE_BASE64 | .mobileprovisionのbase64 |

base64は暗号化ではない。PowerShellでクリップボードへ直接入れ、Secrets欄へ貼る例：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\AppleSigning\distribution.p12")) | Set-Clipboard
```

Profileも同じ方法で絶対パスを変える。貼り付け後は `Set-Clipboard -Value ''`。クリップボード履歴・クラウド同期は本人が確認。秘密値をWrite-Outputしたりスクリーンショットに含めたりしない。Gitへ一度でも入れた場合は削除コミットだけで済ませず失効・再発行する。

## 8. App Store Connect APIキー（アップロードを行う段階）

App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → Generate API Key。初回はAccount HolderがAPIアクセスを要求・承認する必要がある場合がある。Name「GitHub Planner Upload」、Accessは配布に必要なApp Managerを選択し、不要なAdminは避ける。Download API Keyで.p8を取得（通常一度しか取得できない）。Key IDとIssuer IDも控える。

Environment secretsに `ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_PRIVATE_KEY_BASE64`（.p8をbase64化）を追加。署名だけ作る初回はAPIキー不要。APIキーは.p12の代わりではない。証明書・Profileは別途必要。不要になったキーは同画面でRevoke。

## 9. 署名付きビルドとTestFlight

署名なし成功を確認してから、workflowをデフォルトブランチにマージし、Actions → iOS signed TestFlight → Run workflow。最初はuploadをオフにして署名・IPA出力だけ確認。次にオンで実行しApp Store Connectへアップロード。`app-store`の承認者設定がある場合はReview deployments → Approve and deploy。秘密値はログに表示されない。署名済みIPA Artifactは1日保持。

App Store Connect → アプリ → TestFlight → ビルド処理完了を待つ → Missing Complianceがあれば暗号利用の実態に従って回答。本アプリには独自暗号・通信SDKなし、Info.plistのITSAppUsesNonExemptEncryptionはfalse。将来SDK追加時は再評価する。

Users and Accessで本人を適切なユーザーにし、TestFlight → Internal Testing → ＋でグループ作成 → 本人ユーザーとビルドを追加。iPhoneでApp StoreからAppleのTestFlightを入れ、招待リンク／メールを開きAccept → Install。外部テスターに広げる場合はベータ審査とテスト情報が必要。App Storeの最終申請はまだ行わない。

https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/

## 10. iPhoneで本人が確認すること

1. TestFlightから起動。肉食・移行食で計算、日付保存、履歴再編集、プリセット保存、週の日程変更、共有、JSONをファイルへ書き出し・読み込み。
2. 保存後アプリを終了し、機内モードにしてWi-Fiもオフ → 再起動。計算、両モード、保存済み記録閲覧を確認。
3. TestFlightの次ビルドへ更新し、削除せず入力と履歴が残ることを確認。アンインストールすると消える。
4. iPhone 設定 → 画面表示と明るさ → ライト／ダーク、設定 → アクセシビリティ → 画面表示とテキストサイズ／さらに大きな文字で確認。VoiceOverでラベルを確認。
5. 最小画面、最大画面、ノッチ、ホームインジケーター、横向き、数値キーボードを開いたままの入力と計算。別サイズの実機がなければクラウドシミュレーターの追加検証で補う。
6. 共有先へ渡る内容を確認。キャンセル、ファイル選択キャンセル、不正JSON、容量上限、全削除、再起動後の空状態を確認。

## 11. App Store申請（本人の最終操作）

公開用の運営者名・連絡先・サポートURL・プライバシーURLを確定し、原稿を公開してアプリ内の草案表記を正式版へ更新。実機検証と計算根拠レビューを完了。

App Store Connect → アプリ → Distribution → iOS Appバージョン：説明文、キーワード、スクリーンショット、カテゴリ、著作権、Support URL、Privacy Policy URLを入力。App Privacyでは現行実装の端末内処理とSDK・送信実態を確認して回答。現行アプリの運営者による収集はない想定だが、本人が事実確認する。Apple標準診断は別枠。年齢区分の新質問票へ正確に回答。App Review Informationに担当者の連絡先、ログイン不要、審査メモを入力。ビルドを選択しAdd for Review、内容を確認してSubmit to App Review。承認後のReleaseはManualを選ぶと本人が公開時期を決められる。

医療・健康説明（1.4.1）、十分なアプリ機能（4.2）、Privacy（5.1）、最新SDKとプライバシー申告が審査対象。オフライン同梱・履歴・ネイティブ共有はあるが、審査通過は保証しない。

## Xcode画面での設定（参考、本人のMac操作は不要）

将来Macを使う開発担当者向け：App.xcodeproj → TARGETS App → Signing & Capabilities → Team、Bundle Identifier、Signing Certificate、Provisioning Profile。本構成ではその設定をActionsのxcodebuild引数と正式ID適用スクリプトで置き換える。ローカルXcodeのAccountsへの本人ログインは要求しない。

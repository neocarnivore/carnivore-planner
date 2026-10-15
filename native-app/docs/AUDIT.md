# 調査記録 — 2026-10-15

取得元と固定コミット：

| モード | リポジトリ | SHA |
|---|---|---|
| 肉食 | https://github.com/neocarnivore/carnivore-planner | f290e896042d60707f9db7f7b474cc425ea65a3f |
| 移行食 | https://github.com/neocarnivore/Pre-Carnivore-Transition-Diet | 76b574ebc0e8b6f264370e3f30239fdb0bc51e59 |

両者とも index.html にCSS、JavaScript、食品データ、SVG/Canvasグラフを内包。元リポジトリにはAGENTS.md、package.json、ライセンスファイルなし。所有者からの本依頼の範囲で再利用。再配布時は所有者が権利を確認する。ルートのWeb版index.html、manifest、sw.js、アイコンは変更しない。vendor配下に取得時点の原本を保存。

## 機能と構成

肉食：性別、年齢、身長、体重、食事法、糖質上限、活動、タンパク質階層、目標体重。BMR/BMI/TDEE、PFC、食材配分、電解質推計、体重推移、曜日別の運動日／休息日。移行食：現在糖質（不明時は主食量から推定）、活動等から移行期間、日ごとの糖質・食材配分とグラフ。共通：条件プリセット保存・再編集・名称変更・削除、ライト／ダーク、入力リセット。

## 保存キー

| 種別 | 肉食 | 移行食 |
|---|---|---|
| localStorage | planner_presets_v1 / planner_last_preset_v1 | transition_planner_presets_v1 / transition_planner_last_preset_v1 |
| 共通localStorage | theme | theme |
| sessionStorage | plannerAutoForm / autocalc / skipOpeningOnce | transitionAutoFormV7 / autocalc / skipOpeningOnce |

元版は名前付きプリセットをlocalStorage、画面遷移用入力をsessionStorageに保存。統合版ではPreferencesの `neocarnivore.planner.v1` にスキーマ番号、mode、appearance、storage.meat、storage.transition、drafts、plansをJSONで保持。旧API参照はビルド時に親の同期アダプターへ差し替え、書き込みを直列化してPreferencesへ保存。一時キーもモード別。初期読込完了後に計算機を起動し、壊れた保存データは自動上書きしない。

UserDefaultsは軽量保存に適するため、初版では履歴500件・合計約1.5MBを上限に設定。大容量の継続記録が必要な将来版はSQLite等へスキーマ移行する。専用暗号化はない。アンインストールで失われる。OSのバックアップ設定によってバックアップに含まれることがある。更新時にキーやBundle IDを変更しない。実際のアップグレード継続保持は実機で要検証。

## 通信・リンク・権限

取得したHTMLにfetch、XHR、WebSocket、外部script/CDN/fonts、広告、解析、認証、課金ライブラリはない。YouTubeのVirta Health、The Noakes Foundationへの参考リンクが各1件あるが、特定の係数を検証できる引用ではない。統合版では未検証の医学的裏付けの表現とともに除去。将来のHTTP/HTTPSリンクはBrowserプラグインへ渡す。バンドル内のプライバシー／サポートはローカルHTML。

元版のsw.jsとmanifestは同梱しない。現時点の元HTMLにはservice worker登録コードがない。生成物にも登録なし。開発用server.url、allowNavigationなし。端末のカメラ、写真、連絡先、位置情報、HealthKit、通知等は要求しない。インポートはユーザー選択のファイル、エクスポートはCache上の一時ファイルを共有後削除。共有先への送信はユーザー操作。

## 計算根拠の扱い

BMRのコードは男性 `10*w + 6.25*h - 5*age + 5`、女性は末尾 `-161`。一般にMifflin–St Jeor式として知られる形であるが、元版は原論文や対象集団の検証情報を添えていない。式があることはカーニボア食や個別の結果の安全性・有効性の証拠ではない。

式の照合候補：Mifflin et al., A new predictive equation for resting energy expenditure in healthy individuals, 1990, PMID 2305711（https://pubmed.ncbi.nlm.nih.gov/2305711/）。本作業では原論文本文の検証・対象集団との適合性評価は未実施。参照先があるだけで元版全体の根拠とはしない。

AF、日別補正、目標補正、F:P比、脂質下限0.6g/kg、糖質量、食品構成比、電解質推計、糖質を減らす速度、体重予測などは元版の独自モデルとして保持。移行食は脂質下限の加算で表示エネルギーがTDEEと一致しない場合がある（元コードに明記）。本移植で改善・医学的検証したと主張しない。小児、妊産婦、疾患、服薬との適合性は検証していない。公開前に専門家のレビューと、Apple 1.4.1に沿う計算方法・出典の詳細確認が必要。

## 同梱依存関係

Capacitor core/cli/ios 8.5.3。Preferences 8.0.1、Share 8.0.3、Browser 8.0.5、Filesystem 8.1.4。Viteはビルド専用、Playwrightはテスト専用。package-lock.jsonを保存。CLI間接依存xcodeのuuidをCommonJS互換の11.1.1へ限定override（xcodeはv4のみ使用）。npm audit再確認とCapacitor syncで互換性を確認する。

Privacy ManifestはUserDefaults CA92.1とFilesystemのFileTimestamp C617.1を明記し、Xcode Resourcesに追加。Capacitor自身のManifestもSDK内にある。SDKの将来変更、Archiveの統合Privacy Report、App Store側の警告はリリース前に再確認。

公式参照：

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/apis/preferences
- https://capacitorjs.com/docs/apis/filesystem
- https://capacitorjs.com/docs/apis/share
- https://developer.apple.com/app-store/review/guidelines/

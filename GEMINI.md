# Misskey -n1l Fork Customization & Maintenance Guide (GEMINI.md)

このドキュメントは、本フォークリポジトリ（`-n1l`）における独自機能の仕様および過去のメンテナンス（マージ・アップデート）作業の記録をまとめたものです。

---

## 🚀 独自カスタマイズ機能

### 1. インスタンスティッカー表示のカスタマイズ (`instanceTickerStyle`)
リモートユーザーのノートに表示される「インスタンスティッカー（所属サーバーの表示）」の見た目を、ユーザー設定から切り替えられるように拡張した独自機能です。

#### ■ 概要と表示スタイル
通常の設定に加えて、設定画面から以下の3つのスタイルを選択できます。

| スタイル値 | 表示されるコンポーネント | 挙動・特徴 |
| :--- | :--- | :--- |
| `default` | `MkInstanceTicker` | 標準のインスタンスドメイン情報などを表示。 |
| `minimal` | `MkInstanceTickerMini` | 最小限のレイアウトでティッカー情報を表示。 |
| `icon` | `MkNoteHeader` (`showInstance`) | ユーザーヘッダー内に所属サーバーのアイコン（ファビコン）のみをインライン表示。 |

#### ■ 技術的構成・データ構造
* **設定値の管理場所**: `prefer.s.instanceTickerStyle`
  * ※以前は `store.s.instanceTickerStyle` でしたが、Misskey 2026.7.0 へのアップデートに伴い `prefer`（Pizzax/Preferences）側に移行されました。
  * デフォルト値は `'icon'` で、`'default' | 'minimal' | 'icon'` のいずれかを持ちます。
* **定義ファイル**:
  * [`packages/frontend/src/preferences/def.ts`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/preferences/def.ts#L274) で設定スキーマを定義しています。
* **関連コンポーネント**:
  * **[`MkNote.vue`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/components/MkNote.vue)**: `tickerStyle` の設定値に基づき、テンプレート内で描画するコンポーネントを切り替えます。
  * **[`MkInstanceTickerIcon.vue`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/components/MkInstanceTickerIcon.vue)**: インスタンスのテーマカラーやファビコンを描画するアイコン用コンポーネントです。

### 2. 投稿フォームでの公開範囲・連合設定のキーボードショートカット
投稿フォームが開いている際に、特定のキーボードショートカットを押すことで、投稿の公開範囲や「連合なし（ローカルのみ）」設定を素早く切り替えることができる独自機能です。

#### ■ ショートカットキーと動作一覧
投稿入力中に以下のショートカットキー（Macの場合は `Command`、Windows/Linuxの場合は `Ctrl` を押しながら）を使用できます。

| キー | 動作内容 |
| :--- | :--- |
| `Ctrl / Cmd + m` | 投稿の公開範囲を **「パブリック (Public)」** に変更 |
| `Ctrl / Cmd + ,` | 投稿の公開範囲を **「ホーム (Home)」** に変更 |
| `Ctrl / Cmd + .` | 投稿の公開範囲を **「フォロワー限定 (Followers)」** に変更 |
| `Ctrl / Cmd + /` | **「連合なし（ローカルのみ）」** 設定のオン/オフ（有効/無効）を切り替え |

#### ■ 技術的構成
* **実装箇所**:
  * **[`MkPostForm.vue`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/components/MkPostForm.vue)**: `onKeydown` イベントハンドラ内に追加されたキー検知ロジックによって、リアクティブな変数 `visibility` および `localOnly` の値を変更しています。

---

## 🛠️ メンテナンス・マージ作業記録

### 📅 2026.08.23: 2026.6.0-n1l → 2026.7.0 へのマージ
Misskey本家の上流リリース `2026.7.0` をマージした際、独自機能が消失したりビルドエラーが発生したりするのを防ぐため、以下の移行・修正作業を行いました。

#### 1. 設定保存領域の移行 (`store` から `prefer` への移行)
本家 Misskey のリファクタリングにより、クライアントの設定項目の多くが `store.ts` (`store.s.*`) から `preferences` (`prefer.s.*`) へ移行されました。
これに追従し、独自機能である `instanceTickerStyle` も `prefer.s.instanceTickerStyle` を通して参照するようにコードを更新しました。

* **対応ファイル**:
  * [`store.ts`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/store.ts): 競合していた古い `store` 用の定義ブロックを削除。
  * [`MkNote.vue`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/components/MkNote.vue): `store.s.instanceTickerStyle` から `prefer.s.instanceTickerStyle` へ移行。不要になったインポートを整理しつつ、独自コンポーネントである `MkInstanceTickerMini` などのインポートを維持。
  * [`MkInstanceTickerIcon.vue`](file:///home/n1lsqn/workspaces/misskey/packages/frontend/src/components/MkInstanceTickerIcon.vue): `store.s.instanceTickerStyle` から `prefer.s.instanceTickerStyle` へ移行。

#### 2. バージョン表記の引き上げ
* マージに伴い、ルートの `package.json` および `packages/misskey-js/package.json` のバージョン競合を解決し、**`2026.7.0-n1l`** に更新しました。

#### 3. 動作環境 (Node.js) の制約
* 2026.7.0 の要件変更により、Node.js の最低動作バージョンが **`22.22.2`** (または `24.17.0`, `26.4.0`) 以上に引き上げられました。動作時には実行環境のNode.jsのバージョンをご確認ください。

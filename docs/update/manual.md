## 手動でセットアップしたMisskey(隠れ家フォーク)のアップデート方法

> [!TIP]
> 基本的な操作は[MisskeyHubのドキュメント](https://misskey-hub.net/ja/docs/for-admin/install/guides/manual/#misskey%E3%81%AE%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88%E6%96%B9%E6%B3%95)に記載されている内容と同様です。 

ユーザーの切り替えとディレクトリの移動を行います。

```bash
sudo su - misskey
cd kakurega.app
```

以下のコマンドでアップデートを行います。

```bash
git checkout master-kakurega
git pull
git submodule update --init
NODE_ENV=production pnpm install --frozen-lockfile
NODE_ENV=production pnpm run build
pnpm run migrate
```

正常にアップデートが完了した場合は現在の実行ユーザー(misskey)からexitしておきます。

```bash
exit
```

### サービスの再起動
アップデートの完了後にサービスの再起動を行います。

```bash
sudo systemctl restart misskey
```

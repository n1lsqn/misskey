## Dockerを用いてセットアップしたMisskey(隠れ家フォーク)のアップデート方法

> [!TIP]
> 基本的な操作は[MisskeyHubのドキュメント](https://misskey-hub.net/ja/docs/for-admin/install/guides/docker/#misskey%E3%81%AE%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88%E6%96%B9%E6%B3%95)に記載されている内容と同様です。

リポジトリをクローンしたディレクトリに移動します。

```bash
cd kakurega.app
```

以下のコマンドでアップデートを行います。

```bash
git checkout master-kakurega
git pull
sudo docker compose stop && sudo docker compose up -d
```

## Dockerを用いたMisskey(隠れ家フォーク)のセットアップ方法

> [!TIP]
> 基本的な操作は[MisskeyHubのドキュメント](https://misskey-hub.net/ja/docs/for-admin/install/guides/docker/)に記載されている内容と同様ですが、隠れ家フォークを使用する場合は手順「ビルドと初期化」を行う必要はありません。

> [!NOTE]
> DockerおよびDocker Composeがインストールされていることを前提としています。  
> インストールされていない場合はインストールをした上で、以下の手順に従って操作してください

### 1. リポジトリのクローン

```bash
git clone -b master-kakurega https://github.com/hideki0403/kakurega.app.git
cd kakurega.app
git checkout master-kakurega
```

### 2. configのセットアップ

以下のコマンドで設定ファイルをコピーし、configの編集を行います。  

```bash
cp .config/docker_example.yml .config/default.yml
cp .config/docker_example.env .config/docker.env
cp ./docker-compose_example.yml ./docker-compose.yml
```

基本的には`default.yml`の編集のみで問題ありません。

> [!IMPORTANT]
> `default.yml`内のPostgreSQLの接続に使用するデータベース名、ユーザー名、パスワードを変更した場合は`docker.env`も編集してください。

> [!NOTE]
> 公開するポートを変更する場合は`docker-compose.yml`も編集してください。

### 3. Dockerコンテナの起動

以下のコマンドでMisskeyを起動することができます。


```bash
sudo docker compose up -d
```

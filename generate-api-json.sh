#!/bin/bash

# パッケージのディレクトリパスを定義
backend_dir="packages/backend/"
generator_dir="../misskey-js/generator/"
autogen_dir="../src/autogen/"

# パッケージのディレクトリに移動し、API JSON を生成
cd "$backend_dir" || { echo "エラー: バックエンドのディレクトリに移動できませんでした"; exit 1; }
pnpm generate-api-json || { echo "エラー: API JSON の生成に失敗しました"; exit 1; }

# API JSON を生成したファイルを指定のディレクトリにコピー
cp built/api.json "$generator_dir" || { echo "エラー: API JSON ファイルのコピーに失敗しました"; exit 1; }

# Misskey ジェネレータのディレクトリに移動し、生成を実行
cd "$generator_dir" || { echo "エラー: ジェネレータのディレクトリに移動できませんでした"; exit 1; }
pnpm generate || { echo "エラー: 生成に失敗しました"; exit 1; }

# 生成されたファイルを指定のディレクトリにコピー
cp built/autogen/* "$autogen_dir" || { echo "エラー: 生成されたファイルのコピーに失敗しました"; exit 1; }

echo "処理が正常に完了しました"

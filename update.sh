#!/bin/sh
sudo service misskey stop
git submodule update --init
NODE_ENV=production pnpm install --frozen-lockfile
NODE_ENV=production NODE_OPTIONS='--max-old-space-size=2048' pnpm run build
pnpm run migrate
sudo service misskey restart

#!/bin/sh
git submodule update --init
pnpm install --frozen-lockfile
pnpm run build
pnpm run migrate
pnpm dev
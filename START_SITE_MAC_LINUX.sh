#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo 'Install Node.js 20+ from https://nodejs.org/'; exit 1; fi
printf 'Open http://localhost:4173 in your browser with MetaMask/Coinbase Wallet installed.\n'
node api/server.mjs

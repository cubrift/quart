#!/bin/sh

# Check if .env exists; if not, run setup
if [ ! -f .env ]; then
  echo "No .env found. Running setup utility..."
  node scripts/setup.js
fi

# Hand off to the main app process
exec "$@"
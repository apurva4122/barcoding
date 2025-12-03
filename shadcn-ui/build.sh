#!/bin/bash
set -e

echo "Installing dependencies with pnpm..."
pnpm install

echo "Building with pnpm..."
pnpm run build

echo "Build complete!"


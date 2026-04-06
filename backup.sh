#!/bin/bash
# Codzienny backup CLAUDE_CODE na GitHub

cd /home/kuba/CLAUDE_CODE || exit 1

git add .
git diff --cached --quiet && exit 0  # nic nowego, wyjdź

git commit -m "backup: $(date '+%Y-%m-%d %H:%M')"
git push origin main

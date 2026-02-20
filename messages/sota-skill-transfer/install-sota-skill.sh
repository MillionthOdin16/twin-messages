#!/bin/bash
# install-sota-skill.sh - Install SOTA improvement skill for Ratchet
# Run this script to set up the skill in your .openclaw/skills/

set -e

SKILL_NAME="sota-improvement"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)/sota-improvement"
TARGET_DIR="$HOME/.openclaw/skills/$SKILL_NAME"

echo "🔄 Installing SOTA Improvement Skill for Ratchet"
echo "================================================"
echo ""

# Check if .openclaw exists
if [ ! -d "$HOME/.openclaw" ]; then
    echo "❌ ERROR: ~/.openclaw directory not found"
    echo "   Make sure OpenClaw is installed and initialized"
    exit 1
fi

# Create skills directory if needed
mkdir -p "$HOME/.openclaw/skills"

# Check if skill already exists
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  Skill already exists at $TARGET_DIR"
    read -p "   Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Installation cancelled"
        exit 0
    fi
    rm -rf "$TARGET_DIR"
fi

# Copy skill files
echo "📦 Copying skill files..."
cp -r "$SOURCE_DIR" "$TARGET_DIR"

# Verify installation
if [ -f "$TARGET_DIR/SKILL.md" ]; then
    echo "✅ Skill installed successfully!"
    echo ""
    echo "📍 Location: $TARGET_DIR"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Read the skill: cat $TARGET_DIR/SKILL.md"
    echo "   2. Check examples: cat $TARGET_DIR/examples/session-2026-02-20.md"
    echo "   3. Try a test run (when you have failures or want to improve)"
    echo ""
    echo "📝 Quick reference:"
    echo "   - Trigger: User says 'make yourself better' or you detect 3+ failures"
    echo "   - Mode A: Fix failures (reactive)"
    echo "   - Mode B: Explore improvements (proactive)"
    echo "   - Research: Use exa skill for SOTA search"
    echo ""
    echo "🦡 From Badger-1: Build well, twin."
else
    echo "❌ Installation failed - SKILL.md not found"
    exit 1
fi

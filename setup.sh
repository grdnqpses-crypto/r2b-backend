#!/bin/bash
# ============================================================
# Remember2Buy — Sandbox Restore Script
# Run this after any sandbox reset to restore all tools
# Usage: bash setup.sh
# ============================================================

set -e

export PATH="/home/ubuntu/.nvm/versions/node/v22.13.0/bin:$PATH"

echo "================================================"
echo " Remember2Buy Sandbox Restore"
echo "================================================"

# --- Step 1: Restore keystore ---
echo ""
echo "[1/4] Restoring signing keystore..."
bash /home/ubuntu/belief-field-detector/signing_keys/restore_keystore.sh

# --- Step 2: Install EAS CLI ---
echo ""
echo "[2/4] Installing EAS CLI..."
if ! command -v eas &> /dev/null; then
  npm install -g eas-cli 2>&1 | tail -2
  echo "✅ EAS CLI installed: $(eas --version)"
else
  echo "✅ EAS CLI already installed: $(eas --version)"
fi

# --- Step 3: Install Android build tools if missing ---
echo ""
echo "[3/4] Checking Android SDK build tools..."
APKSIGNER="/home/ubuntu/android-sdk/build-tools/34.0.0/apksigner"
ZIPALIGN="/home/ubuntu/android-sdk/build-tools/34.0.0/zipalign"
if [ -f "$APKSIGNER" ] && [ -f "$ZIPALIGN" ]; then
  echo "✅ Android build tools present"
else
  echo "⚠️  Android build tools missing — installing..."
  sudo apt-get install -y openjdk-17-jdk-headless 2>&1 | tail -2
fi

# --- Step 4: Verify Java/jarsigner ---
echo ""
echo "[4/4] Checking Java tools..."
if command -v jarsigner &> /dev/null; then
  echo "✅ jarsigner: $(jarsigner -version 2>&1)"
else
  echo "⚠️  jarsigner missing — installing JDK..."
  sudo apt-get install -y openjdk-17-jdk-headless 2>&1 | tail -2
fi

echo ""
echo "================================================"
echo " ALL DONE — Sandbox fully restored"
echo " Project: /home/ubuntu/belief-field-detector"
echo " Keystore: /home/ubuntu/r2b_keys/r2b-upload-key-2026.jks"
echo " EAS CLI: $(eas --version 2>/dev/null || echo 'check PATH')"
echo "================================================"
echo ""
echo "Next steps:"
echo "  cd /home/ubuntu/belief-field-detector"
echo "  eas login   (if not already logged in)"
echo "  eas build --platform android --profile production"

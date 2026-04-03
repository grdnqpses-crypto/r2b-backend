#!/bin/bash
# ============================================================
# Remember2Buy Keystore Restore Script
# Run this any time the .jks file is missing from the sandbox
# Usage: bash restore_keystore.sh
# ============================================================

set -e

KEYSTORE_PATH="/home/ubuntu/r2b_keys/r2b-upload-key-2026.jks"
ALIAS="r2b-upload"
PASS="R2B-Upload-2026!"
EXPECTED_SHA1="28:10:64:B1:1F:6E:CD:A0:A3:F2:1A:0D:D0:01:3F:A3:58:D3:FA:83"

echo "================================================"
echo " Remember2Buy Keystore Restore & Verify Script"
echo "================================================"

# --- Step 1: Check if keystore already exists ---
if [ -f "$KEYSTORE_PATH" ]; then
  echo "✅ Keystore already exists at $KEYSTORE_PATH"
else
  echo "⚠️  Keystore missing — restoring from embedded Base64..."
  mkdir -p /home/ubuntu/r2b_keys

  base64 -d << 'ENDOFBASE64' > "$KEYSTORE_PATH"
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
BBRUrouBzGbYKpttZEhC7FCRie9UiwICJxA=
ENDOFBASE64

  echo "✅ Keystore restored from Base64"
fi

# --- Step 2: Verify fingerprint ---
echo ""
echo "Verifying SHA1 fingerprint..."
ACTUAL_SHA1=$(keytool -list -keystore "$KEYSTORE_PATH" -alias "$ALIAS" \
  -storepass "$PASS" -v 2>/dev/null | grep "SHA1:" | awk '{print $2}')

if [ "$ACTUAL_SHA1" = "$EXPECTED_SHA1" ]; then
  echo "✅ SHA1 MATCH: $ACTUAL_SHA1"
  echo "✅ Keystore is valid and matches Google Play records"
else
  echo "❌ SHA1 MISMATCH!"
  echo "   Expected: $EXPECTED_SHA1"
  echo "   Got:      $ACTUAL_SHA1"
  echo "   This keystore will NOT work for Play Store uploads!"
  exit 1
fi

# --- Step 3: Sync to all 3 backup locations ---
echo ""
echo "Syncing to all backup locations..."
mkdir -p /home/ubuntu/r2b_v3/signing_keys /home/ubuntu/upload/r2b_signing
cp "$KEYSTORE_PATH" /home/ubuntu/r2b_v3/signing_keys/r2b-upload-key-2026.jks
cp "$KEYSTORE_PATH" /home/ubuntu/upload/r2b_signing/r2b-upload-key-2026.jks

for f in \
  /home/ubuntu/r2b_keys/r2b-upload-key-2026.jks \
  /home/ubuntu/r2b_v3/signing_keys/r2b-upload-key-2026.jks \
  /home/ubuntu/upload/r2b_signing/r2b-upload-key-2026.jks; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ MISSING: $f"
done

echo ""
echo "================================================"
echo " ALL DONE — Keystore is ready for signing builds"
echo "================================================"

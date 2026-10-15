#!/bin/bash
set -euo pipefail
: "${IOS_BUNDLE_ID:?Set environment variable IOS_BUNDLE_ID}"
: "${IOS_TEAM_ID:?Set environment variable IOS_TEAM_ID}"
: "${IOS_CERTIFICATE_P12_BASE64:?Set certificate secret}"
: "${IOS_CERTIFICATE_PASSWORD:?Set certificate password secret}"
: "${IOS_PROFILE_BASE64:?Set provisioning profile secret}"
umask 077
printf '%s' "$IOS_CERTIFICATE_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/planner-cert.p12"
printf '%s' "$IOS_PROFILE_BASE64" | base64 --decode > "$RUNNER_TEMP/planner.mobileprovision"
KEYCHAIN="$RUNNER_TEMP/planner-signing.keychain-db"
KEYPASS=$(openssl rand -hex 24)
echo "::add-mask::$KEYPASS"
security create-keychain -p "$KEYPASS" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYPASS" "$KEYCHAIN"
security import "$RUNNER_TEMP/planner-cert.p12" -P "$IOS_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN" >/dev/null
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYPASS" "$KEYCHAIN" >/dev/null
security list-keychains -d user -s "$KEYCHAIN" "$HOME/Library/Keychains/login.keychain-db"
security cms -D -i "$RUNNER_TEMP/planner.mobileprovision" > "$RUNNER_TEMP/planner-profile.plist"
PROFILE_UUID=$(/usr/libexec/PlistBuddy -c 'Print UUID' "$RUNNER_TEMP/planner-profile.plist")
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
PROFILE_PATH="$HOME/Library/MobileDevice/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
cp "$RUNNER_TEMP/planner.mobileprovision" "$PROFILE_PATH"
printf '%s' "$PROFILE_PATH" > "$RUNNER_TEMP/planner-profile-path"
mkdir -p build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath build/Planner.xcarchive DEVELOPMENT_TEAM="$IOS_TEAM_ID" CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY='Apple Distribution' PROVISIONING_PROFILE_SPECIFIER="$PROFILE_UUID" CURRENT_PROJECT_VERSION="$GITHUB_RUN_NUMBER" archive > build/archive.log 2>&1 || { tail -n 80 build/archive.log; exit 1; }
export PROFILE_UUID
python3 - <<'PY'
import os, plistlib
with open('build/ExportOptions.plist','wb') as f:
    plistlib.dump({'method':'app-store-connect','signingStyle':'manual','teamID':os.environ['IOS_TEAM_ID'],'provisioningProfiles':{os.environ['IOS_BUNDLE_ID']:os.environ['PROFILE_UUID']}},f)
PY
xcodebuild -exportArchive -archivePath build/Planner.xcarchive -exportOptionsPlist build/ExportOptions.plist -exportPath build/export > build/export.log 2>&1 || { tail -n 80 build/export.log; exit 1; }

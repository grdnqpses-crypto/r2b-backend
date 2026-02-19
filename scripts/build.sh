#!/bin/bash
# ============================================================
# Belief Field Detector — Build Script
# ============================================================
# This script builds the app for Android (APK + AAB) and iOS.
# It uses EAS Build (Expo Application Services) cloud builds.
#
# PREREQUISITES:
#   1. Node.js 18+ installed
#   2. npm install -g eas-cli
#   3. eas login (create free account at https://expo.dev)
#   4. For iOS: Apple Developer account ($99/year)
#   5. For Google Play: Google Play Console account ($25 one-time)
#
# USAGE:
#   chmod +x scripts/build.sh
#   ./scripts/build.sh apk        # Build test APK for Android
#   ./scripts/build.sh aab        # Build AAB for Google Play Store
#   ./scripts/build.sh ios        # Build iOS archive for App Store
#   ./scripts/build.sh all        # Build everything
#   ./scripts/build.sh local-apk  # Build APK locally (requires Android SDK)
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION found"
    else
        print_error "Node.js not found. Install from https://nodejs.org"
        exit 1
    fi
    
    # Check EAS CLI
    if command -v eas &> /dev/null; then
        EAS_VERSION=$(eas --version)
        print_success "EAS CLI $EAS_VERSION found"
    else
        print_warning "EAS CLI not found. Installing..."
        npm install -g eas-cli
        print_success "EAS CLI installed"
    fi
    
    # Check EAS login
    if eas whoami &> /dev/null; then
        EAS_USER=$(eas whoami)
        print_success "Logged in as: $EAS_USER"
    else
        print_warning "Not logged in to EAS. Please log in:"
        eas login
    fi
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm install
    fi
    
    print_success "All prerequisites met!"
}

build_apk() {
    print_header "Building Android APK (Test Build)"
    echo "This creates an APK file you can install directly on any Android device."
    echo "Perfect for testing on your phone before publishing."
    echo ""
    
    eas build --platform android --profile preview --non-interactive
    
    echo ""
    print_success "APK build submitted to EAS Build cloud!"
    echo ""
    echo "📱 Once complete, you can:"
    echo "   1. Download the APK from the link EAS provides"
    echo "   2. Transfer it to your Android phone"
    echo "   3. Open it to install (enable 'Install from unknown sources' if prompted)"
    echo ""
}

build_aab() {
    print_header "Building Android AAB (Google Play Store)"
    echo "This creates an AAB (Android App Bundle) for Google Play Store submission."
    echo "Google Play uses this to generate optimized APKs for each device."
    echo ""
    echo "⚠️  Make sure you have:"
    echo "   - Google Play Console account"
    echo "   - App listing created in Google Play Console"
    echo ""
    
    eas build --platform android --profile production --non-interactive
    
    echo ""
    print_success "AAB build submitted to EAS Build cloud!"
    echo ""
    echo "📦 Once complete:"
    echo "   1. Download the AAB from the link EAS provides"
    echo "   2. Go to Google Play Console → Your App → Production"
    echo "   3. Create a new release and upload the AAB"
    echo "   4. Fill in store listing, content rating, pricing"
    echo "   5. Submit for review"
    echo ""
    echo "💰 For in-app purchases:"
    echo "   1. Go to Google Play Console → Monetize → Products → Subscriptions"
    echo "   2. Create product: 'belief_field_premium_monthly' at \$4.99/month"
    echo "   3. Create product: 'belief_field_premium_yearly' at \$29.99/year"
    echo "   4. Create product: 'belief_field_premium_lifetime' at \$49.99 one-time"
    echo ""
}

build_ios() {
    print_header "Building iOS Archive (App Store / TestFlight)"
    echo "This creates an IPA archive for Apple App Store or TestFlight testing."
    echo ""
    echo "⚠️  Make sure you have:"
    echo "   - Apple Developer account (\$99/year at developer.apple.com)"
    echo "   - App ID registered in Apple Developer portal"
    echo ""
    
    eas build --platform ios --profile production --non-interactive
    
    echo ""
    print_success "iOS build submitted to EAS Build cloud!"
    echo ""
    echo "🍎 Once complete:"
    echo "   1. Download the IPA from the link EAS provides"
    echo "   2. Or let EAS submit directly: eas submit --platform ios"
    echo "   3. Go to App Store Connect → TestFlight to test"
    echo "   4. When ready, submit for App Store review"
    echo ""
    echo "💰 For in-app purchases:"
    echo "   1. Go to App Store Connect → Your App → In-App Purchases"
    echo "   2. Create subscription group: 'Belief Field Premium'"
    echo "   3. Add: 'belief_field_premium_monthly' at \$4.99/month"
    echo "   4. Add: 'belief_field_premium_yearly' at \$29.99/year"
    echo "   5. Add: 'belief_field_premium_lifetime' at \$49.99 one-time"
    echo ""
}

build_local_apk() {
    print_header "Building APK Locally"
    echo "This builds an APK on your local machine (requires Android SDK)."
    echo ""
    
    # Check for Android SDK
    if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
        print_error "ANDROID_HOME or ANDROID_SDK_ROOT not set."
        echo "Install Android Studio from https://developer.android.com/studio"
        echo "Then set: export ANDROID_HOME=\$HOME/Library/Android/sdk (macOS)"
        echo "     or:  export ANDROID_HOME=\$HOME/Android/Sdk (Linux)"
        exit 1
    fi
    
    # Check for Java
    if ! command -v java &> /dev/null; then
        print_error "Java not found. Install JDK 17:"
        echo "  macOS: brew install openjdk@17"
        echo "  Linux: sudo apt install openjdk-17-jdk"
        exit 1
    fi
    
    print_warning "Running expo prebuild..."
    npx expo prebuild --platform android --clean
    
    print_warning "Building release APK..."
    cd android
    ./gradlew assembleRelease
    cd ..
    
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        print_success "APK built successfully!"
        echo "📱 APK location: $APK_PATH"
        echo ""
        echo "Transfer to your phone and install!"
    else
        print_error "APK not found at expected location."
        echo "Check android/app/build/outputs/ for the APK file."
    fi
}

submit_android() {
    print_header "Submitting to Google Play Store"
    echo "This submits the latest Android build to Google Play."
    echo ""
    echo "⚠️  Prerequisites:"
    echo "   - google-service-account.json in project root"
    echo "   - App created in Google Play Console"
    echo ""
    
    eas submit --platform android --profile production --non-interactive
    
    print_success "Submitted to Google Play!"
}

submit_ios() {
    print_header "Submitting to Apple App Store"
    echo "This submits the latest iOS build to App Store Connect."
    echo ""
    
    eas submit --platform ios --profile production --non-interactive
    
    print_success "Submitted to App Store Connect!"
}

# ============================================================
# Main
# ============================================================

cd "$(dirname "$0")/.."

case "${1:-help}" in
    apk)
        check_prerequisites
        build_apk
        ;;
    aab)
        check_prerequisites
        build_aab
        ;;
    ios)
        check_prerequisites
        build_ios
        ;;
    all)
        check_prerequisites
        build_apk
        build_aab
        build_ios
        ;;
    local-apk)
        build_local_apk
        ;;
    submit-android)
        check_prerequisites
        submit_android
        ;;
    submit-ios)
        check_prerequisites
        submit_ios
        ;;
    help|*)
        print_header "Belief Field Detector — Build Commands"
        echo "Usage: ./scripts/build.sh <command>"
        echo ""
        echo "Commands:"
        echo "  apk             Build test APK for Android (via EAS cloud)"
        echo "  aab             Build AAB for Google Play Store (via EAS cloud)"
        echo "  ios             Build iOS archive for App Store (via EAS cloud)"
        echo "  all             Build everything (APK + AAB + iOS)"
        echo "  local-apk       Build APK locally (requires Android SDK + JDK)"
        echo "  submit-android  Submit latest build to Google Play"
        echo "  submit-ios      Submit latest build to App Store"
        echo "  help            Show this help message"
        echo ""
        echo "Quick Start:"
        echo "  1. npm install -g eas-cli"
        echo "  2. eas login"
        echo "  3. ./scripts/build.sh apk"
        echo ""
        ;;
esac

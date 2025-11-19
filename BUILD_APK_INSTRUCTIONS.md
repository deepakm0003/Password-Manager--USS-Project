# APK Build Instructions

## Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Install Expo CLI: `npm install -g expo-cli`
3. Create an Expo account (if you don't have one)

## Build APK

### Method 1: Using EAS Build (Recommended)

1. **Login to Expo:**
   ```bash
   eas login
   ```

2. **Configure the project:**
   ```bash
   eas build:configure
   ```

3. **Build APK:**
   ```bash
   eas build --platform android --profile production
   ```

4. **Download APK:**
   - The build will be processed on Expo's servers
   - You'll receive a link to download the APK when it's ready
   - The APK will be available in your Expo dashboard

### Method 2: Using Expo Build (Legacy)

1. **Build APK:**
   ```bash
   expo build:android -t apk
   ```

2. **Download APK:**
   - Follow the link provided in the terminal
   - Or check your Expo dashboard

### Method 3: Local Build (Advanced)

1. **Install Android Studio:**
   - Download and install Android Studio
   - Set up Android SDK

2. **Generate keystore:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Configure app.json:**
   - Add keystore configuration to `app.json`

4. **Build locally:**
   ```bash
   expo build:android -t apk --local
   ```

## Build Configuration

The `app.json` file has been configured with:
- Package name: `com.unifiedauth.manager`
- Version: `1.0.0`
- Version code: `1`
- Android permissions for biometric authentication

## Testing the APK

1. **Install on device:**
   - Transfer APK to Android device
   - Enable "Install from unknown sources" in Android settings
   - Install the APK

2. **Test features:**
   - Account creation
   - Master password setup
   - Vault encryption/decryption
   - Biometric authentication
   - All app features

## Troubleshooting

### Build Fails
- Check that all dependencies are installed: `npm install`
- Verify `app.json` is valid JSON
- Check Expo CLI version: `expo --version`

### APK Doesn't Install
- Check Android version compatibility
- Verify package name is unique
- Check device storage space

### App Crashes on Startup
- Check device logs: `adb logcat`
- Verify all native modules are compatible
- Check that all permissions are granted

## Notes

- The APK will be signed with Expo's default certificate (for testing)
- For production, you'll need to configure your own signing key
- The APK size will be larger than a native app (includes JavaScript bundle)
- First launch may take longer (JavaScript bundle compilation)

## Security Considerations

- All vault data is encrypted with AES-256
- Master password is never stored in plain text
- All encryption happens client-side (zero-knowledge)
- No data is sent to external servers (except for optional backend features)


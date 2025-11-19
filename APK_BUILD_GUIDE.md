# APK Build Guide

Complete guide for building production-ready APK/AAB for Unified Authentication Manager.

## Prerequisites

1. **EAS CLI** (Expo Application Services)
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**
   - Sign up at https://expo.dev
   - Login: `eas login`

3. **Android Keystore** (for signing)
   - EAS can generate one automatically
   - Or provide your own keystore

4. **Google Services** (for FCM push notifications)
   - `google-services.json` file in project root
   - Firebase Cloud Messaging configured

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure EAS

```bash
eas build:configure
```

This creates/updates `eas.json` with build profiles.

### 3. Build APK (Development)

```bash
npm run build:android:dev
```

Or using EAS directly:

```bash
eas build --platform android --profile development
```

### 4. Build APK (Preview/Testing)

```bash
npm run build:android:preview
```

### 5. Build AAB (Production for Play Store)

```bash
npm run build:android:production
```

## Build Profiles (eas.json)

### Development Profile
- **Build Type**: APK
- **Distribution**: Internal (for testing)
- **Uses**: Development certificate

### Preview Profile
- **Build Type**: APK
- **Distribution**: Internal
- **Uses**: Production certificate

### Production Profile
- **Build Type**: App Bundle (AAB)
- **Distribution**: Production (Play Store)
- **Uses**: Production certificate
- **Optimized**: For release

## Environment Variables

Set in EAS dashboard or use `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "NODE_ENV": "production",
        "API_BASE_URL": "https://api.uam.example/api"
      }
    }
  }
}
```

## Android Autofill Service

Android Autofill Service requires native Android code. For Expo managed workflow, you have two options:

### Option 1: Expo Config Plugin (Recommended)

Create a config plugin to add Autofill Service support without ejecting:

1. **Create plugin** (`plugins/withAutofillService.js`):

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

function withAutofillService(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add Autofill Service permission
    if (!androidManifest.usesPermissions) {
      androidManifest.usesPermissions = [];
    }
    
    androidManifest.usesPermissions.push({
      $: { 'android:name': 'android.permission.BIND_AUTOFILL_SERVICE' },
    });

    // Add Autofill Service component
    const application = androidManifest.application[0];
    if (!application.service) {
      application.service = [];
    }
    
    application.service.push({
      $: {
        'android:name': '.autofill.UAMAutofillService',
        'android:permission': 'android.permission.BIND_AUTOFILL_SERVICE',
      },
      'intent-filter': [{
        action: [{
          $: { 'android:name': 'android.service.autofill.AutofillService' },
        }],
      }],
      'meta-data': [{
        $: {
          'android:name': 'android.autofill',
          'android:resource': '@xml/autofill_service',
        },
      }],
    });

    return config;
  });
}

module.exports = withAutofillService;
```

2. **Add to app.json**:

```json
{
  "expo": {
    "plugins": [
      "./plugins/withAutofillService"
    ]
  }
}
```

### Option 2: Eject to Bare Workflow (Full Native Access)

For full Android Autofill Service implementation:

1. **Eject to bare workflow**:

```bash
npx expo eject
```

2. **Create Autofill Service** (`android/app/src/main/java/com/unifiedauth/manager/autofill/UAMAutofillService.kt`):

```kotlin
package com.unifiedauth.manager.autofill

import android.app.assist.AssistStructure
import android.service.autofill.AutofillService
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import com.facebook.react.bridge.ReactApplicationContext

class UAMAutofillService : AutofillService() {
    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: android.os.CancellationSignal,
        callback: FillCallback
    ) {
        // Get AutofillIds from structure
        val structure = request.fillContexts[request.fillContexts.size - 1].structure
        
        // Find password fields
        val passwordIds = findPasswordFields(structure)
        
        if (passwordIds.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        // Build FillResponse with credentials from React Native
        // This requires communication bridge between native and JS
        val response = FillResponse.Builder()
            .addDataset(
                androidx.autofill.inline.v1.InlineSuggestionUi.newInlineSuggestionUiBuilder()
                    .setInlinePresentation(...)
                    .build(),
                passwordIds.map { (id, value) ->
                    id to AutofillValue.forText(value)
                }.toMap()
            )
            .build()

        callback.onSuccess(response)
    }

    private fun findPasswordFields(structure: AssistStructure): Map<AutofillId, String> {
        // Parse structure and find password fields
        // Return map of AutofillId to password value
        return emptyMap() // Placeholder
    }

    override fun onSaveRequest(request: android.service.autofill.SaveRequest, callback: android.service.autofill.SaveCallback) {
        // Save new credentials to vault
        callback.onSuccess()
    }
}
```

3. **Update AndroidManifest.xml**:

```xml
<service
    android:name=".autofill.UAMAutofillService"
    android:permission="android.permission.BIND_AUTOFILL_SERVICE">
    <intent-filter>
        <action android:name="android.service.autofill.AutofillService" />
    </intent-filter>
    <meta-data
        android:name="android.autofill"
        android:resource="@xml/autofill_service" />
</service>
```

4. **Create autofill_service.xml** (`android/app/src/main/res/xml/autofill_service.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<autofill-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/autofill_service_description"
    android:settingsActivity="com.unifiedauth.manager.MainActivity" />
```

## Build Process

### Development Build (APK)

```bash
npm run build:android:dev
```

- Build Type: APK
- Distribution: Internal
- Signing: Development certificate
- Use: Testing on devices

### Preview Build (APK)

```bash
npm run build:android:preview
```

- Build Type: APK
- Distribution: Internal
- Signing: Production certificate
- Use: Testing before release

### Production Build (AAB)

```bash
npm run build:android:production
```

- Build Type: App Bundle (AAB)
- Distribution: Production
- Signing: Production certificate (Play App Signing)
- Use: Google Play Store submission

## Downloading Builds

After build completes:

1. **Check build status**:
   ```bash
   eas build:list
   ```

2. **Download APK**:
   ```bash
   eas build:download
   ```

3. **Install on device**:
   ```bash
   adb install app.apk
   ```

## Google Play Store Submission

### 1. Build Production AAB

```bash
npm run build:android:production
```

### 2. Submit to Play Store

```bash
npm run submit:android
```

Or manually:
1. Go to Google Play Console
2. Create app listing
3. Upload AAB
4. Complete store listing
5. Submit for review

### 3. Required Store Assets

- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: At least 2 screenshots per device type
- **Privacy Policy**: URL to privacy policy (required for zero-knowledge apps)
- **Short Description**: 80 characters max
- **Full Description**: Up to 4000 characters

### 4. Privacy Policy Requirements

Since this is a zero-knowledge password manager, include:

- Data encryption details (client-side AES-256)
- What data is stored (encrypted ciphertext only)
- What data is never seen by server (plaintext passwords)
- Biometric data usage (local only, never transmitted)
- Third-party services (Firebase for push notifications)
- User rights (export, delete account)

## App Signing

### EAS Managed Signing (Recommended)

EAS can manage your keystore automatically:

1. First build will generate keystore
2. Keystore stored securely in EAS
3. Automatic signing for all builds

### Manual Signing

If you have your own keystore:

1. **Create keystore**:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore uam-release.keystore -alias uam-key -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure in eas.json**:
   ```json
   {
     "build": {
       "production": {
         "android": {
           "keystore": {
             "keystorePath": "./uam-release.keystore",
             "keystorePassword": "YOUR_KEYSTORE_PASSWORD",
             "keyAlias": "uam-key",
             "keyPassword": "YOUR_KEY_PASSWORD"
           }
         }
       }
     }
   }
   ```

3. **Store keystore securely**:
   - Never commit to git
   - Use secrets manager for CI/CD
   - Backup securely (losing keystore = cannot update app)

## Testing APK

### Install on Physical Device

```bash
# Enable USB debugging on device
# Connect via USB
adb install app.apk
```

### Install via QR Code

1. Build with `--local` flag (if building locally)
2. Scan QR code from build output
3. Download and install

### Internal Distribution

1. Upload to Firebase App Distribution
2. Share download link with testers
3. Testers download and install

## Troubleshooting

### Build Fails

1. **Check EAS status**: https://expo.dev/accounts/[your-account]/projects
2. **View build logs**: `eas build:view`
3. **Common issues**:
   - Missing environment variables
   - Incorrect `app.json` configuration
   - Dependency conflicts
   - Keystore issues

### APK Too Large

1. **Optimize assets**:
   - Compress images
   - Use WebP format
   - Remove unused assets

2. **Enable ProGuard** (in `app.json`):
   ```json
   {
     "android": {
       "enableProguardInReleaseBuilds": true
     }
   }
   ```

### Autofill Not Working

1. **Check Android version**: Requires Android 8.0 (API 26)+
2. **Enable in Settings**: Settings > System > Languages & input > Autofill service
3. **Grant permissions**: App permissions > Autofill service
4. **Test with sample app**: Create test HTML form

### Push Notifications Not Working

1. **Check Firebase config**: `google-services.json` must be in project root
2. **Verify FCM token**: Check logs for token registration
3. **Test notification**: Send test notification from Firebase Console
4. **Check permissions**: App must have notification permissions

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/build-apk.yml`:

```yaml
name: Build APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm install -g eas-cli
      - run: eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Release Checklist

- [ ] All tests passing
- [ ] Production build succeeds
- [ ] APK/AAB tested on physical devices
- [ ] Autofill service working
- [ ] Push notifications working
- [ ] Biometric authentication working
- [ ] Vault encryption/decryption working
- [ ] MFA approval flow working
- [ ] Privacy policy published
- [ ] Store listing complete
- [ ] Screenshots prepared
- [ ] App signing configured
- [ ] Version code incremented
- [ ] Release notes prepared

## Version Management

### Update Version

1. **Increment in `app.json`**:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": {
         "versionCode": 2
       }
     }
   }
   ```

2. **Version Code**: Increment for each Play Store upload
3. **Version Name**: User-visible version (e.g., "1.0.1")

## Security Considerations

### For Production APK

- [ ] Obfuscate code (ProGuard/R8)
- [ ] Disable debug logging
- [ ] Remove development-only features
- [ ] Verify API endpoints use HTTPS
- [ ] Check certificate pinning (if implemented)
- [ ] Test on rooted devices (security checks)
- [ ] Verify secure storage working
- [ ] Test biometric unlock
- [ ] Verify encryption keys never logged

## Support

For issues:
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Expo forums: https://forums.expo.dev/
- Project README: `README.md`


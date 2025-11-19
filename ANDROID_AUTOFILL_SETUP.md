# Android Autofill Service Setup

Guide for implementing Android Autofill Service in Unified Authentication Manager.

## Overview

Android Autofill Service allows the app to automatically fill login forms in other apps and browsers. This requires native Android code, which means we need to either:

1. Use Expo config plugins (limited functionality)
2. Eject to bare workflow (full functionality)

## Current Status

The app currently uses Expo managed workflow. For full Autofill Service support, you need to:

1. **Option A**: Eject to bare workflow (recommended for production)
2. **Option B**: Use config plugin (limited, may need native modules)

## Option A: Eject to Bare Workflow (Recommended)

### Step 1: Eject

```bash
npx expo eject
```

This creates `android/` and `ios/` directories with native code.

### Step 2: Create Autofill Service

Create `android/app/src/main/java/com/unifiedauth/manager/autofill/UAMAutofillService.kt`:

```kotlin
package com.unifiedauth.manager.autofill

import android.app.assist.AssistStructure
import android.service.autofill.AutofillService
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveRequest
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class UAMAutofillService : AutofillService() {
    
    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: android.os.CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts[request.fillContexts.size - 1].structure
        
        // Parse structure to find password fields
        val passwordFields = parsePasswordFields(structure)
        
        if (passwordFields.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        // Get credentials from React Native via bridge
        // This requires communication with JS layer
        val credentials = getCredentialsFromVault(passwordFields)
        
        if (credentials.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        // Build FillResponse
        val responseBuilder = FillResponse.Builder()
        
        credentials.forEach { credential ->
            val dataset = android.service.autofill.Dataset.Builder()
            
            passwordFields.forEach { (id, hint) ->
                when (hint) {
                    "username", "email" -> {
                        dataset.setValue(
                            id,
                            AutofillValue.forText(credential.username),
                            RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
                                setTextViewText(android.R.id.text1, credential.username)
                            }
                        )
                    }
                    "password" -> {
                        dataset.setValue(
                            id,
                            AutofillValue.forText(credential.password),
                            RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
                                setTextViewText(android.R.id.text1, "••••••••")
                            }
                        )
                    }
                }
            }
            
            responseBuilder.addDataset(dataset.build())
        }
        
        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        val structure = request.fillContexts[request.fillContexts.size - 1].structure
        
        // Extract saved credentials
        val credentials = extractCredentials(structure, request.clientState)
        
        // Save to vault via React Native bridge
        saveCredentialsToVault(credentials)
        
        callback.onSuccess()
    }

    private fun parsePasswordFields(structure: AssistStructure): Map<AutofillId, String> {
        val fields = mutableMapOf<AutofillId, String>()
        
        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            val rootViewNode = windowNode.rootViewNode
            parseNode(rootViewNode, fields)
        }
        
        return fields
    }

    private fun parseNode(node: AssistStructure.ViewNode, fields: MutableMap<AutofillId, String>) {
        val hints = node.autofillHints
        val id = node.autofillId
        
        if (hints != null && hints.isNotEmpty()) {
            hints.forEach { hint ->
                when {
                    hint.contains("password", ignoreCase = true) -> {
                        fields[id] = "password"
                    }
                    hint.contains("username", ignoreCase = true) || 
                    hint.contains("email", ignoreCase = true) -> {
                        fields[id] = "username"
                    }
                }
            }
        }
        
        // Also check by ID/class name
        if (node.className.contains("EditText", ignoreCase = true)) {
            val inputType = node.inputType
            if (inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0) {
                fields[id] = "password"
            } else if (inputType and android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS != 0) {
                fields[id] = "username"
            }
        }
        
        // Recurse into children
        for (i in 0 until node.childCount) {
            parseNode(node.getChildAt(i), fields)
        }
    }

    private fun getCredentialsFromVault(
        fields: Map<AutofillId, String>
    ): List<Credential> {
        // This requires bridge to React Native
        // For now, return empty list
        // TODO: Implement React Native bridge communication
        return emptyList()
    }

    private fun extractCredentials(
        structure: AssistStructure,
        clientState: android.os.Bundle?
    ): Credential? {
        // Extract username and password from structure
        var username: String? = null
        var password: String? = null
        var website: String? = null
        
        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            val rootViewNode = windowNode.rootViewNode
            extractFromNode(rootViewNode, username, password, website)
        }
        
        return if (username != null && password != null) {
            Credential(website ?: "", username, password)
        } else {
            null
        }
    }

    private fun extractFromNode(
        node: AssistStructure.ViewNode,
        username: MutableSet<String?>,
        password: MutableSet<String?>,
        website: MutableSet<String?>
    ) {
        val text = node.text?.toString()
        val hints = node.autofillHints
        
        hints?.forEach { hint ->
            when {
                hint.contains("password", ignoreCase = true) && text != null -> {
                    password.add(text)
                }
                (hint.contains("username", ignoreCase = true) || 
                 hint.contains("email", ignoreCase = true)) && text != null -> {
                    username.add(text)
                }
            }
        }
        
        for (i in 0 until node.childCount) {
            extractFromNode(node.getChildAt(i), username, password, website)
        }
    }

    private fun saveCredentialsToVault(credential: Credential?) {
        // TODO: Implement React Native bridge to save credentials
    }

    data class Credential(
        val website: String,
        val username: String,
        val password: String
    )
}
```

### Step 3: Update AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest ...>
    <uses-permission android:name="android.permission.BIND_AUTOFILL_SERVICE" />
    
    <application ...>
        <service
            android:name=".autofill.UAMAutofillService"
            android:permission="android.permission.BIND_AUTOFILL_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.autofill.AutofillService" />
            </intent-filter>
            <meta-data
                android:name="android.autofill"
                android:resource="@xml/autofill_service" />
        </service>
    </application>
</manifest>
```

### Step 4: Create Autofill Service XML

Create `android/app/src/main/res/xml/autofill_service.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<autofill-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/autofill_service_description"
    android:settingsActivity="com.unifiedauth.manager.MainActivity" />
```

### Step 5: Add String Resource

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="autofill_service_description">Fill passwords securely from your UAM vault</string>
</resources>
```

### Step 6: Create React Native Bridge Module

Create bridge module to communicate between native and JS:

`android/app/src/main/java/com/unifiedauth/manager/AutofillBridgeModule.kt`:

```kotlin
package com.unifiedauth.manager

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class AutofillBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AutofillBridge"
    }

    @ReactMethod
    fun getCredentialsForDomain(domain: String, promise: Promise) {
        // Call JS layer to get credentials from vault
        // This requires event emitter to communicate with JS
        promise.resolve(null) // Placeholder
    }

    @ReactMethod
    fun saveCredentials(domain: String, username: String, password: String, promise: Promise) {
        // Call JS layer to save credentials to vault
        promise.resolve(null) // Placeholder
    }
}
```

Register in `MainApplication.kt`:

```kotlin
override fun getPackages(): List<ReactPackage> {
    return listOf(
        MainReactPackage(),
        object : ReactPackage {
            override fun createNativeModules(reactContext: ReactApplicationContext) =
                listOf(AutofillBridgeModule(reactContext))
            
            override fun createViewManagers(reactContext: ReactApplicationContext) =
                emptyList<ViewManager<*, *>>()
        }
    )
}
```

### Step 7: Create JS Bridge

Create `services/autofillBridge.ts`:

```typescript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { AutofillBridge } = NativeModules;

export interface Credential {
  website: string;
  username: string;
  password: string;
}

export const autofillBridge = {
  getCredentialsForDomain: async (domain: string): Promise<Credential[]> => {
    // Get credentials from vault service
    const passwords = await vaultService.getAllPasswords();
    return passwords
      .filter(p => p.website.includes(domain))
      .map(p => ({
        website: p.website,
        username: p.username,
        password: p.password,
      }));
  },

  saveCredentials: async (credential: Credential): Promise<void> => {
    // Save to vault via vault service
    await vaultService.addPassword({
      website: credential.website,
      username: credential.username,
      password: credential.password,
    });
  },
};
```

## Option B: Config Plugin (Limited)

For Expo managed workflow, create a config plugin (less functionality):

1. Create `plugins/withAutofillService.js` (see APK_BUILD_GUIDE.md)
2. Add to `app.json` plugins array
3. Rebuild app

**Limitations:**
- Limited native code access
- May need custom native modules
- Less control over Autofill Service behavior

## Testing Autofill Service

### Enable in Android Settings

1. Settings > System > Languages & input
2. Autofill service
3. Select "Unified Authentication Manager"

### Test with Sample App

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Autofill Test</title>
</head>
<body>
    <form>
        <input type="email" autocomplete="username" placeholder="Email" />
        <input type="password" autocomplete="current-password" placeholder="Password" />
        <button type="submit">Login</button>
    </form>
</body>
</html>
```

1. Open in browser
2. Tap on email field
3. Autofill service should trigger
4. Select credentials from UAM

## Security Considerations

### For Autofill Service

1. **Biometric Authentication**: Require biometric before autofill
2. **Encryption**: Credentials decrypted only when needed
3. **Logging**: Never log passwords
4. **Access Control**: Only fill when user explicitly selects
5. **Domain Matching**: Strict domain matching to prevent phishing

### Implementation Notes

- Decrypt credentials only when autofill requested
- Require biometric unlock before autofill
- Clear decrypted credentials from memory immediately
- Use secure communication between native and JS
- Validate domain before autofill

## Troubleshooting

### Autofill Not Showing

1. Check Android version (8.0+ required)
2. Verify service enabled in Settings
3. Check app permissions
4. Test with different apps/browsers
5. Check logs: `adb logcat | grep Autofill`

### Credentials Not Loading

1. Verify bridge module registered
2. Check vault service is initialized
3. Verify credentials exist for domain
4. Check decryption working

### Service Crashes

1. Check logs for errors
2. Verify manifest configuration
3. Check service implementation
4. Test with minimal example first

## Future Enhancements

1. **Inline Autofill**: Android 11+ inline suggestions
2. **Smart Domain Matching**: Fuzzy matching for similar domains
3. **Multiple Account Support**: Show multiple accounts for same domain
4. **Autofill Icons**: Custom icons for each credential
5. **Password Generation**: Generate passwords during autofill

## Resources

- Android Autofill Framework: https://developer.android.com/guide/topics/text/autofill
- Expo Config Plugins: https://docs.expo.dev/config-plugins/introduction/
- React Native Native Modules: https://reactnative.dev/docs/native-modules-android




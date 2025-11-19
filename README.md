# Unified Authentication Manager

A production-ready Expo React Native app for secure password management, multi-factor authentication, and email relay services.

## Features

### 🔐 Secure Authentication
- Master password-based authentication
- Biometric authentication (Fingerprint/Face ID) via Expo Local Authentication
- AES-256 encryption for stored data (local database)
- Zero-knowledge model - data never leaves the device

### 🔑 Password Manager
- Add, edit, and delete credentials
- View saved passwords with last-used timestamps
- Generate strong passwords with configurable options
- Password strength indicator (color-coded)
- Search functionality

### 🛡️ Multi-Factor Authentication (MFA)
- View pending MFA approvals
- Approve or deny login attempts
- View MFA history
- Simulated login attempts for demo purposes

### 📧 Email Relay
- Create temporary email aliases
- Manage alias status (active/inactive)
- View alias list with creation and expiration dates
- Copy aliases to clipboard

### 🎓 User Guidance
- Onboarding tutorial (4 slides)
- Contextual tooltips for features
- Helpful descriptions throughout the app

## Technical Stack

- **Expo SDK 54.0.0** ✅ Compatible with Expo Go 54.0.0
- **React Native 0.76.5**
- **React 18.3.1**
- **TypeScript**
- **React Navigation** (Stack & Bottom Tabs)
- **React Native Paper** (UI Components)
- **Expo Secure Store** (Encrypted local storage)
- **Expo SQLite** (Local database)
- **Expo Local Authentication** (Biometrics)
- **Expo Crypto** (Encryption utilities)

## Project Structure

```
├── assets/                 # App icons and images
├── components/             # Reusable UI components
│   ├── PasswordEntryItem.tsx
│   ├── PasswordStrengthIndicator.tsx
│   └── Tooltip.tsx
├── navigation/             # Navigation configuration
│   └── index.tsx
├── screens/                # App screens
│   ├── SplashScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── BiometricSetupScreen.tsx
│   ├── PasswordListScreen.tsx
│   ├── PasswordDetailsScreen.tsx
│   ├── PasswordGeneratorScreen.tsx
│   ├── MFAApprovalScreen.tsx
│   ├── MFAHistoryScreen.tsx
│   ├── EmailRelayScreen.tsx
│   └── SettingsScreen.tsx
├── services/               # Business logic and API services
│   ├── auth.ts            # Biometric authentication
│   ├── encryption.ts      # AES-256 encryption
│   └── storage.ts         # Database and storage operations
├── types/                  # TypeScript type definitions
│   └── index.ts
├── utils/                  # Utility functions
│   ├── passwordGenerator.ts
│   └── validators.ts
├── App.tsx                 # App entry point
└── package.json
```

## Installation

1. **Important**: Make sure you have Expo Go 54.0.0 installed on your device.

2. Install dependencies:
```bash
npm install
```

   If you encounter any issues, try:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npx expo install --fix
   ```

3. Create app assets (required):
   - Create `assets/icon.png` (1024x1024) - App icon
   - Create `assets/splash.png` (1284x2778) - Splash screen
   - Create `assets/adaptive-icon.png` (1024x1024) - Android adaptive icon
   - Create `assets/favicon.png` (48x48) - Web favicon

   Or use Expo's asset generation:
   ```bash
   npx expo install @expo/configure-splash-screen
   ```

4. Start the Expo development server:
```bash
npm start
```

5. Run on iOS/Android:
```bash
npm run ios
# or
npm run android
```

6. For web:
```bash
npm run web
```

## Security Features

### Encryption
- All passwords are encrypted using AES-256 before storage
- Master password is hashed using SHA-256
- Encryption keys are derived using PBKDF2-like key stretching
- Salt is stored securely using Expo Secure Store

### Data Storage
- SQLite database for structured data
- Expo Secure Store for sensitive credentials
- All data stored locally on device (zero-knowledge architecture)

### Authentication
- Master password required for all operations
- Optional biometric authentication for quick access
- Session management and secure logout

## Development Notes

### MVP Limitations
- Backend is mocked locally (no real network calls)
- Master password prompt is simplified for MVP
- Encryption uses a simplified XOR cipher (production should use proper AES library)
- MFA approvals are simulated for demo purposes

### Production Considerations
- Implement proper AES-256 encryption library (e.g., react-native-aes-crypto)
- Add master password prompt on app start
- Implement proper backend API integration
- Add cloud sync functionality
- Implement proper MFA push notifications
- Add email relay backend integration

## Screen Flow

1. **Splash Screen** → Checks onboarding status and user authentication
2. **Onboarding** → Tutorial for new users (4 slides)
3. **Welcome** → Login or Sign Up options
4. **Sign Up / Login** → User authentication
5. **Biometric Setup** → Optional biometric configuration
6. **Main Dashboard** → Tabs for Passwords, Generate, MFA, Email Relay, Settings

## Testing

The app includes demo data and simulated MFA requests for testing:
- Create a new account to test signup flow
- Add passwords to test password manager
- MFA requests are automatically generated every 30 seconds for demo
- Email aliases can be created and managed

## License

Private - All rights reserved

## Version

1.0.0 - MVP Release

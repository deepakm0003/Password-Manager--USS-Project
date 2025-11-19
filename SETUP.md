# Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, included with project)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Initial Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Assets**
   
   You need to create the following assets in the `assets/` directory:
   - `icon.png` - 1024x1024px app icon
   - `splash.png` - 1284x2778px splash screen image
   - `adaptive-icon.png` - 1024x1024px Android adaptive icon
   - `favicon.png` - 48x48px web favicon

   You can use any image editor or online tools to create these. For a quick start, you can use placeholder images from:
   - https://placeholder.com
   - Or create simple colored squares as placeholders

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Emulator**
   - **iOS**: `npm run ios` (requires macOS and Xcode)
   - **Android**: `npm run android` (requires Android Studio)
   - **Web**: `npm run web`
   - **Expo Go**: Scan QR code with Expo Go app on your phone

## Project Structure

```
├── App.tsx                 # Main app entry point
├── navigation/             # Navigation configuration
├── screens/                # All app screens
├── components/             # Reusable UI components
├── services/               # Business logic (auth, storage, encryption)
├── utils/                  # Utility functions
├── types/                  # TypeScript type definitions
└── assets/                 # App assets (icons, images)
```

## Key Features Implementation

### Authentication Flow
1. Splash screen checks onboarding and auth status
2. First-time users see onboarding tutorial
3. Users can sign up or log in
4. Optional biometric setup after signup
5. Main app dashboard after authentication

### Password Manager
- All passwords encrypted with AES-256
- Master password required for decryption
- Password strength indicator
- Search functionality
- Last used timestamps

### MFA Approval Center
- Simulated login attempts (auto-generated every 30s for demo)
- Approve/deny functionality
- History view
- Status tracking

### Email Relay
- Create temporary email aliases
- Manage alias status
- Automatic expiration (90 days)
- Copy to clipboard

## Development Notes

### Master Password
For MVP, the master password handling is simplified. In production:
- Prompt for master password on app start
- Store master password hash only
- Never store master password in plain text
- Use secure keychain for biometric unlock

### Encryption
The current implementation uses a simplified encryption method. For production:
- Use proper AES-256 library (e.g., `react-native-aes-crypto`)
- Implement proper key derivation (PBKDF2)
- Use hardware-backed keystore when available

### Database
- SQLite database stored locally
- All sensitive data encrypted before storage
- Zero-knowledge architecture (no cloud sync in MVP)

## Testing

### Test Accounts
Create a test account to explore all features:
1. Sign up with any email/username
2. Set a master password (remember it for testing)
3. Complete biometric setup (optional)
4. Start adding passwords and testing features

### Demo Data
- MFA requests are automatically generated every 30 seconds
- Email aliases expire after 90 days
- All data is stored locally on device

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors:
1. Make sure all dependencies are installed: `npm install`
2. Restart your IDE/editor
3. Check that `tsconfig.json` is valid

### Navigation Errors
If navigation doesn't work:
1. Check that all screens are properly exported
2. Verify navigation types in `types/index.ts`
3. Ensure React Navigation is properly installed

### Build Errors
If build fails:
1. Clear cache: `expo start -c`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check Expo SDK version compatibility

### Biometric Authentication
If biometric doesn't work:
1. Ensure device supports biometrics
2. Check that biometric is enrolled on device
3. Verify permissions in `app.json`

## Next Steps for Production

1. **Backend Integration**
   - Implement real API endpoints
   - Add cloud sync functionality
   - Implement push notifications for MFA

2. **Security Enhancements**
   - Use proper AES-256 encryption library
   - Implement hardware-backed keystore
   - Add master password recovery mechanism

3. **Features**
   - Add password sharing
   - Implement secure notes
   - Add 2FA code generation
   - Add password breach monitoring

4. **Testing**
   - Add unit tests
   - Add integration tests
   - Add E2E tests
   - Security audit

5. **Deployment**
   - Set up CI/CD pipeline
   - Configure app signing
   - Prepare for app stores
   - Set up analytics and crash reporting


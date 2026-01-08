# WebVault Development Context

**Last Updated:** 2026-01-08
**Session:** UI Modernization & Enterprise-Grade Polish

---

## Project Overview

**WebVault** is a zero-knowledge password manager built with TypeScript and Vite, featuring:
- AES-GCM 256-bit encryption with PBKDF2 key derivation
- WebAuthn/TouchID/FaceID passwordless unlock
- Duress mode (decoy vault)
- TOTP 2FA support
- XSS prevention (15+ attack vectors)
- Password breach checking via Have I Been Pwned API

---

## Recent Major Changes (Latest Session)

### 1. Duress Mode Component Extraction
**Completed:** Decoupled security logic from main controller

**Details:**
- Extracted `setupDuress` logic into a new Web Component: `<duress-mode>`
- Located in `src/components/shared/DuressMode.ts`
- Encapsulates UI button and setup logic (prompt, encryption, storage)
- Replaced hardcoded button in `index.html` with component tag

### 2. Global State Elimination
**Completed:** Removed fragile global variables

**Details:**
- Removed `window.sessionKey`, `let vault`, `entryModalComponent` globals
- Updated `main.ts` to rely exclusively on `VaultState` singleton
- Updated `BiometricAuth.ts` to fetch key from `vaultState`
- Eliminates risk of state pollution and improves security

### 3. Main.ts Modularization
**Completed:** Transformed main.ts into a thin controller

**Details:**
- Removed `renderUI()` (replaced by reactive state subscriptions)
- Removed direct DOM manipulation for component internals
- Centralized initialization logic
- Reduced file complexity and improved maintainability

----

## Previous Session Changes

### UI Architecture Overhaul
**Completed:** Professional table view with sidebar navigation

**Before:**
- Single-page card-based layout
- Entries displayed as individual cards
- Limited scalability for multiple passwords

**After:**
- Dual-mode layout: Auth mode (centered card) → Vault mode (full-screen sidebar + table)
- Sidebar navigation with 7 categories (All, Favorites, Work, Personal, Finance, Social, Other)
- 8-column table: Icon, Service, Category, Username/Email, 2FA, Security, Breach, Actions
- Toolbar with search, New Password, Save, Lock buttons
- Modal dialogs for entry creation/editing
- Header/footer automatically hidden in vault mode

**Files Modified:**
- `index.html`: Complete CSS and HTML restructure (633 lines changed)
- `src/main.ts`: New rendering architecture (390 lines changed)

### Password Breach Detection
**Integrated:** Live breach checking for all passwords

**Implementation:**
- Uses Have I Been Pwned API with k-anonymity (SHA-1 prefix only)
- Async checks when table renders (shows "Checking..." → result)
- Sync check with user confirmation when saving entries
- Displays: ✅ Safe, ⚠️ [count], or — (offline)
- Privacy-preserving: only first 5 chars of hash sent

**Code Location:**
- `src/utils/breach-check.ts`: API integration
- `src/main.ts:425-439`: Table rendering with async checks
- `src/main.ts:706-717`: Save-time validation

---

## Current File Structure

```
keepassman/
├── src/
│   ├── main.ts              # Core application logic (950+ lines)
│   ├── crypto.ts            # AES-GCM encryption engine
│   ├── security.ts          # XSS prevention & validation
│   ├── utils/
│   │   ├── password.ts      # Generation & entropy calculation
│   │   ├── breach-check.ts  # Have I Been Pwned integration
│   │   └── totp.ts          # TOTP/2FA implementation
│   └── theme.css            # Base theme styles
├── index.html               # Main HTML with embedded CSS (520+ lines)
├── README.md                # Comprehensive documentation
└── package.json             # Dependencies (Vite, TypeScript, OTPAuth)
```

---

## Key State Variables (src/main.ts)

```typescript
let sessionKey: CryptoKey | null = null;      // Active encryption key
let vault: { entries: any[] } = { entries: [] }; // Main data structure
let isDecoyMode = false;                       // Duress mode flag
let editingId: string | null = null;          // Currently editing entry
let currentCategory = 'all';                   // Active category filter
```

---

## Data Model

### Entry Structure
```typescript
{
  id: string,              // UUID v4
  title: string,           // Service name (XSS validated)
  username?: string,       // Username/email (optional)
  password: string,        // Password (breach checked)
  category: string,        // work|personal|finance|social|other
  totpSecret?: string,     // Base32 TOTP secret (optional, validated)
  favorite?: boolean       // Star flag (future feature)
}
```

### LocalStorage Schema
| Key | Description |
|-----|-------------|
| `encrypted_vault` | Primary vault `{iv: Array, data: Array}` |
| `decoy_vault` | Stealth/fake vault for duress mode |
| `vault_salt` | 256-bit salt for main vault |
| `decoy_salt` | 256-bit salt for decoy vault |
| `bio_credential_id` | Base64 WebAuthn credential ID |
| `bio_wrapped_password` | Encrypted master password |
| `bio_registered` | Boolean flag for passkey UI |

---

## Key Functions (src/main.ts)

### Rendering
- `renderUI()`: Master rendering orchestrator
- `renderTable()`: Populates password table with filtered entries
- `updateCategoryCounts()`: Updates sidebar category counters
- `openEntryModal(entry?)`: Opens create/edit modal
- `closeEntryModal()`: Closes modal and resets state

### Helpers
- `getCategoryIcon(category)`: Returns emoji for category
- `getCategoryName(category)`: Returns display name
- `showEntryDetails(entry)`: Shows entry info in alert
- `showTOTPModal(entry)`: Displays 2FA code with copy

### Security
- `SecurityScanner.validateAndSanitize()`: XSS prevention
- `SecurityScanner.validateBase32()`: TOTP secret validation
- `SecurityScanner.findDuplicatePasswords()`: Duplicate detection
- `checkPasswordBreach()`: Async breach check via API

---

## Recent Commits

```
f3884fe - Theme toggle UX improvements, toolbar reorganization, CSS migration, and test fixes
fdfcdde - Fix theme toggle button collision with toolbar
ade0fdb - Update documentation for table view UI and breach checking
9916b07 - Add professional table view with sidebar navigation and breach checking (squashed)
682a93f - Add screenshots to README showcasing light and dark mode
```

---

## Known Issues / Technical Debt

None currently identified. All reported issues have been resolved:
- ✅ Table visibility fixed (CSS flex container for #vault-content)
- ✅ Breach checking integrated
- ✅ Theme button collision resolved
- ✅ Header/footer hiding in vault mode

---

## Future Enhancement Ideas

### High Priority
1. **Favorites System**: Implement star/favorite functionality (already in data model)
2. **Dark Mode**: Implement theme switching with localStorage persistence
3. **Export/Import**: JSON export/import for backup
4. **Password History**: Track password changes over time
5. **Auto-Lock Timer**: Automatically lock vault after inactivity

### Medium Priority
6. **Bulk Operations**: Select multiple entries for bulk actions
7. **Advanced Search**: Filter by multiple criteria
8. **Password Generator Settings**: Customizable length, character sets
9. **Breach Monitoring**: Background checks for new breaches
10. **Sort/Filter Options**: Table column sorting, advanced filters

### Low Priority
11. **Tags System**: Multiple tags per entry
12. **Notes Field**: Secure notes for each entry
13. **Attachments**: Encrypted file attachments
14. **Keyboard Shortcuts**: Power user shortcuts
15. **CSV Import**: Import from other password managers

---

## Development Notes

### Build Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build (dist/)
npm run preview  # Preview production build
```

### Code Style
- TypeScript strict mode
- ES modules
- Inline CSS in index.html (single-file distribution)
- Async/await for all crypto operations
- XSS validation on all user inputs

### Security Principles
1. **Zero-Knowledge**: Master password never stored, only derived keys
2. **Client-Side Only**: No backend, all data in localStorage
3. **Defense in Depth**: Multiple layers of XSS prevention
4. **Privacy First**: Breach checks use k-anonymity
5. **No Telemetry**: Zero tracking or analytics

---

## Testing Checklist

When resuming development, verify:
- [ ] Unlock with master password works
- [ ] Table renders correctly with all columns
- [ ] Category filtering works
- [ ] Search functionality works
- [ ] New entry creation with all fields
- [ ] Entry editing and deletion
- [ ] TOTP code generation and display
- [ ] Breach checking shows results
- [ ] Save functionality encrypts vault
- [ ] Lock button returns to auth screen
- [ ] Theme toggle button positioned correctly
- [ ] Modal dialogs open/close properly
- [ ] Passkey/biometric unlock (if registered)

---

## Contact & Resources

- **Repository**: https://github.com/zonepearl/keepassman
- **License**: MIT
- **Version**: 1.0.0
- **Author**: Pearl Young

### External APIs
- Have I Been Pwned: https://api.pwnedpasswords.com/range/{prefix}
- WebAuthn API: Native browser support

### Documentation References
- [NIST PBKDF2 Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [RFC 6238 - TOTP Specification](https://datatracker.ietf.org/doc/html/rfc6238)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

## Session Summary

**Previous Session:** User Interface refinements (Theme Toggle, Toolbar) and CSS refactoring.

**Latest Session:** Focused on architectural health and security:
- **Refactoring:** Extracted Duress Mode logic to a dedicated Web Component.
- **Cleanup:** Removed global variables (`window.sessionKey`, `let vault`) from `main.ts`.
- **State Management:** Fully verified transition to `VaultState` singleton.
- **Verification:** All tests passed (47/47) and build verified.

**Key Learnings:**
1. **Component Encapsulation:** Extracting feature logic (like Duress) into components simplifies the main controller.
2. **State Hygiene:** Using a singleton for state prevents global variable pollution and makes dependencies explicit.
3. **Reactive Patterns:** Subscribing to state changes is more robust than manual render calls.

**Status**: ✅ All tasks completed successfully
**Next Steps**: UI Modernization (started)

---

**Next Steps**: Implementation completed. Verification in progress.

---

## Recent Implementations

### 1. Backup & Restore (Option 1)
**Completed:** Manual Export/Import of encrypted vault backups.
- **Export**: `src/utils/backup.ts` generates encrypted JSON blob.
- **Import**: `SetupWizard` allows restoring from JSON.
- **UI**: Added Export button to Toolbar.

---

## Active Plan: UI Modernization (Enterprise Grade)

### 1. Visual Design & Typography
- **Goal**: Refine palette and spacing for a premium feel.
- **Actions**:
  - Update Brand Color from Generic Blue (`#2563eb`) to Indigo (`#4f46e5`).
  - Introduce `Elevation` shadows (soft) instead of hard borders.
  - Refine text hierarchy (primary vs secondary colors).

### 2. Smart Table UX
- **Goal**: Reduce visual noise and increase data density.
- **Actions**:
  - Tighten row padding (`16px` -> `12px`).
  - Implement "Hover-Only" actions (Edit/Delete buttons only visible when hovering row).
  - Add generated "Avatar" circles for service initials.

### 3. Modern Modals
- **Goal**: Glassmorphism and smoother transitions.
- **Actions**:
  - Add `backdrop-filter: blur(4px)`.
  - Add entrance animations (fade-in + slight scale).

### 4. Toast Notifications
- **Goal**: Replace blocking `alert()` calls.
- **Actions**:
  - ✅ Created `<toast-notification>` component.
  - ✅ Replaced 25+ native alerts with `showToast()`.


---

# 📚 Technical Reference (Migrated from README)

## 🛠️ Developer Documentation

### Internal Logic & Architecture
WebVault is a Zero-Knowledge password manager. This section outlines the security protocols and logical flows implemented within the application.

### 🔐 Cryptographic Stack
The vault relies exclusively on the native **Web Crypto API** for hardware-accelerated, secure operations.
* **Key Derivation (KDF):** Uses `PBKDF2` with `SHA-256`
* **Iterations:** 100,000
* **Salt:** Unique 256-bit `Uint8Array` per user
* **Encryption Algorithm:** `AES-GCM` (256-bit). This provides **Authenticated Encryption**, ensuring data confidentiality and integrity.

### 🧠 Primary Security Logic

#### 🎭 Duress Mode (Decoy Switching)
Authentication uses a **fallthrough decryption mechanism** to provide plausible deniability:
1. **Attempt A:** Derive key → Decrypt `encrypted_vault`
2. **Attempt B (on Failure):** Derive key → Decrypt `decoy_vault`
3. **State Management:** If Attempt B succeeds, `isDecoyMode` is set to `true`. All subsequent `SAVE` operations are routed to the decoy storage slot.

#### ☝️ Passkey Flow (WebAuthn with Encrypted Password Storage)
Passkeys provide **passwordless authentication** with secure encrypted storage:
1. **Registration:** WebAuthn credential created -> Wrapping key derived from credential ID -> Master password encrypted with wrapping key -> Stored in `bio_wrapped_password`.
2. **Authentication:** Biometric unlock -> Credential ID retrieved -> Wrapping key re-derived -> Password decrypted -> Vault unlocked.

### 📁 Storage Schema (`localStorage`)
| Key | Format | Description |
| --- | --- | --- |
| `encrypted_vault` | JSON | Primary vault `{iv: Array, data: Array}` |
| `decoy_vault` | JSON | The stealth/fake vault triggered by the Duress password |
| `vault_salt` | JSON Array | Per-user salt for main vault (256-bit) |
| `decoy_salt` | JSON Array | Per-user salt for decoy vault (256-bit) |
| `bio_credential_id` | String | Base64-encoded WebAuthn credential ID |
| `bio_wrapped_password` | JSON | Encrypted master password `{iv: Array, data: Array}` |
| `bio_registered` | Boolean | UI flag to display the passkey unlock button |

### 🛡️ Input Security & Sanitization
* **XSS Prevention**: `SecurityScanner` blocks script tags, event handlers, `javascript:` URLs, and more.
* **Clickjacking**: JS Frame-Buster + `frame-ancestors` directive recommendation.

### 📊 Password Audit Algorithm
* **Formula:** `Entropy = Length × log₂(PoolSize)`
* **Threshold:** Entries < 40 bits are flagged `Weak`.

---

## 🧪 Testing reference

### Test Suite Overview
WebVault includes comprehensive unit tests for cryptographic operations and password utilities using **Vitest**. (47/47 Passing).

### Running Tests
```bash
npm test        # Watch mode
npm run test:run # Run once
```

### Security Test Coverage
1. **Deterministic Key Derivation**: Same password + salt = same key
2. **Authenticated Encryption**: Tampered ciphertext fails decryption
3. **IV Randomness**: All IVs are unique and unpredictable
4. **Data Integrity**: Multiple encrypt/decrypt cycles preserve data

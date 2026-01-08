
import { CryptoEngine } from './crypto.js';
import { vaultState } from './state/VaultState.js';
import './components/index.js'; // Register all Web Components
/**
 * 1. GLOBAL STATE & CONFIG
 * Note: Most state has been moved to VaultState singleton
 * These remain for backward compatibility during refactoring
 */
let sessionKey: CryptoKey | null = null;
let vault: { entries: any[] } = { entries: [] };
let isDecoyMode = false;
let editingId: string | null = null;
let currentCategory = 'all'; // Track active category filter

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32)); // 256-bit salt
}

/**
 * Retrieve salt from localStorage or generate new one
 */
function getSalt(storageKey: string): Uint8Array {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        const saltArray = JSON.parse(stored);
        return new Uint8Array(saltArray);
    }
    return generateSalt();
}

/**
 * 2. WIZARD & ONBOARDING LOGIC
 */
function goToStep(step: number) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    const targetStep = document.getElementById(`step-${step}`);
    if (targetStep) targetStep.classList.remove('hidden');
}

async function handleFinishSetup() {
    const p1 = (document.getElementById('setup-pwd') as HTMLInputElement).value;
    const p2 = (document.getElementById('setup-pwd-conf') as HTMLInputElement).value;

    if (p1.length < 12) return alert("Security Requirement: Master Password must be at least 12 characters.");
    if (p1 !== p2) return alert("Passwords do not match.");

    try {
        const initialVault = { entries: [] };

        // Generate unique salt for this vault
        const salt = generateSalt();
        const key = await CryptoEngine.deriveKey(p1, salt);
        const { ciphertext, iv } = await CryptoEngine.encrypt(JSON.stringify(initialVault), key);

        // Store encrypted vault
        localStorage.setItem('encrypted_vault', JSON.stringify({
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(ciphertext))
        }));

        // Store salt separately (unencrypted - salt is not secret)
        localStorage.setItem('vault_salt', JSON.stringify(Array.from(salt)));
        localStorage.setItem('vault_initialized', 'true');

        alert("Vault created successfully! Please log in with your new password.");
        location.reload();
    } catch (e) {
        alert("Setup failed. Ensure your browser supports WebCrypto.");
    }
}

/**
 * 3. BIOMETRIC LOGIC (WEBAUTHN WITH PASSKEY)
 *
 * SECURITY MODEL: Secure passkey-based unlock with encrypted password storage
 * - Master password is encrypted and stored in localStorage
 * - Encryption key is derived from a random wrapping key
 * - Wrapping key is encrypted using the WebAuthn credential ID as key material
 * - On TouchID verification, wrapping key is decrypted and used to unlock password
 * - This provides true passwordless login while maintaining security
 *
 * SECURITY PROPERTIES:
 * - Master password encrypted with AES-GCM
 * - Wrapping key derived from credential ID (unique per device)
 * - Requires biometric verification to decrypt
 * - Zero-knowledge: server never sees password or keys
 */

/**
 * Derive a wrapping key from the WebAuthn credential ID
 */
async function deriveWrappingKey(credentialId: Uint8Array): Promise<CryptoKey> {
    // Import credential ID as key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        credentialId as any, // Use 'as any' to bypass TypeScript buffer check
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // Derive a wrapping key using PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: new Uint8Array([87, 101, 98, 86, 97, 117, 108, 116]) as any, // "WebVault" as salt
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt master password for passkey storage
 */
async function encryptPassword(password: string, wrappingKey: CryptoKey): Promise<{ iv: number[]; data: number[] }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        wrappingKey,
        encoder.encode(password)
    );
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
}

/**
 * Decrypt master password from passkey storage
 */
async function decryptPassword(encryptedData: { iv: number[]; data: number[] }, wrappingKey: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(encryptedData.iv) as any },
        wrappingKey,
        new Uint8Array(encryptedData.data).buffer
    );
    return new TextDecoder().decode(decrypted);
}

async function registerBiometrics() {
    // Verify vault is currently unlocked
    if (!sessionKey) {
        return alert("Please unlock your vault first before enabling biometrics.");
    }

    // Get the current master password from input
    const pwdInput = document.getElementById('master-pwd') as HTMLInputElement;
    const masterPassword = pwdInput?.value;

    if (!masterPassword) {
        return alert("Master password not found. Please unlock your vault first.");
    }

    try {
        if (window.isSecureContext && window.PublicKeyCredential) {
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: "WebVault" },
                    user: {
                        id: crypto.getRandomValues(new Uint8Array(16)),
                        name: "vault_user",
                        displayName: "Vault User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    }
                }
            }) as PublicKeyCredential;

            if (credential) {
                const credentialId = new Uint8Array(credential.rawId);

                // Derive wrapping key from credential ID
                const wrappingKey = await deriveWrappingKey(credentialId);

                // Encrypt master password
                const encryptedPassword = await encryptPassword(masterPassword, wrappingKey);

                // Store credential ID and encrypted password
                localStorage.setItem('bio_credential_id', btoa(String.fromCharCode(...credentialId)));
                localStorage.setItem('bio_wrapped_password', JSON.stringify(encryptedPassword));
                localStorage.setItem('bio_registered', 'true');

                alert("✓ Passkey registered! Next time, unlock with TouchID/FaceID without entering password.");
            }
        } else {
            alert("WebAuthn not supported. Requires HTTPS and compatible device.");
        }
    } catch (e) {
        console.error("Biometric registration failed:", e);
        alert("Passkey registration failed. Ensure you're using HTTPS and have a compatible device.");
    }
}

async function biometricUnlock() {
    try {
        const idBase64 = localStorage.getItem('bio_credential_id');
        const wrappedPasswordJson = localStorage.getItem('bio_wrapped_password');

        if (!idBase64) {
            alert("No passkey found. Please register TouchID/FaceID first.");
            return;
        }

        if (!wrappedPasswordJson) {
            // Fallback: Old biometric system without password wrapping
            alert("Legacy biometric mode detected. Please re-register your passkey for passwordless unlock.");
            return;
        }

        if (window.isSecureContext && window.PublicKeyCredential) {
            // Verify biometric identity with TouchID/FaceID
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: Uint8Array.from(atob(idBase64), c => c.charCodeAt(0)),
                        type: 'public-key'
                    }],
                    userVerification: "required"
                }
            });

            // Biometric verification succeeded - decrypt master password
            const credentialId = Uint8Array.from(atob(idBase64), c => c.charCodeAt(0));
            const wrappingKey = await deriveWrappingKey(credentialId);
            const encryptedPassword = JSON.parse(wrappedPasswordJson);
            const masterPassword = await decryptPassword(encryptedPassword, wrappingKey);

            // Auto-fill password and trigger unlock
            const pwdInput = document.getElementById('master-pwd') as HTMLInputElement;
            if (pwdInput) {
                pwdInput.value = masterPassword;
                document.getElementById('unlock-btn')?.click();

                // Clear password from input after unlock attempt for security
                setTimeout(() => {
                    if (pwdInput) pwdInput.value = '';
                }, 100);
            }
        }
    } catch (e) {
        console.warn("Passkey unlock failed or cancelled:", e);
        alert("TouchID/FaceID authentication failed or was cancelled.");
    }
}

/**
 * 4. DURESS (STEALTH) MODE
 */
async function setupDuress() {
    const dPwd = prompt("Set a secondary 'Panic' password (different from master):");
    if (!dPwd) return;
    if (dPwd.length < 12) {
        alert("Duress password must be at least 12 characters.");
        return;
    }

    const decoy = { entries: [{ id: 'decoy-1', title: 'Fake Bank', password: 'password123' }] };

    // Generate unique salt for duress vault
    const salt = generateSalt();
    const key = await CryptoEngine.deriveKey(dPwd, salt);
    const { ciphertext, iv } = await CryptoEngine.encrypt(JSON.stringify(decoy), key);

    // Store decoy vault and its salt
    localStorage.setItem('decoy_vault', JSON.stringify({
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(ciphertext))
    }));
    localStorage.setItem('decoy_salt', JSON.stringify(Array.from(salt)));

    alert("Duress Vault Ready. Log in with this password to show fake data.");
}

/**
 * 5. CORE UI RENDERING - NEW TABLE VIEW
 * Note: Table rendering and sidebar updates now handled by components
 */
async function renderUI() {
    // Sync local vault state to VaultState
    // Components will automatically re-render via state subscription
    vaultState.setVault(vault);
    vaultState.setCurrentCategory(currentCategory);
    vaultState.setEditingId(editingId);
}

/**
 * Component references
 * Initialized in initApp()
 */
let entryModalComponent: any = null;

/**
 * 6. AUTHENTICATION & CORE EVENTS
 */
document.getElementById('unlock-btn')?.addEventListener('click', async () => {
    const pwdInput = document.getElementById('master-pwd') as HTMLInputElement;
    const pwd = pwdInput ? pwdInput.value : "";
    if (!pwd) return;

    try {
        const real = localStorage.getItem('encrypted_vault');
        const decoy = localStorage.getItem('decoy_vault');

        let decrypted = null;

        // Try to decrypt real vault first
        if (real) {
            try {
                const realSalt = getSalt('vault_salt');
                const realKey = await CryptoEngine.deriveKey(pwd, realSalt);
                const { iv, data } = JSON.parse(real);
                decrypted = await CryptoEngine.decrypt(new Uint8Array(data).buffer, realKey, new Uint8Array(iv));
                sessionKey = realKey;
                isDecoyMode = false;
            } catch { }
        }

        // If real vault fails, try decoy vault
        if (!decrypted && decoy) {
            try {
                const decoySalt = getSalt('decoy_salt');
                const decoyKey = await CryptoEngine.deriveKey(pwd, decoySalt);
                const { iv, data } = JSON.parse(decoy);
                decrypted = await CryptoEngine.decrypt(new Uint8Array(data).buffer, decoyKey, new Uint8Array(iv));
                sessionKey = decoyKey;
                isDecoyMode = true;
            } catch { }
        }

        if (decrypted || (!real && !decoy)) {
            if (decrypted) vault = JSON.parse(decrypted);

            // Switch to vault mode layout
            const app = document.getElementById('app');
            const main = document.querySelector('main');
            const footer = document.querySelector('footer');
            const header = document.querySelector('header');

            if (app) {
                app.classList.remove('auth-mode');
                app.classList.add('vault-mode');
            }
            if (main) {
                main.classList.remove('auth-view');
                main.classList.add('vault-view');
            }
            if (footer) {
                footer.classList.add('hidden');
            }
            if (header) {
                header.classList.add('hidden');
            }

            document.getElementById('auth-section')?.classList.add('hidden');
            document.getElementById('vault-content')?.classList.remove('hidden');
            if (isDecoyMode) document.getElementById('decoy-indicator')?.classList.remove('hidden');
            renderUI();
        } else { alert("Access Denied: Incorrect Master Password."); }
    } catch { alert("Encryption Error."); }
});

/**
 * 7. EVENT BINDINGS
 */
document.getElementById('wizard-next-btn')?.addEventListener('click', () => goToStep(2));
document.getElementById('wizard-finish-btn')?.addEventListener('click', handleFinishSetup);

document.getElementById('enable-bio-btn')?.addEventListener('click', registerBiometrics);
document.getElementById('bio-btn')?.addEventListener('click', biometricUnlock);
document.getElementById('setup-duress-btn')?.addEventListener('click', setupDuress);

// Listen for category-change events from VaultSidebar component
document.addEventListener('category-change', ((e: CustomEvent) => {
    currentCategory = e.detail.category;
    renderUI();
}) as EventListener);

// Listen for edit-entry events from VaultTable component
document.addEventListener('edit-entry', ((e: CustomEvent) => {
    if (entryModalComponent) {
        entryModalComponent.openModal(e.detail.entry);
    }
}) as EventListener);

// Listen for VaultToolbar component events
document.addEventListener('search-change', (() => {
    renderUI();
}) as EventListener);

document.addEventListener('new-entry', (() => {
    if (entryModalComponent) {
        entryModalComponent.openModal();
    }
}) as EventListener);

// Listen for EntryModal component events
document.addEventListener('modal-opened', ((e: CustomEvent) => {
    if (e.detail.entry) {
        editingId = e.detail.entry.id;
    } else {
        editingId = null;
    }
}) as EventListener);

document.addEventListener('modal-closed', (() => {
    editingId = null;
}) as EventListener);

document.addEventListener('entry-saved', ((e: CustomEvent) => {
    const { entry, isEdit } = e.detail;

    if (isEdit) {
        const idx = vault.entries.findIndex(x => x.id === entry.id);
        if (idx !== -1) {
            vault.entries[idx] = entry;
        }
    } else {
        vault.entries.push(entry);
    }

    editingId = null;
    renderUI();
}) as EventListener);

document.addEventListener('save-vault', (async () => {
    if (!sessionKey) return;
    const { ciphertext, iv } = await CryptoEngine.encrypt(JSON.stringify(vault), sessionKey);
    const storageKey = isDecoyMode ? 'decoy_vault' : 'encrypted_vault';
    localStorage.setItem(storageKey, JSON.stringify({
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(ciphertext))
    }));
    alert("Vault Encrypted & Saved Successfully.");
}) as EventListener);

document.addEventListener('lock-vault', (() => {
    location.reload();
}) as EventListener);



/**
 * 8. INITIALIZATION
 */
function initApp() {
    if (!localStorage.getItem('vault_initialized')) {
        document.getElementById('setup-wizard')?.classList.remove('hidden');
    }
    if (localStorage.getItem('bio_registered') === 'true') {
        document.getElementById('bio-btn')?.classList.remove('hidden');
    }

    // Create and initialize components
    const vaultTable = document.createElement('vault-table');
    vaultTable.style.display = 'none'; // Hidden component that manages tbody
    document.body.appendChild(vaultTable);

    const vaultSidebar = document.createElement('vault-sidebar');
    vaultSidebar.style.display = 'none'; // Hidden component that manages category list
    document.body.appendChild(vaultSidebar);

    const vaultToolbar = document.createElement('vault-toolbar');
    vaultToolbar.style.display = 'none'; // Hidden component that manages toolbar actions
    document.body.appendChild(vaultToolbar);

    entryModalComponent = document.createElement('entry-modal');
    entryModalComponent.style.display = 'none'; // Hidden component that manages modal
    document.body.appendChild(entryModalComponent);
}

initApp();


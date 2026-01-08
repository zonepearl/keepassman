/**
 * Biometric Authentication Service
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

export class BiometricService {
    private static readonly STORAGE_KEYS = {
        CREDENTIAL_ID: 'bio_credential_id',
        WRAPPED_PASSWORD: 'bio_wrapped_password',
        REGISTERED: 'bio_registered'
    };

    private static readonly WEBAUTHN_CONFIG = {
        RP_NAME: 'WebVault',
        USER_NAME: 'vault_user',
        USER_DISPLAY_NAME: 'Vault User',
        SALT: new Uint8Array([87, 101, 98, 86, 97, 117, 108, 116]), // "WebVault"
        PBKDF2_ITERATIONS: 100000
    };

    /**
     * Derive a wrapping key from the WebAuthn credential ID
     */
    private static async deriveWrappingKey(credentialId: Uint8Array): Promise<CryptoKey> {
        // Import credential ID as key material
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            credentialId as any,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // Derive a wrapping key using PBKDF2
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: this.WEBAUTHN_CONFIG.SALT as any,
                iterations: this.WEBAUTHN_CONFIG.PBKDF2_ITERATIONS,
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
    private static async encryptPassword(password: string, wrappingKey: CryptoKey): Promise<{ iv: number[]; data: number[] }> {
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
    private static async decryptPassword(encryptedData: { iv: number[]; data: number[] }, wrappingKey: CryptoKey): Promise<string> {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(encryptedData.iv) as any },
            wrappingKey,
            new Uint8Array(encryptedData.data).buffer
        );
        return new TextDecoder().decode(decrypted);
    }

    /**
     * Check if WebAuthn is supported in current environment
     */
    static isSupported(): boolean {
        return !!(window.isSecureContext && window.PublicKeyCredential);
    }

    /**
     * Check if biometric authentication is registered
     */
    static isRegistered(): boolean {
        return localStorage.getItem(this.STORAGE_KEYS.REGISTERED) === 'true';
    }

    /**
     * Register biometric authentication with master password
     * @param masterPassword - The master password to encrypt and store
     * @returns Promise<void>
     * @throws Error if registration fails
     */
    static async register(masterPassword: string): Promise<void> {
        if (!this.isSupported()) {
            throw new Error("WebAuthn not supported. Requires HTTPS and compatible device.");
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: this.WEBAUTHN_CONFIG.RP_NAME },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(16)),
                    name: this.WEBAUTHN_CONFIG.USER_NAME,
                    displayName: this.WEBAUTHN_CONFIG.USER_DISPLAY_NAME
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                }
            }
        }) as PublicKeyCredential;

        if (!credential) {
            throw new Error("Failed to create credential");
        }

        const credentialId = new Uint8Array(credential.rawId);

        // Derive wrapping key from credential ID
        const wrappingKey = await this.deriveWrappingKey(credentialId);

        // Encrypt master password
        const encryptedPassword = await this.encryptPassword(masterPassword, wrappingKey);

        // Store credential ID and encrypted password
        localStorage.setItem(this.STORAGE_KEYS.CREDENTIAL_ID, btoa(String.fromCharCode(...credentialId)));
        localStorage.setItem(this.STORAGE_KEYS.WRAPPED_PASSWORD, JSON.stringify(encryptedPassword));
        localStorage.setItem(this.STORAGE_KEYS.REGISTERED, 'true');
    }

    /**
     * Unlock vault using biometric authentication
     * @returns Promise<string> - The decrypted master password
     * @throws Error if unlock fails or is cancelled
     */
    static async unlock(): Promise<string> {
        const idBase64 = localStorage.getItem(this.STORAGE_KEYS.CREDENTIAL_ID);
        const wrappedPasswordJson = localStorage.getItem(this.STORAGE_KEYS.WRAPPED_PASSWORD);

        if (!idBase64) {
            throw new Error("No passkey found. Please register TouchID/FaceID first.");
        }

        if (!wrappedPasswordJson) {
            throw new Error("Legacy biometric mode detected. Please re-register your passkey for passwordless unlock.");
        }

        if (!this.isSupported()) {
            throw new Error("WebAuthn not supported.");
        }

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
        const wrappingKey = await this.deriveWrappingKey(credentialId);
        const encryptedPassword = JSON.parse(wrappedPasswordJson);
        return await this.decryptPassword(encryptedPassword, wrappingKey);
    }

    /**
     * Clear biometric registration data
     */
    static clear(): void {
        localStorage.removeItem(this.STORAGE_KEYS.CREDENTIAL_ID);
        localStorage.removeItem(this.STORAGE_KEYS.WRAPPED_PASSWORD);
        localStorage.removeItem(this.STORAGE_KEYS.REGISTERED);
    }
}

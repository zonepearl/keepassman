import { WasmCryptoService } from './services/WasmCryptoService.js';
import type { CryptoBridge } from './pkg/securepass_wasm.js';

/**
 * Cryptographic Engine for WebVault
 * 
 * [MIGRATION 2026]: This engine now proxies to the Rust-Wasm logic tier.
 * It maintains the same API as the legacy Web Crypto implementation but uses 
 * Argon2id for key derivation and Rust-optimized AES-256-GCM.
 */
export const CryptoEngine = {
    ALGO: "AES-GCM" as const,

    /**
     * Derives a key using Argon2id via the Wasm bridge.
     * Note: Returns a CryptoBridge instance cast to CryptoKey to maintain API compatibility.
     */
    async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const bridge = await WasmCryptoService.createBridge(password, salt);

        // Polyfill properties to satisfy legacy tests that expect a WebCrypto CryptoKey
        Object.defineProperties(bridge, {
            type: { value: 'secret', enumerable: true },
            algorithm: { value: { name: 'AES-GCM' }, enumerable: true }
        });

        return bridge as any;
    },

    /**
     * Encrypts data using the Wasm bridge.
     */
    async encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
        const bridge = key as any as CryptoBridge;
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = bridge.encrypt(data, iv);

        return {
            ciphertext: ciphertext.buffer as ArrayBuffer,
            iv
        };
    },

    /**
     * Decrypts ciphertext using the Wasm bridge.
     */
    async decrypt(ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
        const bridge = key as any as CryptoBridge;
        // The Wasm bridge expects a Uint8Array
        const cipherArray = new Uint8Array(ciphertext);
        return bridge.decrypt(cipherArray, iv);
    }
};

/**
 * Cryptography Utilities
 * Helper functions for salt generation and management
 */

/**
 * Generate a cryptographically secure random salt (256-bit)
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Retrieve salt from localStorage or generate new one
 * @param storageKey - The localStorage key to retrieve salt from
 * @returns Uint8Array salt
 */
export function getSalt(storageKey: string): Uint8Array {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        const saltArray = JSON.parse(stored);
        return new Uint8Array(saltArray);
    }
    return generateSalt();
}

/**
 * Biometric Authentication Component
 * Handles biometric registration and unlock UI interactions
 */

import { BaseComponent } from '../BaseComponent.js';
import { BiometricService } from '../../services/BiometricService.js';
import { vaultState } from '../../state/VaultState.js';

export class BiometricAuth extends BaseComponent {
    protected render(): void {
        // This component doesn't render its own UI
        // It attaches to existing buttons in the HTML
    }

    protected attachEventListeners(): void {
        // Register biometric button
        const registerBtn = document.getElementById('enable-bio-btn');
        registerBtn?.addEventListener('click', () => this.handleRegister());

        // Biometric unlock button
        const unlockBtn = document.getElementById('bio-btn');
        unlockBtn?.addEventListener('click', () => this.handleUnlock());
    }

    /**
     * Handle biometric registration
     */
    private async handleRegister(): Promise<void> {
        // Check if vault is unlocked (sessionKey is available)
        const sessionKey = vaultState.getSessionKey();
        if (!sessionKey) {
            alert("Please unlock your vault first before enabling biometrics.");
            return;
        }

        // Get the current master password from input
        const pwdInput = document.getElementById('master-pwd') as HTMLInputElement;
        const masterPassword = pwdInput?.value;

        if (!masterPassword) {
            alert("Master password not found. Please unlock your vault first.");
            return;
        }

        try {
            await BiometricService.register(masterPassword);
            alert("✓ Passkey registered! Next time, unlock with TouchID/FaceID without entering password.");

            // Show the bio unlock button
            document.getElementById('bio-btn')?.classList.remove('hidden');
        } catch (error) {
            console.error("Biometric registration failed:", error);
            alert((error as Error).message || "Passkey registration failed. Ensure you're using HTTPS and have a compatible device.");
        }
    }

    /**
     * Handle biometric unlock
     */
    private async handleUnlock(): Promise<void> {
        try {
            const masterPassword = await BiometricService.unlock();

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
        } catch (error) {
            console.warn("Passkey unlock failed or cancelled:", error);
            alert((error as Error).message || "TouchID/FaceID authentication failed or was cancelled.");
        }
    }

    protected onStateChange(): void {
        // This component doesn't need to react to vault state changes
    }
}

// Register the custom element
customElements.define('biometric-auth', BiometricAuth);

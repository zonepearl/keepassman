/**
 * Setup Wizard Component
 * Handles initial vault creation and onboarding
 */

import { BaseComponent } from '../BaseComponent.js';
import { CryptoEngine } from '../../crypto.js';

export class SetupWizard extends BaseComponent {
    protected render(): void {
        this.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div id="step-1" class="wizard-step">
                        <h2 style="margin-top: 0;">Welcome to WebVault 🛡️</h2>
                        <p>This is a <strong>Zero-Knowledge</strong> application designed by <strong>Pearl Young</strong>.</p>
                        <p style="font-size: 14px; line-height: 1.5; opacity: 0.8;">
                            We cannot recover your password. If you lose it, your data is gone forever. Please use a password
                            you will never forget.
                        </p>
                        <button id="wizard-next-btn" class="btn-primary" style="width: 100%; margin-top: 20px;">
                            I Accept the Responsibility
                        </button>
                    </div>

                    <div id="step-2" class="wizard-step hidden">
                        <h2 style="margin-top: 0;">Create Master Key</h2>
                        <p style="font-size: 14px; opacity: 0.8;">Set your primary password (Min. 12 characters).</p>
                        <input type="password" id="setup-pwd" placeholder="New Master Password">
                        <input type="password" id="setup-pwd-conf" placeholder="Confirm Password">
                        <button id="wizard-finish-btn" class="btn-primary" style="width: 100%; margin-top: 20px;">
                            Create My Vault
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    protected attachEventListeners(): void {
        // Next button (step 1 → step 2)
        const nextBtn = this.querySelector('#wizard-next-btn');
        nextBtn?.addEventListener('click', () => this.goToStep(2));

        // Finish button (create vault)
        const finishBtn = this.querySelector('#wizard-finish-btn');
        finishBtn?.addEventListener('click', () => this.handleFinishSetup());
    }

    /**
     * Navigate to a specific wizard step
     */
    private goToStep(step: number): void {
        this.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
        const targetStep = this.querySelector(`#step-${step}`);
        if (targetStep) targetStep.classList.remove('hidden');
    }

    /**
     * Generate a cryptographically secure random salt
     */
    private generateSalt(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(32)); // 256-bit salt
    }

    /**
     * Handle vault creation
     */
    private async handleFinishSetup(): Promise<void> {
        const p1 = (this.querySelector('#setup-pwd') as HTMLInputElement).value;
        const p2 = (this.querySelector('#setup-pwd-conf') as HTMLInputElement).value;

        if (p1.length < 12) {
            alert("Security Requirement: Master Password must be at least 12 characters.");
            return;
        }
        if (p1 !== p2) {
            alert("Passwords do not match.");
            return;
        }

        try {
            const initialVault = { entries: [] };

            // Generate unique salt for this vault
            const salt = this.generateSalt();
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

            // Dispatch event for completion
            this.dispatchEvent(new CustomEvent('wizard-completed', {
                bubbles: true,
                composed: true
            }));

            location.reload();
        } catch (e) {
            alert("Setup failed. Ensure your browser supports WebCrypto.");
        }
    }

    /**
     * Show the wizard modal
     */
    public show(): void {
        this.style.display = 'block';
        this.goToStep(1); // Start at step 1
    }

    /**
     * Hide the wizard modal
     */
    public hide(): void {
        this.style.display = 'none';
    }

    protected onStateChange(): void {
        // Wizard doesn't need to react to vault state changes
    }
}

// Register the custom element
customElements.define('setup-wizard', SetupWizard);

import { BaseComponent } from '../BaseComponent.js';
import { CryptoEngine } from '../../crypto.js';
import { generateSalt } from '../../utils/crypto-utils.js';

export class DuressMode extends BaseComponent {
    constructor() {
        super();
    }

    protected render(): void {
        this.innerHTML = `
            <button id="setup-duress-btn" class="btn-outline" style="width: 100%; font-size: 12px; margin-bottom: 8px;">
                🎭 Configure Duress
            </button>
        `;
    }

    protected attachEventListeners(): void {
        const btn = this.querySelector('#setup-duress-btn');
        if (btn) {
            btn.addEventListener('click', this.setupDuress.bind(this));
        }
    }

    private async setupDuress(): Promise<void> {
        const dPwd = prompt("Set a secondary 'Panic' password (different from master):");
        if (!dPwd) return;
        
        if (dPwd.length < 12) {
            alert("Duress password must be at least 12 characters.");
            return;
        }

        const decoy = { entries: [{ id: 'decoy-1', title: 'Fake Bank', password: 'password123', category: 'finance' }] };

        try {
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
        } catch (error) {
            console.error("Error setting up duress mode:", error);
            alert("Failed to setup Duress Mode.");
        }
    }
}

customElements.define('duress-mode', DuressMode);

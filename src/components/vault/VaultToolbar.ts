/**
 * Vault Toolbar Component
 * Manages search, new password, save, and lock actions
 */

import { BaseComponent } from '../BaseComponent.js';
import { vaultState } from '../../state/VaultState.js';

export class VaultToolbar extends BaseComponent {
    protected render(): void {
        // This component doesn't need to render anything
        // It only manages event listeners on existing DOM elements
    }

    protected attachEventListeners(): void {
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            vaultState.setSearchQuery(query);

            // Dispatch event for backward compatibility
            this.dispatchEvent(new CustomEvent('search-change', {
                detail: { query },
                bubbles: true,
                composed: true
            }));
        });

        // New Password button
        const newEntryBtn = document.getElementById('new-entry-btn');
        newEntryBtn?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('new-entry', {
                bubbles: true,
                composed: true
            }));
        });

        // Save button
        const saveBtn = document.getElementById('save-btn');
        saveBtn?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('save-vault', {
                bubbles: true,
                composed: true
            }));
        });

        // Lock button
        const lockBtn = document.getElementById('lock-btn');
        lockBtn?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('lock-vault', {
                bubbles: true,
                composed: true
            }));
        });
    }

    protected onStateChange(): void {
        // Toolbar doesn't need to react to state changes
        // It's purely for user actions
    }
}

// Register the custom element
customElements.define('vault-toolbar', VaultToolbar);

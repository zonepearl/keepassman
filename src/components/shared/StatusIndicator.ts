/**
 * Status Indicator Component
 * Shows online/offline connection status
 */

import { BaseComponent } from '../BaseComponent.js';

export class StatusIndicator extends BaseComponent {
    protected render(): void {
        const isOnline = navigator.onLine;
        const dotColor = isOnline ? 'var(--success)' : 'var(--warning)';
        const statusText = isOnline ? 'ONLINE' : 'OFFLINE';

        this.innerHTML = `
            <div style="font-size: 11px; margin-top: 8px; font-weight: 500;">
                <span id="status-dot" style="background-color: ${dotColor}"></span>
                <span id="status-text">${statusText}</span>
            </div>
        `;
    }

    connectedCallback(): void {
        super.connectedCallback();

        // Listen for online/offline events
        window.addEventListener('online', () => this.render());
        window.addEventListener('offline', () => this.render());
    }

    protected onStateChange(): void {
        // Status indicator doesn't need to react to vault state changes
        // Only re-renders on online/offline events
    }
}

// Register the custom element
customElements.define('status-indicator', StatusIndicator);

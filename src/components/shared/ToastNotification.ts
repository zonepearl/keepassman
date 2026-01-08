
import { BaseComponent } from '../BaseComponent.js';

type ToastType = 'success' | 'error' | 'info';

export class ToastNotification extends BaseComponent {
    private container: HTMLElement | null = null;

    protected render(): void {
        // Create container if not exists
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    protected attachEventListeners(): void {
        // Listens for custom 'show-toast' event on document
        document.addEventListener('show-toast', ((e: CustomEvent) => {
            this.show(e.detail.message, e.detail.type || 'info', e.detail.duration);
        }) as EventListener);
    }

    protected onStateChange(): void { }

    public show(message: string, type: ToastType = 'info', duration: number = 3000): void {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon based on type
        let icon = '';
        if (type === 'success') icon = '<span class="toast-icon">✓</span>';
        if (type === 'error') icon = '<span class="toast-icon">✕</span>';
        if (type === 'info') icon = '<span class="toast-icon">ℹ</span>';

        toast.innerHTML = `${icon} <span class="toast-message">${message}</span>`;

        this.container.appendChild(toast);

        // Entrance animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300); // Wait for exit animation
        }, duration);
    }
}

customElements.define('toast-notification', ToastNotification);

// Helper to easy trigger toasts from anywhere
export function showToast(message: string, type: ToastType = 'info', duration: number = 3000) {
    document.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type, duration }
    }));
}

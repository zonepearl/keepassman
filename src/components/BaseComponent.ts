/**
 * Base class for all Web Components
 * Provides common functionality and lifecycle management
 */

import { vaultState } from '../state/VaultState.js';

export abstract class BaseComponent extends HTMLElement {
    protected unsubscribe: (() => void) | null = null;

    constructor() {
        super();
    }

    /**
     * Called when component is added to DOM
     * Override in subclass to add initialization logic
     */
    connectedCallback(): void {
        this.render();
        this.attachEventListeners();

        // Subscribe to state changes
        this.unsubscribe = vaultState.subscribe(() => {
            this.onStateChange();
        });
    }

    /**
     * Called when component is removed from DOM
     * Override in subclass to add cleanup logic
     */
    disconnectedCallback(): void {
        this.cleanup();
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    /**
     * Render the component's HTML
     * Must be implemented by subclass
     */
    protected abstract render(): void;

    /**
     * Attach event listeners to DOM elements
     * Override in subclass to add event listeners
     */
    protected attachEventListeners(): void {
        // Override in subclass
    }

    /**
     * Handle state changes
     * Override in subclass to react to state changes
     */
    protected onStateChange(): void {
        // Override in subclass - default is to re-render
        this.render();
    }

    /**
     * Cleanup before component is removed
     * Override in subclass to add cleanup logic
     */
    protected cleanup(): void {
        // Override in subclass
    }

    /**
     * Safely query selector within component
     */
    protected $(selector: string): HTMLElement | null {
        return this.querySelector(selector);
    }

    /**
     * Safely query all selectors within component
     */
    protected $$(selector: string): NodeListOf<Element> {
        return this.querySelectorAll(selector);
    }
}

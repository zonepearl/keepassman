/**
 * Component Registry
 * Import and register all custom Web Components
 */

// Shared components
import './shared/ThemeToggle.js';
import './shared/StatusIndicator.js';

// Vault components
import './vault/VaultTable.js';

// Export for convenience
export { ThemeToggle } from './shared/ThemeToggle.js';
export { StatusIndicator } from './shared/StatusIndicator.js';
export { VaultTable } from './vault/VaultTable.js';

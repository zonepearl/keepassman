/**
 * Component Registry
 * Import and register all custom Web Components
 */

// Shared components
import './shared/ThemeToggle.js';
import './shared/StatusIndicator.js';

// Vault components
import './vault/VaultTable.js';
import './vault/VaultSidebar.js';
import './vault/VaultToolbar.js';
import './vault/EntryModal.js';

// Export for convenience
export { ThemeToggle } from './shared/ThemeToggle.js';
export { StatusIndicator } from './shared/StatusIndicator.js';
export { VaultTable } from './vault/VaultTable.js';
export { VaultSidebar } from './vault/VaultSidebar.js';
export { VaultToolbar } from './vault/VaultToolbar.js';
export { EntryModal } from './vault/EntryModal.js';

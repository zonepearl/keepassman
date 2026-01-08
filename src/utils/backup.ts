
/**
 * Backup Utility
 * Handles exporting and importing encrypted vault data.
 */

export interface BackupData {
    version: number;
    timestamp: string;
    vault: {
        iv: number[];
        data: number[];
    };
    salt: number[];
}

export class BackupService {
    /**
     * Downloads the current encrypted vault state as a JSON file
     */
    static exportBackup(): void {
        const encryptedVault = localStorage.getItem('encrypted_vault');
        const saltStr = localStorage.getItem('vault_salt');

        if (!encryptedVault || !saltStr) {
            throw new Error("No vault data found to export.");
        }

        const vaultData = JSON.parse(encryptedVault);
        const salt = JSON.parse(saltStr);

        const backup: BackupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            vault: vaultData,
            salt: salt
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `securepass_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * validates and restores a backup file
     */
    static async importBackup(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const backup: BackupData = JSON.parse(content);

                    // Basic schema validation
                    if (!backup.vault || !backup.vault.iv || !backup.vault.data || !backup.salt) {
                        throw new Error("Invalid backup file format.");
                    }

                    // Restore to localStorage
                    // We must clear existing data to prevent state corruption
                    localStorage.clear();

                    localStorage.setItem('encrypted_vault', JSON.stringify(backup.vault));
                    localStorage.setItem('vault_salt', JSON.stringify(backup.salt));
                    localStorage.setItem('vault_initialized', 'true');

                    resolve();
                } catch (error) {
                    reject(new Error("Failed to parse backup file. It may be corrupted."));
                }
            };

            reader.onerror = () => reject(new Error("Error reading file."));
            reader.readAsText(file);
        });
    }
}

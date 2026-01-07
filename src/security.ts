/**
 * Security Scanner - Enhanced XSS Prevention and Input Validation
 *
 * Provides comprehensive protection against:
 * - Cross-Site Scripting (XSS) attacks
 * - Script injection attempts
 * - HTML injection
 * - Event handler injection
 * - JavaScript protocol URLs
 * - Data URI schemes
 */
export const SecurityScanner = {
    /**
     * Escape HTML entities to prevent XSS
     * Converts dangerous characters to HTML entities
     */
    escapeHTML(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Enhanced XSS detection with comprehensive pattern matching
     * Detects multiple XSS attack vectors including:
     * - Script tags (all variations)
     * - Event handlers (onclick, onerror, onload, etc.)
     * - JavaScript protocol URLs
     * - Data URIs
     * - HTML entities encoding attempts
     * - SVG-based XSS
     * - Iframe injection
     */
    detectXSS(input: string): boolean {
        const xssPatterns = [
            // Script tags (case-insensitive, with/without spaces)
            /<script[\s\S]*?>/gi,
            /<\/script>/gi,

            // Event handlers
            /on\w+\s*=\s*["']?[\s\S]*?["']?/gi,  // onclick, onerror, onload, etc.

            // JavaScript protocol
            /javascript:/gi,

            // Data URIs (potential XSS vector)
            /data:text\/html/gi,

            // HTML entities encoding attempts
            /&#x?[0-9a-f]+;?/gi,

            // SVG tags (XSS vector)
            /<svg[\s\S]*?>/gi,

            // Iframe injection
            /<iframe[\s\S]*?>/gi,

            // Object/embed tags
            /<(object|embed)[\s\S]*?>/gi,

            // Meta refresh (redirect XSS)
            /<meta[\s\S]*?http-equiv[\s\S]*?refresh[\s\S]*?>/gi,

            // Style-based XSS
            /<style[\s\S]*?>/gi,
            /expression\s*\(/gi,  // CSS expression()

            // Import statements
            /@import/gi,

            // Link tags with javascript
            /<link[\s\S]*?href[\s\S]*?javascript:/gi
        ];

        return xssPatterns.some(pattern => pattern.test(input));
    },

    /**
     * Detect SQL injection patterns (defense in depth)
     */
    detectInjection(input: string): boolean {
        const patterns = [
            /' OR '1'='1/gim,
            /--/g,
            /;.*?DROP/gi,
            /UNION.*?SELECT/gi
        ];
        return patterns.some(pattern => pattern.test(input));
    },

    /**
     * Comprehensive input sanitization
     * Removes control characters, null bytes, and trims whitespace
     */
    sanitizeInput(input: string): string {
        return input
            .replace(/[\x00-\x1F\x7F]/g, "")  // Remove control characters
            .replace(/\0/g, "")                // Remove null bytes
            .trim();
    },

    /**
     * Validate and sanitize text input with XSS prevention
     * Returns sanitized input or throws if malicious content detected
     */
    validateAndSanitize(input: string, fieldName: string = "Input"): string {
        if (!input) return "";

        // Check for XSS attempts
        if (this.detectXSS(input)) {
            throw new Error(`${fieldName} contains potentially malicious content (XSS detected)`);
        }

        // Check for injection attempts
        if (this.detectInjection(input)) {
            throw new Error(`${fieldName} contains potentially malicious content (Injection detected)`);
        }

        // Sanitize and return
        return this.sanitizeInput(input);
    },

    /**
     * Validate password strength
     */
    validatePassword(pwd: string) {
        return {
            isValid: pwd.length >= 12,
            message: pwd.length < 12 ? "Password must be at least 12 characters." : ""
        };
    },

    /**
     * Validate Base32 format for TOTP secrets
     * Base32 alphabet: A-Z (uppercase) and 2-7
     * May include padding with '='
     */
    validateBase32(input: string): { isValid: boolean; message: string } {
        if (!input || input.length === 0) {
            return { isValid: false, message: "TOTP secret cannot be empty" };
        }

        // Remove spaces for validation
        const cleaned = input.replace(/\s+/g, '');

        // Base32 pattern: only A-Z, 2-7, and optional padding
        const base32Pattern = /^[A-Z2-7]+=*$/;

        if (!base32Pattern.test(cleaned)) {
            return {
                isValid: false,
                message: "Invalid Base32 format. Only A-Z, 2-7, and '=' allowed"
            };
        }

        // Check padding is at the end only
        const paddingMatch = cleaned.match(/=+$/);
        if (paddingMatch) {
            const padding = paddingMatch[0].length;
            // Base32 padding must be 0, 1, 3, 4, or 6 characters
            if (![1, 3, 4, 6].includes(padding)) {
                return {
                    isValid: false,
                    message: "Invalid Base32 padding"
                };
            }
        }

        // Minimum length check (typical TOTP secrets are 16+ characters)
        if (cleaned.length < 16) {
            return {
                isValid: false,
                message: "TOTP secret too short (minimum 16 characters)"
            };
        }

        return { isValid: true, message: "" };
    },

    /**
     * Check for duplicate passwords in vault entries
     * Returns array of entry titles that use the same password
     */
    findDuplicatePasswords(entries: Array<{ id: string; title: string; password: string }>,
                          newPassword: string,
                          excludeId?: string): string[] {
        return entries
            .filter(entry => entry.id !== excludeId)
            .filter(entry => entry.password === newPassword)
            .map(entry => entry.title);
    }
};
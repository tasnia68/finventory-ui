/**
 * Generates a UUID v4.
 * Falls back to a crypto.getRandomValues-based implementation when
 * crypto.randomUUID is unavailable (e.g. HTTP / non-secure contexts).
 */
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // RFC 4122 v4-compliant fallback using getRandomValues (available on HTTP).
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
};

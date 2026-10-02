/**
 * TechCareAuth — Cache API session management
 * Session is stored as a JSON Response in the 'techcare_session_v1' cache.
 * Credentials are validated against IndexedDB (TechCareDB).
 */
const TechCareAuth = (() => {
    const CACHE_NAME = 'techcare_session_v1';
    const SESSION_KEY = 'http://localhost/techcare-session';
    const DEFAULT_SALT = 'techcare_salt_2026';

    /**
     * Compute salted SHA-256 hash using the native browser Web Crypto API
     */
    async function hashPassword(password, salt = DEFAULT_SALT) {
        const enc = new TextEncoder();
        const data = enc.encode(salt + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function _cache() { return caches.open(CACHE_NAME); }

    async function getSession() {
        try {
            const c = await _cache();
            const r = await c.match(SESSION_KEY);
            return r ? r.json() : null;
        } catch { return null; }
    }

    async function _saveSession(data) {
        const c = await _cache();
        await c.put(SESSION_KEY, new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        }));
    }

    async function login(email, password) {
        await TechCareDB.init(); // ensure DB is seeded
        const cred = await TechCareDB.getCredential(email);
        if (!cred) {
            throw new Error('Invalid email or password. Please try again.');
        }

        const salt = cred.salt || DEFAULT_SALT;
        const inputHash = await hashPassword(password, salt);

        // Verify against salted hash, or fallback/migrate legacy plaintext if present
        const isValid = cred.passwordHash ? (cred.passwordHash === inputHash) : (cred.password === password);
        if (!isValid) {
            throw new Error('Invalid email or password. Please try again.');
        }

        // If stored as legacy plaintext, upgrade to hashed credentials now
        if (cred.password && !cred.passwordHash) {
            await TechCareDB.saveCredential({
                email: cred.email,
                passwordHash: inputHash,
                salt
            });
        }

        const profile = await TechCareDB.getProfile();
        const session = {
            email:     cred.email,
            name:      profile?.name || 'Dr. Simmons',
            loggedIn:  true,
            loginTime: new Date().toISOString()
        };
        await _saveSession(session);
        return { session, profile };
    }

    async function logout() {
        try { await caches.delete(CACHE_NAME); } catch {}
    }

    async function isAuthenticated() {
        const s = await getSession();
        return !!(s && s.loggedIn);
    }

    async function changePassword(currentPw, newPw) {
        const session = await getSession();
        if (!session) throw new Error('Not logged in.');
        const cred = await TechCareDB.getCredential(session.email);
        if (!cred) throw new Error('Account not found.');

        const salt = cred.salt || DEFAULT_SALT;
        const currentHash = await hashPassword(currentPw, salt);
        const isValid = cred.passwordHash ? (cred.passwordHash === currentHash) : (cred.password === currentPw);
        if (!isValid) {
            throw new Error('Current password is incorrect.');
        }

        const newHash = await hashPassword(newPw, salt);
        await TechCareDB.saveCredential({
            email: cred.email,
            passwordHash: newHash,
            salt
        });
    }

    return { login, logout, isAuthenticated, getSession, changePassword, hashPassword };
})();

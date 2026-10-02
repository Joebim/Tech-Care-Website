/**
 * TechCareAuth — Cache API session management
 * Session is stored as a JSON Response in the 'techcare_session_v1' cache.
 * Credentials are validated against IndexedDB (TechCareDB).
 */
const TechCareAuth = (() => {
    const CACHE_NAME = 'techcare_session_v1';
    const SESSION_KEY = 'http://localhost/techcare-session';

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
        await TechCareDB.init();                                   // ensure DB is seeded
        const cred = await TechCareDB.getCredential(email);
        if (!cred || cred.password !== password) {
            throw new Error('Invalid email or password. Please try again.');
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
        if (!cred || cred.password !== currentPw) {
            throw new Error('Current password is incorrect.');
        }
        await TechCareDB.saveCredential({ ...cred, password: newPw });
    }

    return { login, logout, isAuthenticated, getSession, changePassword };
})();

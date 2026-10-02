/**
 * TechCareDB — IndexedDB wrapper
 * Stores: profile, credentials, appointments, messages
 */
const TechCareDB = (() => {
    const DB_NAME    = 'techcare_db';
    const DB_VERSION = 2;
    let _db = null;

    function openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('profile')) {
                    db.createObjectStore('profile', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('credentials')) {
                    db.createObjectStore('credentials', { keyPath: 'email' });
                }
                if (!db.objectStoreNames.contains('appointments')) {
                    const s = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('dateKey', 'dateKey', { unique: false });
                }
                // If upgrading to v2, recreate messages store so only the first patient gets intro
                if (e.oldVersion < 2 && db.objectStoreNames.contains('messages')) {
                    db.deleteObjectStore('messages');
                }
                if (!db.objectStoreNames.contains('messages')) {
                    const s = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('patientName', 'patientName', { unique: false });
                }
            };

            req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror    = (e) => reject(e.target.error);
        });
    }

    /* ---- low-level helpers ---- */
    const put  = (store, item) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readwrite').objectStore(store).put(item);
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    }));

    const get  = (store, key) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readonly').objectStore(store).get(key);
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    }));

    const add  = (store, item) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readwrite').objectStore(store).add(item);
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    }));

    const del  = (store, key) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readwrite').objectStore(store).delete(key);
        r.onsuccess = () => res();
        r.onerror   = () => rej(r.error);
    }));

    const getAll = (store) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readonly').objectStore(store).getAll();
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    }));

    const getByIndex = (store, idx, val) => openDB().then(db => new Promise((res, rej) => {
        const r = db.transaction(store, 'readonly').objectStore(store).index(idx).getAll(val);
        r.onsuccess = () => res(r.result);
        r.onerror   = () => rej(r.error);
    }));

    /* ---- seed defaults on first run ---- */
    async function init() {
        await openDB();

        const profile = await get('profile', 'doctor').catch(() => null);
        if (!profile) {
            await put('profile', {
                id:              'doctor',
                name:            'Dr. Jose Simmons',
                specialty:       'General Practitioner',
                email:           'j.simmons@techcare.io',
                phone:           '+1 (555) 234-5678',
                department:      'General Medicine',
                bio:             'Board-certified general practitioner with 12+ years of experience in primary care and preventive medicine.',
                address:         '123 Medical Center Drive, Suite 400, San Francisco, CA 94102',
                photo:           './assets/images/senior-woman-doctor-and-portrait-smile-for-health-2023-11-27-05-18-16-utc.png',
                patients:        1284,
                yearsExperience: 12,
                rating:          4.9
            });
        }

        const cred = await get('credentials', 'j.simmons@techcare.io').catch(() => null);
        if (!cred) {
            await put('credentials', { email: 'j.simmons@techcare.io', password: 'TechCare2026!' });
        }
    }

    /* ---- public API ---- */
    return {
        init,

        // Profile
        getProfile:  ()     => get('profile', 'doctor'),
        saveProfile: (data) => put('profile', { ...data, id: 'doctor' }),

        // Credentials
        getCredential:  (email) => get('credentials', email.toLowerCase().trim()),
        saveCredential: (cred)  => put('credentials', cred),

        // Appointments
        getAppointmentsByDate: (dateKey) => getByIndex('appointments', 'dateKey', dateKey),
        getAllAppointments:     ()        => getAll('appointments'),
        addAppointment:        (appt)    => add('appointments', appt),
        deleteAppointment:     (id)      => del('appointments', id),

        // Messages
        getMessages:    (patientName) => getByIndex('messages', 'patientName', patientName),
        getAllMessages: ()            => getAll('messages'),
        addMessage:     (msg)         => add('messages', msg),
    };
})();

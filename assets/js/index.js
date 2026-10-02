// ============================================================
// UTILITIES
// ============================================================

function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showToast(message, duration = 2800) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
}

// ============================================================
// DATA FETCHING (external API)
// ============================================================

const username   = 'coalition';
const password   = 'skills-test';
const authString = btoa(`${username}:${password}`);

let _cachedData = null;
const fetchData = async () => {
    if (_cachedData) return _cachedData;
    try {
        const response = await fetch('https://fedskillstest.coalitiontechnologies.workers.dev', {
            headers: { Authorization: `Basic ${authString}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        _cachedData = await response.json();
        return _cachedData;
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
};

// ============================================================
// NAVIGATION
// ============================================================

const navlinks = document.querySelectorAll('.nav-links li');
const pages    = document.querySelectorAll('.container .page');

function resetNav() {
    pages.forEach(div => div.style.display = 'none');
    navlinks.forEach(link => {
        link.querySelector('button').style.backgroundColor = 'transparent';
        link.querySelector('button').style.borderRadius    = '';
    });
}

function activatePage(index) {
    resetNav();
    navlinks[index].querySelector('button').style.backgroundColor = 'var(--active1)';
    navlinks[index].querySelector('button').style.borderRadius    = '40px';
    pages[index].style.display = 'flex';
    if (index === 3) {
        document.body.classList.add('messages-active');
    } else {
        document.body.classList.remove('messages-active');
    }
    if (index === 0) {
        updateOverviewMetrics();
    }
    refreshIcons();
}

resetNav();
// Default: Overview (index 0)
activatePage(0);

// Clicking logo takes to overview page
const logo = document.querySelector('.nav-logo');
if (logo) {
    logo.addEventListener('click', () => activatePage(0));
}
const logoContain = document.querySelector('.logo-contain');
if (logoContain) {
    logoContain.addEventListener('click', () => activatePage(0));
}

navlinks.forEach((link, index) => {
    link.addEventListener('click', () => {
        activatePage(index);
        if (index === 2) initSchedulePage();
        if (index === 3) initMessagePage();
        if (index === 4) initTransactionPage();
    });
});

// ============================================================
// OVERVIEW PAGE & DATA-DRIVEN METRICS
// ============================================================

function renderOverviewSchedule(baseToday, dbAppts) {
    const list = document.getElementById('overview-schedule-list');
    if (!list) return;

    const allToday = [
        ...(baseToday || []).map(a => ({ ...a, isDB: false })),
        ...(dbAppts || []).map(a => ({ ...a, isDB: true }))
    ];

    if (allToday.length === 0) {
        list.innerHTML = '<p style="padding:16px;color:#888;font-size:13px;text-align:center;">No appointments scheduled for today.</p>';
        return;
    }

    list.innerHTML = allToday.map((item, idx) => {
        const isFirst = idx === 0;
        return `
            <div class="schedule-item ${isFirst ? 'schedule-active' : ''}">
                <div class="schedule-time">
                    <p class="time-text">${item.time}</p>
                    <p class="time-ampm">${item.ampm || 'AM'}</p>
                </div>
                <div class="schedule-line ${isFirst ? 'active-line' : ''}"></div>
                <div class="schedule-details">
                    <p class="sched-patient">${item.patient} ${item.isDB ? '<span style="font-size:10px;color:#009e88;font-weight:700;margin-left:4px;">(New)</span>' : ''}</p>
                    <p class="sched-type">${item.type}${item.notes ? ' &bull; ' + item.notes : ''}</p>
                </div>
                <span class="sched-status ${isFirst ? 'ongoing' : 'upcoming'}">${isFirst ? 'In Progress' : 'Upcoming'}</span>
            </div>
        `;
    }).join('');
}

function renderOverviewDemographics(patientsData) {
    const total = patientsData.length;
    if (!total) return;

    let males = 0, females = 0;
    let a1 = 0, a2 = 0, a3 = 0, a4 = 0;

    patientsData.forEach(p => {
        const g = (p.gender || '').toLowerCase();
        if (g === 'male') males++;
        else if (g === 'female') females++;

        const age = Number(p.age) || 0;
        if (age < 18) a1++;
        else if (age <= 40) a2++;
        else if (age <= 65) a3++;
        else a4++;
    });

    const mPct = Math.round((males / total) * 100);
    const fPct = Math.round((females / total) * 100);
    const oPct = Math.max(0, 100 - mPct - fPct);

    const mBar = document.getElementById('demo-bar-male');
    const mTxt = document.getElementById('demo-pct-male');
    if (mBar) mBar.style.width = `${mPct}%`;
    if (mTxt) mTxt.textContent = `${mPct}%`;

    const fBar = document.getElementById('demo-bar-female');
    const fTxt = document.getElementById('demo-pct-female');
    if (fBar) fBar.style.width = `${fPct}%`;
    if (fTxt) fTxt.textContent = `${fPct}%`;

    const oBar = document.getElementById('demo-bar-other');
    const oTxt = document.getElementById('demo-pct-other');
    if (oBar) oBar.style.width = `${oPct}%`;
    if (oTxt) oTxt.textContent = `${oPct}%`;

    // Age groups
    const a1Pct = Math.round((a1 / total) * 100);
    const a2Pct = Math.round((a2 / total) * 100);
    const a3Pct = Math.round((a3 / total) * 100);
    const a4Pct = Math.round((a4 / total) * 100);

    const setAge = (barId, valId, pct) => {
        const b = document.getElementById(barId);
        const v = document.getElementById(valId);
        if (b) b.style.width = `${pct}%`;
        if (v) v.textContent = `${pct}%`;
    };
    setAge('age-bar-0-17', 'age-val-0-17', a1Pct);
    setAge('age-bar-18-40', 'age-val-18-40', a2Pct);
    setAge('age-bar-41-65', 'age-val-41-65', a3Pct);
    setAge('age-bar-65-plus', 'age-val-65-plus', a4Pct);
}

function renderOverviewDiagnoses(patientsData) {
    const list = document.getElementById('overview-diagnoses-list');
    if (!list) return;

    const conditionMap = {};
    patientsData.forEach(p => {
        if (Array.isArray(p.diagnostic_list)) {
            p.diagnostic_list.forEach(d => {
                const name = d.name || d;
                conditionMap[name] = (conditionMap[name] || 0) + 1;
            });
        }
    });

    const sorted = Object.entries(conditionMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) return;

    const maxCount = sorted[0][1];
    const colors = [
        { dot: '#E66FD2', grad: 'linear-gradient(90deg, #E66FD2, #F472B6)' },
        { dot: '#8C6FE6', grad: 'linear-gradient(90deg, #8C6FE6, #A78BFA)' },
        { dot: '#01F0D0', grad: 'linear-gradient(90deg, #01F0D0, #00C4A7)' },
        { dot: '#FFB347', grad: 'linear-gradient(90deg, #FFB347, #FBBF24)' },
        { dot: '#6FA8E6', grad: 'linear-gradient(90deg, #6FA8E6, #93C5FD)' },
    ];

    list.innerHTML = sorted.map(([name, count], i) => {
        const c = colors[i % colors.length];
        const pct = Math.round((count / patientsData.length) * 100);
        const barWidth = Math.max(15, Math.round((count / maxCount) * 85));
        return `
            <div class="diagnoses-item">
                <div class="diagnoses-row-top">
                    <div class="diagnoses-left">
                        <div class="diag-dot" style="background:${c.dot};"></div>
                        <span class="diag-name">${name}</span>
                    </div>
                    <span class="diag-count-pill">${count} patients &bull; ${pct}%</span>
                </div>
                <div class="diag-bar-track">
                    <div class="diag-bar-fill" style="width:${barWidth}%;background:${c.grad};"></div>
                </div>
            </div>
        `;
    }).join('');
}

async function updateOverviewMetrics() {
    try {
        // 1. Doctor Profile from DB
        const profile = typeof TechCareDB !== 'undefined' ? await TechCareDB.getProfile().catch(() => null) : null;
        const doctorNameEl = document.getElementById('hero-doctor-name');
        if (doctorNameEl && profile && profile.name) {
            doctorNameEl.textContent = profile.name;
        }

        // 2. Patient data from DB / API
        const patientsData = typeof fetchData === 'function' ? await fetchData() : null;
        const totalPatients = profile?.patients || (patientsData && patientsData.length ? 1284 : 1284);
        const statPatientNum = document.getElementById('stat-patient-num');
        if (statPatientNum) statPatientNum.textContent = Number(totalPatients).toLocaleString();
        const demoTotalChip = document.getElementById('demo-total-chip');
        if (demoTotalChip) demoTotalChip.textContent = `${Number(totalPatients).toLocaleString()} Active`;

        // 3. Appointments from DB (Today: 2026-10-02)
        const todayKey = '2026-10-02';
        const dbAppts = typeof TechCareDB !== 'undefined' ? await TechCareDB.getAppointmentsByDate(todayKey).catch(() => []) : [];
        const baseToday = typeof baseAppointmentsData !== 'undefined' && baseAppointmentsData[todayKey] ? baseAppointmentsData[todayKey] : [];
        const todayApptCount = 24 + (dbAppts ? dbAppts.length : 0);

        const heroApptCount = document.getElementById('hero-appt-count');
        if (heroApptCount) heroApptCount.textContent = `${todayApptCount} patient visits`;
        const statApptNum = document.getElementById('stat-appt-num');
        if (statApptNum) statApptNum.textContent = todayApptCount;
        const statApptChange = document.getElementById('stat-appt-change');
        if (statApptChange) statApptChange.innerHTML = `&#8593; ${4 + (dbAppts ? dbAppts.length : 0)} more than yesterday`;

        // 4. Lab Results from Patients
        let totalLabs = 0;
        if (patientsData && Array.isArray(patientsData)) {
            patientsData.forEach(p => {
                if (Array.isArray(p.lab_results)) totalLabs += p.lab_results.length;
            });
        }
        if (!totalLabs) totalLabs = 38;
        const pendingLabs = Math.max(1, Math.round(totalLabs * 0.13)); // ~5 pending
        const heroLabCount = document.getElementById('hero-lab-count');
        if (heroLabCount) heroLabCount.textContent = `${pendingLabs} lab reviews`;
        const statLabNum = document.getElementById('stat-lab-num');
        if (statLabNum) statLabNum.textContent = totalLabs;
        const statLabChange = document.getElementById('stat-lab-change');
        if (statLabChange) statLabChange.textContent = `${pendingLabs} awaiting review`;

        // 5. Unread Messages from DB
        const allMsgs = typeof TechCareDB !== 'undefined' ? await TechCareDB.getAllMessages().catch(() => []) : [];
        let unreadMsgCount = 7;
        if (allMsgs && allMsgs.length > 0) {
            const patientMsgs = allMsgs.filter(m => m.from === 'patient');
            const uniquePatients = new Set(allMsgs.map(m => m.patientName));
            unreadMsgCount = Math.max(patientMsgs.length, uniquePatients.size);
        }
        const heroMsgCount = document.getElementById('hero-msg-count');
        if (heroMsgCount) heroMsgCount.textContent = unreadMsgCount;
        const statMsgNum = document.getElementById('stat-msg-num');
        if (statMsgNum) statMsgNum.textContent = unreadMsgCount;
        const statMsgChange = document.getElementById('stat-msg-change');
        if (statMsgChange) statMsgChange.textContent = `From ${unreadMsgCount} patients`;

        // 6. Today's Schedule on Overview
        renderOverviewSchedule(baseToday, dbAppts || []);

        // 7. Demographics & Diagnoses
        if (patientsData && patientsData.length > 0) {
            renderOverviewDemographics(patientsData);
            renderOverviewDiagnoses(patientsData);
        }
    } catch (err) {
        console.error('Error updating overview metrics:', err);
    }
}

// Overview Quick Actions & Card Click Handlers
function initOverviewInteractions() {
    const newApptBtn = document.getElementById('overview-new-appt-btn');
    if (newApptBtn) {
        newApptBtn.addEventListener('click', () => {
            if (typeof openNewApptModal === 'function') openNewApptModal();
        });
    }

    const viewPatientsBtn = document.getElementById('overview-view-patients-btn');
    if (viewPatientsBtn) {
        viewPatientsBtn.addEventListener('click', () => activatePage(1));
    }

    const checkMessagesBtn = document.getElementById('overview-check-messages-btn');
    if (checkMessagesBtn) {
        checkMessagesBtn.addEventListener('click', () => {
            activatePage(3);
            if (typeof initMessagePage === 'function') initMessagePage();
        });
    }

    const seeAllSchedBtn = document.getElementById('overview-see-all-sched');
    if (seeAllSchedBtn) {
        seeAllSchedBtn.addEventListener('click', () => {
            activatePage(2);
            if (typeof initSchedulePage === 'function') initSchedulePage();
        });
    }

    const statPatients = document.getElementById('stat-patients-card');
    if (statPatients) {
        statPatients.addEventListener('click', () => activatePage(1));
    }

    const statSchedule = document.getElementById('stat-schedule-card');
    if (statSchedule) {
        statSchedule.addEventListener('click', () => {
            activatePage(2);
            if (typeof initSchedulePage === 'function') initSchedulePage();
        });
    }

    const statMessages = document.getElementById('stat-messages-card');
    if (statMessages) {
        statMessages.addEventListener('click', () => {
            activatePage(3);
            if (typeof initMessagePage === 'function') initMessagePage();
        });
    }

    updateOverviewMetrics();
}
initOverviewInteractions();

// ============================================================
// LOGIN / AUTH
// ============================================================

const loginScreen = document.getElementById('login-screen');
const loginBtn    = document.getElementById('login-btn');
const loginEmail  = document.getElementById('login-email');
const loginPw     = document.getElementById('login-password');
const loginError  = document.getElementById('login-error');

function showLogin() {
    loginScreen.classList.remove('hidden');
    loginScreen.style.display = 'flex';
}

function hideLogin() {
    loginScreen.classList.add('hidden');
    loginScreen.style.display = 'none';
}

// Password eye toggle
document.getElementById('pw-toggle').addEventListener('click', () => {
    const isText = loginPw.type === 'text';
    loginPw.type = isText ? 'password' : 'text';
    document.getElementById('pw-toggle').innerHTML = isText
        ? '<i data-lucide="eye"></i>'
        : '<i data-lucide="eye-off"></i>';
    refreshIcons();
});

loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const pw    = loginPw.value;
    if (!email || !pw) { showLoginError('Please enter your email and password.'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';
    try {
        const { profile } = await TechCareAuth.login(email, pw);
        loginError.classList.add('hidden');
        hideLogin();
        applyProfileToUI(profile);
        activatePage(0); // Show overview page instead of patients
        initMainApp();   // Preload patient data in background
        showToast(`Welcome back, ${profile?.name || 'Doctor'}!`);
    } catch (err) {
        showLoginError(err.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
});

loginPw.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
}

// ============================================================
// APP BOOTSTRAP
// ============================================================

async function bootApp() {
    await TechCareDB.init();
    const auth = await TechCareAuth.isAuthenticated();
    if (auth) {
        hideLogin();
        const profile = await TechCareDB.getProfile();
        if (profile) applyProfileToUI(profile);
        activatePage(0);
        await initMainApp();
    } else {
        showLogin();
    }
}

function applyProfileToUI(profile) {
    if (!profile) return;
    document.querySelectorAll('.user-name .primary-text').forEach(el => el.textContent = profile.name);
    document.querySelector('.dropdown-name') && (document.querySelector('.dropdown-name').textContent = profile.name);
    const heroDoc = document.getElementById('hero-doctor-name');
    if (heroDoc && profile.name) heroDoc.textContent = profile.name;
}

async function initMainApp() {
    await displayData();
    const data = await fetchData();
    if (data) {
        const selected = getSelectedPatientData(data, 'Jessica Taylor') || data[3] || data[0];
        if (selected) updatePageWithPatientData(selected);
    }
    await updateOverviewMetrics();
}

// ============================================================
// USER DROPDOWN
// ============================================================

const dropdownBtn = document.getElementById('user-dropdown-btn');
const dropdown    = document.getElementById('user-dropdown');

dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== dropdownBtn) {
        dropdown.classList.add('hidden');
    }
});

document.getElementById('dd-profile').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    openProfileOverlay();
});

document.getElementById('dd-appointments').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    activatePage(2);
    initSchedulePage();
});

document.getElementById('dd-settings-link').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    openSettingsModal();
});

document.getElementById('dd-help').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    openHelpOverlay();
});

document.getElementById('dd-logout').addEventListener('click', async () => {
    dropdown.classList.add('hidden');
    await TechCareAuth.logout();
    showLogin();
    showToast('You have been signed out.');
});

// ============================================================
// SETTINGS MODAL
// ============================================================

const settingsBtn      = document.getElementById('settings-btn');
const settingsModal    = document.getElementById('settings-modal');
const settingsClose    = document.getElementById('settings-close');
const settingsNavItems = document.querySelectorAll('.settings-nav-item');
const settingsTabs     = document.querySelectorAll('.settings-tab');

function openSettingsModal() { settingsModal.classList.remove('hidden'); }
settingsBtn.addEventListener('click', openSettingsModal);
settingsClose.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

settingsNavItems.forEach(item => {
    item.addEventListener('click', () => {
        settingsNavItems.forEach(i => i.classList.remove('active'));
        settingsTabs.forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(item.dataset.tab).classList.add('active');
    });
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const profile = await TechCareDB.getProfile() || {};
    profile.name      = document.getElementById('settings-name').value;
    profile.specialty = document.getElementById('settings-specialty').value;
    profile.email     = document.getElementById('settings-email').value;
    profile.phone     = document.getElementById('settings-phone').value;
    await TechCareDB.saveProfile(profile);
    applyProfileToUI(profile);
    showToast('Profile saved successfully!');
});

document.getElementById('theme-select').addEventListener('change', (e) => {
    if (e.target.value === 'dark') { showToast('Dark mode coming soon!'); e.target.value = 'light'; }
});

// ============================================================
// PROFILE OVERLAY
// ============================================================

const profileOverlay = document.getElementById('profile-overlay');

async function openProfileOverlay() {
    profileOverlay.classList.remove('hidden');
    profileOverlay.style.display = 'flex';
    refreshIcons();
    const profile = await TechCareDB.getProfile();
    if (!profile) return;

    // Hero
    document.getElementById('profile-hero-name').textContent      = profile.name;
    document.getElementById('profile-hero-specialty').textContent  = profile.specialty;
    document.getElementById('profile-hero-email').innerHTML        =
        `<i data-lucide="mail" style="width:13px;height:13px;vertical-align:middle;"></i> ${profile.email}`;
    document.getElementById('profile-avatar').src                  = profile.photo;

    // Form
    document.getElementById('p-name').value      = profile.name       || '';
    document.getElementById('p-specialty').value = profile.specialty  || '';
    document.getElementById('p-email').value     = profile.email      || '';
    document.getElementById('p-phone').value     = profile.phone      || '';
    document.getElementById('p-bio').value       = profile.bio        || '';
    document.getElementById('p-address').value   = profile.address    || '';
    const deptSel = document.getElementById('p-dept');
    if (profile.department) {
        [...deptSel.options].forEach(o => { o.selected = o.text === profile.department; });
    }

    // Session info
    const session = await TechCareAuth.getSession();
    if (session) {
        document.getElementById('sec-session-email').textContent = session.email;
        const d = new Date(session.loginTime);
        document.getElementById('sec-session-time').textContent  =
            d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // Activity feed
    const apptAll = await TechCareDB.getAllAppointments();
    const activityList = document.getElementById('profile-activity-list');
    activityList.innerHTML = '';
    const recentAppts = apptAll.slice(-5).reverse();
    if (recentAppts.length === 0) {
        activityList.innerHTML = '<p class="secondary-text">No recent activity.</p>';
    } else {
        recentAppts.forEach(a => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `<div class="activity-dot dot-teal"></div>
                <div class="activity-text">
                    <p class="activity-main">Appointment booked — <strong>${a.patient}</strong></p>
                    <p class="activity-time">${a.dateKey} at ${a.time} ${a.ampm}</p>
                </div>`;
            activityList.appendChild(item);
        });
    }

    refreshIcons();
}

document.getElementById('profile-back').addEventListener('click', () => {
    profileOverlay.classList.add('hidden');
    profileOverlay.style.display = 'none';
});

// Profile tabs
document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.profile-tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('ptab-' + btn.dataset.ptab).classList.add('active');
    });
});

// Save profile (full form)
document.getElementById('save-profile-full-btn').addEventListener('click', async () => {
    const profile = await TechCareDB.getProfile() || {};
    profile.name       = document.getElementById('p-name').value;
    profile.specialty  = document.getElementById('p-specialty').value;
    profile.email      = document.getElementById('p-email').value;
    profile.phone      = document.getElementById('p-phone').value;
    profile.bio        = document.getElementById('p-bio').value;
    profile.address    = document.getElementById('p-address').value;
    profile.department = document.getElementById('p-dept').value;
    await TechCareDB.saveProfile(profile);
    applyProfileToUI(profile);
    // Sync settings modal inputs too
    document.getElementById('settings-name').value      = profile.name;
    document.getElementById('settings-specialty').value = profile.specialty;
    document.getElementById('settings-email').value     = profile.email;
    document.getElementById('settings-phone').value     = profile.phone;
    // Update hero
    document.getElementById('profile-hero-name').textContent     = profile.name;
    document.getElementById('profile-hero-specialty').textContent = profile.specialty;
    showToast('Profile updated successfully!');
});

// Change password
document.getElementById('change-pw-btn').addEventListener('click', async () => {
    const cur  = document.getElementById('sec-current-pw').value;
    const nw   = document.getElementById('sec-new-pw').value;
    const conf = document.getElementById('sec-confirm-pw').value;
    if (!cur || !nw || !conf) { showToast('Please fill in all password fields.'); return; }
    if (nw !== conf)          { showToast('New passwords do not match.'); return; }
    if (nw.length < 8)        { showToast('Password must be at least 8 characters.'); return; }
    try {
        await TechCareAuth.changePassword(cur, nw);
        document.getElementById('sec-current-pw').value = '';
        document.getElementById('sec-new-pw').value     = '';
        document.getElementById('sec-confirm-pw').value = '';
        showToast('Password updated successfully!');
    } catch (err) {
        showToast(err.message);
    }
});

document.getElementById('sec-logout-all').addEventListener('click', async () => {
    await TechCareAuth.logout();
    profileOverlay.classList.add('hidden');
    profileOverlay.style.display = 'none';
    showLogin();
    showToast('Signed out of all devices.');
});

// ============================================================
// HELP & SUPPORT OVERLAY
// ============================================================

const helpOverlay = document.getElementById('help-overlay');

const FAQ_DATA = [
    { q: 'How do I add a new appointment?', a: 'Navigate to the Schedule tab and click the "+ New" button. Fill in the patient\'s name, date, time, and appointment type, then click "Book Appointment". The appointment will appear in the day view immediately.' },
    { q: 'Can I message patients directly?', a: 'Yes! Navigate to the Messages tab to see all patient conversations. Click on a patient name to open the chat window. Type your message and press Send or hit Enter.' },
    { q: 'How do I export transaction records?', a: 'Go to the Transactions tab and click the "Export" button in the top-right of the table. You can also filter by status (Paid, Pending, Refunded) before exporting.' },
    { q: 'How do I update my profile information?', a: 'Click the three-dot menu (⋮) in the top-right of the navbar, select "My Profile", then edit your details in the Personal Info tab and click "Save Changes".' },
    { q: 'Is my patient data secure?', a: 'Yes. TechCare uses industry-standard AES-256 encryption and is fully HIPAA compliant. All patient data is stored locally in IndexedDB and never transmitted to third parties without explicit consent.' },
    { q: 'How do I change my password?', a: 'Go to My Profile → Security tab. Enter your current password, then your new password twice, and click "Update Password".' },
    { q: 'How do I view a patient\'s full medical history?', a: 'Click on a patient\'s name in the Patients tab to load their profile. You\'ll see their diagnostics history, blood pressure chart, lab results, and diagnostic list.' },
    { q: 'Can I cancel or delete an appointment?', a: 'Yes. In the Schedule tab, click on any appointment entry. A delete option will appear. Only appointments you created through the system can be deleted.' },
    { q: 'What browsers are supported?', a: 'TechCare works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser up to date for the best experience.' },
    { q: 'How do I contact technical support?', a: 'Use the contact form on this Help & Support page, or email support@techcare.io. Our team responds within 2 business hours.' },
];

function openHelpOverlay() {
    helpOverlay.classList.remove('hidden');
    helpOverlay.style.display = 'flex';
    renderFAQ(FAQ_DATA);
    refreshIcons();
}

document.getElementById('help-back').addEventListener('click', () => {
    helpOverlay.classList.add('hidden');
    helpOverlay.style.display = 'none';
});

function renderFAQ(faqs) {
    const list = document.getElementById('faq-list');
    list.innerHTML = '';
    faqs.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'faq-item';
        el.innerHTML = `
            <button class="faq-q" data-i="${i}">
                <span>${item.q}</span>
                <i data-lucide="chevron-down" class="faq-chevron"></i>
            </button>
            <div class="faq-a" id="faq-a-${i}">${item.a}</div>`;
        list.appendChild(el);
    });
    refreshIcons();

    // Accordion toggle
    list.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx    = btn.dataset.i;
            const answer = document.getElementById('faq-a-' + idx);
            const isOpen = answer.classList.contains('open');
            list.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
            list.querySelectorAll('.faq-chevron').forEach(c => c.classList.remove('rotated'));
            if (!isOpen) {
                answer.classList.add('open');
                btn.querySelector('.faq-chevron').classList.add('rotated');
            }
        });
    });
}

// FAQ search
document.getElementById('help-search-input').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = FAQ_DATA.filter(f =>
        f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
    renderFAQ(filtered);
});

// Help submit
document.getElementById('help-submit-btn').addEventListener('click', () => {
    const subject = document.getElementById('help-subject').value.trim();
    const msg     = document.getElementById('help-message').value.trim();
    if (!subject || !msg) { showToast('Please fill in the subject and message.'); return; }
    document.getElementById('help-subject').value  = '';
    document.getElementById('help-message').value  = '';
    showToast('Support request submitted! We\'ll respond within 2 business hours.');
});

// Quick link cards
document.querySelectorAll('.help-quick-card').forEach((card, i) => {
    card.addEventListener('click', () => {
        const topics = ['appointment', 'message', 'transaction', 'privacy'];
        const filtered = FAQ_DATA.filter(f => f.q.toLowerCase().includes(topics[i]) || f.a.toLowerCase().includes(topics[i]));
        renderFAQ(filtered.length ? filtered : FAQ_DATA);
        document.querySelector('.help-section').scrollIntoView({ behavior: 'smooth' });
    });
});

// ============================================================
// PATIENTS PAGE
// ============================================================

function removeChartContainer() {
    const el = document.querySelector('#chart');
    if (el) el.parentNode.removeChild(el);
}

const getSelectedPatientData = (data, name) => data.find(p => p.name === name);

const chartRender = (patient, updateSelectedData) => {
    const chartDataX     = patient.diagnosis_history.map(item => `${item.month.slice(0, 3)}, ${item.year}`);
    const neededChartData = chartDataX.slice(0, 6);
    const labels          = [60, 80, 100, 120, 140, 160, 180];
    const diagData        = patient.diagnosis_history;
    const systolicData    = diagData.map(d => d?.blood_pressure?.systolic?.value).splice(-6);
    const diastolicData   = diagData.map(d => d?.blood_pressure?.diastolic?.value).splice(-6);

    const options = {
        chart: {
            type: 'line', height: '200px', width: '100%',
            toolbar: { show: false },
            events: { dataPointSelection: (_e, _c, cfg) => updateSelectedData(cfg.dataPointIndex) },
            zoom: { enabled: true }
        },
        tooltip: { intersect: true, shared: false },
        series: [
            { name: 'Systolic',  data: systolicData,  color: '#E66FD2' },
            { name: 'Diastolic', data: diastolicData, color: '#8C6FE6' }
        ],
        xaxis: { categories: neededChartData, labels: { style: { fontSize: '8px' } } },
        yaxis: {
            min: Math.min(...labels), max: Math.max(...labels),
            tickAmount: labels.length - 1,
            labels: { formatter: v => labels.reduce((p, c) => Math.abs(c - v) < Math.abs(p - v) ? c : p) }
        },
        stroke:  { curve: 'smooth', width: 2 },
        markers: { size: 5 },
        legend:  { show: false }
    };

    removeChartContainer();
    const wrap = document.getElementById('chart-wrap');
    const div  = document.createElement('div');
    div.id = 'chart';
    wrap.appendChild(div);
    new ApexCharts(div, options).render();
};

const updatePageWithPatientData = (patient) => {
    const diagData = patient.diagnosis_history;

    const updateSelectedData = (index) => {
        document.getElementById('systolic-num').textContent         = diagData[index]?.blood_pressure?.systolic?.value;
        document.getElementById('diastolic-num').textContent        = diagData[index]?.blood_pressure?.diastolic?.value;
        document.getElementById('average-text-systolic').textContent = diagData[index]?.blood_pressure?.systolic?.levels;
        document.getElementById('average-text-diastolic').textContent= diagData[index]?.blood_pressure?.diastolic?.levels;
        document.getElementById('resp-value').textContent           = diagData[index]?.respiratory_rate?.value;
        document.getElementById('resp-average').textContent         = diagData[index]?.respiratory_rate?.levels;
        document.getElementById('temp-value').textContent           = diagData[index]?.temperature?.value;
        document.getElementById('temp-average').textContent         = diagData[index]?.temperature?.levels;
        document.getElementById('heart-value').textContent          = diagData[index]?.heart_rate?.value;
        document.getElementById('heart-average').textContent        = diagData[index]?.heart_rate?.levels;
    };

    if (diagData.length > 0) updateSelectedData(0);

    const dList = document.getElementById('diagnosic-list');
    dList.innerHTML = '';
    patient.diagnostic_list.forEach(item => {
        const tr = document.createElement('tr');
        ['name', 'description', 'status'].forEach(k => {
            const td = document.createElement('td');
            td.textContent = item[k];
            tr.appendChild(td);
        });
        dList.appendChild(tr);
    });

    document.getElementById('user-img').src               = patient.profile_picture;
    document.getElementById('name').textContent            = patient.name;
    document.getElementById('dob').textContent             = patient.date_of_birth;
    document.getElementById('gender').textContent          = patient.gender;
    document.getElementById('contact-info').textContent    = patient.phone_number;
    document.getElementById('emergency-contacts').textContent = patient.emergency_contact;
    document.getElementById('insurance-provider').textContent = patient.insurance_type;

    const results = document.getElementById('results');
    results.innerHTML = '';
    patient.lab_results.forEach(item => {
        const div  = document.createElement('div');
        div.className = 'result';
        const p   = document.createElement('p');
        p.textContent = item;
        const img = document.createElement('img');
        img.src = './assets/images/download_FILL0_wght300_GRAD0_opsz24 (1).svg';
        img.style.width = '14px';
        div.appendChild(p);
        div.appendChild(img);
        results.appendChild(div);
    });

    chartRender(patient, updateSelectedData);
};

document.addEventListener('DOMContentLoaded', async () => {
    fetchData(); // Pre-load in background
    await bootApp();
});

const displayData = async () => {
    const patientList = document.getElementById('patient-list');
    patientList.innerHTML = '';
    const data = await fetchData();
    if (!data) return;

    data.forEach(item => {
        const li  = document.createElement('li');
        li.className = 'list-item';
        if (item.name === 'Jessica Taylor') {
            li.style.backgroundColor = 'var(--active2)';
        }
        const wrap = document.createElement('div');
        wrap.className = 'li-wrap';
        const img  = document.createElement('img');
        img.className = 'li-img';
        img.src = item.profile_picture;
        const nameDiv = document.createElement('div');
        nameDiv.className = 'li-name';
        const p1 = document.createElement('p');
        p1.textContent = item.name;
        p1.className = 'primary-text';
        const p2 = document.createElement('p');
        p2.textContent = `${item.gender}, ${item.age}`;
        nameDiv.appendChild(p1);
        nameDiv.appendChild(p2);
        wrap.appendChild(img);
        wrap.appendChild(nameDiv);
        li.appendChild(wrap);
        li.addEventListener('click', () => {
            patientList.querySelectorAll('.list-item').forEach(x => x.style.backgroundColor = 'transparent');
            li.style.backgroundColor = 'var(--active2)';
            handlePatientClick(item.name, data);
        });
        patientList.appendChild(li);
    });

    // Populate appointment datalist
    const dl = document.getElementById('appt-patient-list');
    if (dl) {
        dl.innerHTML = '';
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            dl.appendChild(opt);
        });
    }
};

const handlePatientClick = (name, data) => {
    const p = data.find(x => x.name === name);
    if (p) updatePageWithPatientData(p);
};

// ============================================================
// SCHEDULE PAGE
// ============================================================

let calCurrentDate = new Date(2026, 9, 2);
let scheduleInitialized = false;

const APPT_TYPE_COLORS = {
    'Check-up':    '#01F0D0',
    'Follow-up':   '#8C6FE6',
    'Lab Review':  '#E66FD2',
    'Consultation':'#FFB347',
    'New Patient': '#6FA8E6',
};

// Seeded hard-coded appointments (baseline)
const baseAppointmentsData = {
    '2026-10-02': [
        { time: '09:00', ampm: 'AM', patient: 'Emily Clarke',     type: 'Check-up',    color: '#01F0D0' },
        { time: '10:30', ampm: 'AM', patient: 'Nathan Evens',     type: 'Follow-up',   color: '#8C6FE6' },
        { time: '12:00', ampm: 'PM', patient: 'Samantha Johnson', type: 'Lab Review',  color: '#E66FD2' },
        { time: '02:00', ampm: 'PM', patient: 'Kevin Anderson',   type: 'Consultation',color: '#FFB347' },
        { time: '03:30', ampm: 'PM', patient: 'Olivia Brown',     type: 'New Patient', color: '#6FA8E6' },
    ],
    '2026-10-05': [
        { time: '10:00', ampm: 'AM', patient: 'Tyler Davis',      type: 'Check-up',    color: '#01F0D0' },
        { time: '01:00', ampm: 'PM', patient: 'Dylan Thompson',   type: 'Follow-up',   color: '#8C6FE6' },
    ],
    '2026-10-09': [
        { time: '09:00', ampm: 'AM', patient: 'Mike Nolan',       type: 'Lab Review',  color: '#E66FD2' },
    ],
    '2026-10-14': [
        { time: '11:00', ampm: 'AM', patient: 'John Martinez',    type: 'Consultation',color: '#FFB347' },
        { time: '03:00', ampm: 'PM', patient: 'Richard Brown',    type: 'New Patient', color: '#6FA8E6' },
    ],
};

function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatDateLabel(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderCalendar(date) {
    const monthLabel = document.getElementById('cal-month-label');
    if (!monthLabel) return;
    monthLabel.textContent =
        date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const calEl = document.getElementById('mini-calendar');
    if (!calEl) return;
    calEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-day-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    const firstDay   = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const today       = new Date(2026, 9, 2);

    for (let i = 0; i < firstDay; i++) {
        const b = document.createElement('div');
        b.className = 'cal-day other-month';
        grid.appendChild(b);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const thisDate = new Date(date.getFullYear(), date.getMonth(), d);
        const key = dateKey(thisDate);
        const el  = document.createElement('div');
        el.className  = 'cal-day';
        el.textContent = d;
        if (thisDate.toDateString() === today.toDateString()) el.classList.add('today');
        if (key === dateKey(calCurrentDate))  el.classList.add('selected');
        if (baseAppointmentsData[key])        el.classList.add('has-appt');
        el.addEventListener('click', () => {
            calCurrentDate = thisDate;
            renderCalendar(date);
            renderAppointments(thisDate);
        });
        grid.appendChild(el);
    }

    calEl.appendChild(grid);
}

async function renderAppointments(date) {
    const list  = document.getElementById('appt-list');
    const label = document.getElementById('sched-selected-date');
    if (!list || !label) return;
    label.textContent = formatDateLabel(date);
    list.innerHTML = '';

    const key = dateKey(date);
    const base = baseAppointmentsData[key] || [];
    const dbAppts = await TechCareDB.getAppointmentsByDate(key);

    // Mark DB appointments with a delete button
    const allAppts = [
        ...base.map(a => ({ ...a, fromDB: false })),
        ...dbAppts.map(a => ({ ...a, fromDB: true }))
    ];

    if (allAppts.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;color:#aaa;padding:40px 0;font-size:13px;';
        empty.textContent = 'No appointments scheduled for this day.';
        list.appendChild(empty);
        return;
    }

    // Sort by time
    allAppts.sort((a, b) => a.time.localeCompare(b.time));

    allAppts.forEach(appt => {
        const item = document.createElement('div');
        item.className = 'appt-item';
        item.innerHTML = `
            <div class="appt-time">
                <p class="appt-time-main">${appt.time}</p>
                <p class="appt-time-ampm">${appt.ampm}</p>
            </div>
            <div class="appt-color-bar" style="background:${appt.color || '#01F0D0'}"></div>
            <div class="appt-details">
                <p class="appt-patient">${appt.patient}</p>
                <p class="appt-type">${appt.type}${appt.notes ? ' — ' + appt.notes : ''}</p>
            </div>
            ${appt.fromDB ? `<button class="appt-delete-btn" data-id="${appt.id}" title="Delete"><i data-lucide="trash-2"></i></button>` : ''}
        `;
        if (appt.fromDB) {
            item.querySelector('.appt-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await TechCareDB.deleteAppointment(appt.id);
                renderAppointments(date);
                await updateOverviewMetrics();
                showToast('Appointment deleted.');
            });
        }
        list.appendChild(item);
    });
    refreshIcons();
}

// New Appointment Modal
const newApptModal  = document.getElementById('new-appt-modal');
const newApptClose  = document.getElementById('new-appt-close');
const saveApptBtn   = document.getElementById('save-appt-btn');

function openNewApptModal() {
    // Pre-fill date with currently viewed date
    const dateInput = document.getElementById('appt-date');
    dateInput.value = dateKey(calCurrentDate);
    document.getElementById('appt-time').value    = '09:00';
    document.getElementById('appt-patient').value = '';
    document.getElementById('appt-notes').value   = '';
    newApptModal.classList.remove('hidden');
}

newApptClose.addEventListener('click', () => newApptModal.classList.add('hidden'));
newApptModal.addEventListener('click', (e) => { if (e.target === newApptModal) newApptModal.classList.add('hidden'); });

saveApptBtn.addEventListener('click', async () => {
    const patient  = document.getElementById('appt-patient').value.trim();
    const dateStr  = document.getElementById('appt-date').value;
    const timeStr  = document.getElementById('appt-time').value;
    const type     = document.getElementById('appt-type').value;
    const notes    = document.getElementById('appt-notes').value.trim();

    if (!patient || !dateStr || !timeStr) { showToast('Please fill in patient, date, and time.'); return; }

    // Parse time
    const [hh, mm] = timeStr.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12  = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    const timeDisplay = `${String(h12).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;

    await TechCareDB.addAppointment({
        dateKey: dateStr,
        time:    timeDisplay,
        ampm,
        patient,
        type,
        color:   APPT_TYPE_COLORS[type] || '#01F0D0',
        notes,
    });

    newApptModal.classList.add('hidden');

    // Update calendar selected date and re-render if schedule page active
    const [y, mo, d] = dateStr.split('-').map(Number);
    calCurrentDate = new Date(y, mo - 1, d);
    if (document.getElementById('cal-month-label')) {
        renderCalendar(calCurrentDate);
        renderAppointments(calCurrentDate);
    }
    await updateOverviewMetrics();
    showToast(`Appointment booked for ${patient}!`);
});

function initSchedulePage() {
    if (scheduleInitialized) { renderCalendar(calCurrentDate); renderAppointments(calCurrentDate); return; }
    scheduleInitialized = true;

    renderCalendar(calCurrentDate);
    renderAppointments(calCurrentDate);

    document.getElementById('cal-prev').addEventListener('click', () => {
        calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() - 1, 1);
        renderCalendar(calCurrentDate);
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() + 1, 1);
        renderCalendar(calCurrentDate);
    });
    document.getElementById('add-appt-btn').addEventListener('click', openNewApptModal);
}

// ============================================================
// MESSAGE PAGE
// ============================================================

let msgInitialized = false;
let allPatients    = [];
let activeContact  = null;

// Initial intro message ONLY for the first patient in the list
const FIRST_PATIENT_INTRO = [
    { from: 'patient', text: 'Hello Dr. Simmons, I have a question about my medication.' },
    { from: 'doctor',  text: 'Of course! What would you like to know?' },
    { from: 'patient', text: 'Is it okay to take my blood pressure pill with food?' },
    { from: 'doctor',  text: 'Yes, you can take it with or without food. Just make sure you take it at the same time each day.' },
];

async function loadMessages(patientName) {
    let msgs = await TechCareDB.getMessages(patientName);
    const isFirstPatient = allPatients.length > 0 && allPatients[0].name === patientName;

    // Only seed intro conversation for the very first patient
    if (msgs.length === 0 && isFirstPatient) {
        const now = new Date();
        for (const m of FIRST_PATIENT_INTRO) {
            await TechCareDB.addMessage({
                patientName,
                from: m.from,
                text: m.text,
                timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            });
        }
        msgs = await TechCareDB.getMessages(patientName);
    }
    return msgs;
}

function updateContactPreview(patientName, text) {
    const safeId = 'msg-prev-' + patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const el = document.getElementById(safeId);
    if (el) el.textContent = text;
}

async function renderContacts(patients) {
    const list = document.getElementById('msg-contact-list');
    list.innerHTML = '';
    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        const msgs = await TechCareDB.getMessages(p.name);
        let preview = 'No messages yet';
        if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            preview = (last.from === 'doctor' ? 'You: ' : '') + last.text;
        } else if (i === 0) {
            preview = 'Yes, you can take it with or without…';
        }

        const safeId = 'msg-prev-' + p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const li = document.createElement('li');
        li.className = 'list-item msg-list-item';
        li.innerHTML = `
            <div class="msg-list-row">
                <img class="li-img" src="${p.profile_picture}" alt="${p.name}" style="border-radius:50%;object-fit:cover;">
                <div class="msg-list-text">
                    <p class="msg-list-name">${p.name}</p>
                    <p class="msg-list-preview" id="${safeId}">${preview}</p>
                </div>
            </div>`;
        li.addEventListener('click', async () => {
            document.querySelectorAll('.msg-list-item').forEach(it => it.style.backgroundColor = 'transparent');
            li.style.backgroundColor = 'var(--active2)';
            await openConversation(p);
        });
        list.appendChild(li);
    }
}

async function openConversation(patient) {
    activeContact = patient;

    document.getElementById('msg-chat-avatar').src         = patient.profile_picture;
    document.getElementById('msg-chat-name').textContent   = patient.name;
    document.getElementById('msg-chat-status').textContent = `${patient.gender}, ${patient.age} • ${patient.insurance_type || ''}`;

    document.getElementById('msg-info-avatar').src        = patient.profile_picture;
    document.getElementById('msg-info-name').textContent  = patient.name;
    document.getElementById('msg-info-role').textContent  = `${patient.gender}, ${patient.age}`;
    document.getElementById('msg-info-dob').textContent   = patient.date_of_birth || '—';
    document.getElementById('msg-info-phone').textContent = patient.phone_number  || '—';
    document.getElementById('msg-info-insurance').textContent = patient.insurance_type || '—';

    const emptyState = document.getElementById('msg-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    await renderChatMessages(patient.name);
}

async function renderChatMessages(patientName) {
    const chatBody = document.getElementById('msg-chat-body');
    chatBody.innerHTML = '';
    const msgs = await loadMessages(patientName);

    if (msgs.length === 0) {
        chatBody.innerHTML = `
            <div class="msg-empty-chat" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#888;text-align:center;padding:40px 20px;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(1,240,208,0.12);display:flex;align-items:center;justify-content:center;margin-bottom:12px;color:var(--accent,#01F0D0);">
                    <i data-lucide="message-square" style="width:22px;height:22px;"></i>
                </div>
                <p style="font-weight:600;color:#333;margin-bottom:4px;font-size:14px;">No messages yet</p>
                <p style="font-size:12px;color:#777;max-width:280px;line-height:1.5;">Send a message below to start the conversation with ${patientName}.</p>
            </div>`;
        refreshIcons();
        return;
    }

    msgs.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble ${msg.from === 'doctor' ? 'sent' : 'received'}`;
        bubble.innerHTML = `${msg.text}<div class="msg-bubble-time">${msg.timestamp}</div>`;
        chatBody.appendChild(bubble);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

function initMessagePage() {
    if (msgInitialized) return;
    msgInitialized = true;

    fetchData().then(async data => {
        if (!data) return;
        allPatients = data;
        await renderContacts(data);
        // Auto-open first contact
        if (data.length > 0) await openConversation(data[0]);
        const items = document.querySelectorAll('.msg-list-item');
        if (items[0]) items[0].style.backgroundColor = 'var(--active2)';
    });

    const sendBtn  = document.getElementById('msg-send-btn');
    const msgInput = document.getElementById('msg-input');

    const sendMessage = async () => {
        const text = msgInput.value.trim();
        if (!text || !activeContact) return;
        const now = new Date();
        const ts  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        await TechCareDB.addMessage({ patientName: activeContact.name, from: 'doctor', text, timestamp: ts });
        msgInput.value = '';
        await renderChatMessages(activeContact.name);
        updateContactPreview(activeContact.name, `You: ${text}`);
        updateOverviewMetrics();

        const currentContactName = activeContact.name;
        // Simulated patient reply after 1.2s
        setTimeout(async () => {
            const replies = [
                'Thank you, Doctor!', 'Got it, I\'ll follow your advice.',
                'Should I come in for a check-up?', 'I appreciate your help!',
                'I\'ll take note of that, thanks.', 'Could you clarify that a bit more?'
            ];
            const reply   = replies[Math.floor(Math.random() * replies.length)];
            const replyTs = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            await TechCareDB.addMessage({ patientName: currentContactName, from: 'patient', text: reply, timestamp: replyTs });
            if (activeContact && activeContact.name === currentContactName) {
                await renderChatMessages(activeContact.name);
            }
            updateContactPreview(currentContactName, reply);
            updateOverviewMetrics();
        }, 1200);
    };

    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    document.getElementById('msg-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderContacts(allPatients.filter(p => p.name.toLowerCase().includes(q)));
    });
}

// ============================================================
// TRANSACTION PAGE
// ============================================================

let txnInitialized = false;

const txnData = [
    { id: 'INV-001', patient: 'Nathan Evens',      service: 'General Consultation',    date: 'Oct 2, 2026',  amount: '$150.00', status: 'paid'     },
    { id: 'INV-002', patient: 'Samantha Johnson',  service: 'Lab Test (CBC)',           date: 'Oct 2, 2026',  amount: '$85.00',  status: 'paid'     },
    { id: 'INV-003', patient: 'Tyler Davis',        service: 'X-Ray Imaging',           date: 'Oct 1, 2026',  amount: '$320.00', status: 'pending'  },
    { id: 'INV-004', patient: 'Ashley Martinez',   service: 'Specialist Referral',      date: 'Sep 30, 2026', amount: '$200.00', status: 'paid'     },
    { id: 'INV-005', patient: 'Kevin Anderson',    service: 'Cardiac Consultation',     date: 'Sep 29, 2026', amount: '$450.00', status: 'pending'  },
    { id: 'INV-006', patient: 'Olivia Brown',       service: 'Annual Check-up',         date: 'Sep 28, 2026', amount: '$175.00', status: 'paid'     },
    { id: 'INV-007', patient: 'Dylan Thompson',    service: 'MRI Scan',                 date: 'Sep 27, 2026', amount: '$900.00', status: 'refunded' },
    { id: 'INV-008', patient: 'Mike Nolan',         service: 'Blood Pressure Follow-up', date: 'Sep 26, 2026', amount: '$100.00', status: 'paid'    },
    { id: 'INV-009', patient: 'John Martinez',     service: 'Diabetes Management',      date: 'Sep 25, 2026', amount: '$220.00', status: 'pending'  },
    { id: 'INV-010', patient: 'Richard Brown',      service: 'General Consultation',    date: 'Sep 24, 2026', amount: '$150.00', status: 'paid'     },
];

function renderTransactions(filter = 'all') {
    const tbody   = document.getElementById('txn-table-body');
    tbody.innerHTML = '';
    const filtered = filter === 'all' ? txnData : txnData.filter(t => t.status === filter);
    filtered.forEach(txn => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${txn.id}</strong></td>
            <td>${txn.patient}</td>
            <td>${txn.service}</td>
            <td>${txn.date}</td>
            <td><strong>${txn.amount}</strong></td>
            <td><span class="txn-status ${txn.status}">${txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}</span></td>`;
        tbody.appendChild(tr);
    });
}

function initTransactionPage() {
    if (txnInitialized) return;
    txnInitialized = true;
    renderTransactions();
    document.getElementById('txn-status-filter').addEventListener('change', (e) => renderTransactions(e.target.value));
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, addDoc, where, query, serverTimestamp, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const firebaseConfig = {
    apiKey: "AIzaSyDPeTE4bGq50uubVqpdOp0pFrc1MvWVm7I",
    authDomain: "shelf-sense-19378.firebaseapp.com",
    projectId: "shelf-sense-19378",
    storageBucket: "shelf-sense-19378.firebasestorage.app",
    messagingSenderId: "49869656974",
    appId: "1:49869656974:web:3e17e211c6d19d7b6e8adf",
    measurementId: "G-KSNEW0MWHW"
};

// --- API KEY ---
const GEMINI_API_KEY = "AIzaSyCTPGu-0WfiQ6fZfuNP49lhOqK5MoDGhpE";

const EMAILJS_SERVICE_ID = "service_dlor7u4"; 
const EMAILJS_TEMPLATE_ID = "template_ef517pa";
const EMAILJS_PUBLIC_KEY = "dfZPLyZIN3m6VKvuZ"; 

// --- INITIALIZE APP ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- INITIALIZE AI ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// --- REALTIME LISTENER VARIABLES ---
let unsubscribeIssueListener = null;
let unsubscribeInventoryListener = null;
let unsubscribeStudentBooksListener = null;

// ==========================================
// --- NOTIFICATION & UI HELPERS ---
// ==========================================

window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const bellContainer = document.querySelector('.notification-icon').parentElement; 
    if (!dropdown.classList.contains('hidden')) {
        if (!bellContainer.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    }
});

const UI = {
    dialogResolve: null,
    showDialog: (type, message, placeholder = "") => {
        return new Promise((resolve) => {
            UI.dialogResolve = resolve;
            const overlay = document.getElementById('custom-dialog-overlay');
            const title = document.getElementById('dialog-title');
            const msg = document.getElementById('dialog-message');
            const inputContainer = document.getElementById('dialog-input-container');
            const input = document.getElementById('dialog-input');
            const btnConfirm = document.getElementById('dialog-btn-confirm');
            const btnCancel = document.getElementById('dialog-btn-cancel');
            const iconBg = document.getElementById('dialog-icon-bg');
            const icon = document.getElementById('dialog-icon');

            inputContainer.classList.add('hidden');
            btnCancel.classList.add('hidden');
            input.value = "";
            btnConfirm.onclick = () => UI.closeDialog(true);
            btnCancel.onclick = () => UI.closeDialog(false);

            // --- FIXED: Use innerHTML to render bold tags and line breaks ---
            msg.innerHTML = message; 

            overlay.classList.remove('hidden');

            if (type === 'alert') {
                title.innerText = "Notification";
                icon.className = "fas fa-info";
                icon.style.color = "var(--primary)";
                iconBg.style.background = "#eef2ff";
            } else if (type === 'confirm') {
                title.innerText = "Confirmation";
                icon.className = "fas fa-question";
                icon.style.color = "#f97316"; 
                iconBg.style.background = "#fff7ed";
                btnCancel.classList.remove('hidden');
            } else if (type === 'prompt') {
                title.innerText = "Input Required";
                icon.className = "fas fa-keyboard";
                icon.style.color = "#10b981";
                iconBg.style.background = "#f0fdf4";
                inputContainer.classList.remove('hidden');
                input.placeholder = placeholder;
                btnCancel.classList.remove('hidden');
                input.focus();
                input.onkeyup = (e) => { if(e.key === 'Enter') UI.closeDialog(input.value); };
                btnConfirm.onclick = () => UI.closeDialog(input.value);
            }
        });
    },
    closeDialog: (result) => {
        document.getElementById('custom-dialog-overlay').classList.add('hidden');
        if (UI.dialogResolve) UI.dialogResolve(result);
    },
    alert: async (msg) => await UI.showDialog('alert', msg),
    confirm: async (msg) => await UI.showDialog('confirm', msg),
    prompt: async (msg, ph) => await UI.showDialog('prompt', msg, ph)
};

window.CustomAlert = UI.alert;
window.CustomConfirm = UI.confirm;
window.CustomPrompt = UI.prompt;

const organizationDomain = "@iiitmanipur.ac.in";
const DEMO_ADMIN_EMAIL = "libraryadmin@iiitmanipur.ac.in";

let isAdminMode = false;
let generatedOtp = null;
let currentEmail = "";
let seatUnsubscribe = null; 
let notifUnsubscribe = null;
let currentBookId = null; 
let selectedSeatID = null;
let selectedBook = null;
let selectedRequest = null;
let currentDocId = null;
let bookingTimer = null;
let html5QrcodeScanner = null;

// Handle Auth State Changes
onAuthStateChanged(auth, (user) => { 
    if(user){ 
        if(user.isAnonymous) {
            const storedEmail = localStorage.getItem('studentEmail');
            if(storedEmail) {
                currentEmail = storedEmail;
                isAdminMode = false; 
                showDashboard();
            }
        } else {
            currentEmail = user.email;
            // Added your email to the admin check here
            if(currentEmail === "tanmayjasu424@gmail.com" || currentEmail === DEMO_ADMIN_EMAIL || currentEmail === "skjha3439@gmail.com"){
                isAdminMode = true;
            }
            showDashboard();
        }
    }
});

function toggleAuthMode(e){
    if(e) e.preventDefault();
    isAdminMode=!isAdminMode;
    const p=document.getElementById('right-panel');
    const t=document.getElementById('form-title');
    const b=document.getElementById('action-btn');
    const l=document.getElementById('toggle-auth-btn');
    const g=document.getElementById('admin-password-group');
    const i=document.getElementById('emailInput');
    
    if(isAdminMode){
        p.classList.add('admin-mode');
        t.innerText="Admin Portal"; b.innerText="Login"; l.innerText="← Back";
        g.classList.remove('hidden'); i.placeholder=DEMO_ADMIN_EMAIL;
    } else {
        p.classList.remove('admin-mode');
        t.innerText="Student Sign in"; b.innerText="Send OTP"; l.innerText="Login as Admin";
        g.classList.add('hidden'); i.placeholder="name@iiitmanipur.ac.in";
    }
}

async function handleLoginSubmit(e){
    if(e) e.preventDefault();
    const m = document.getElementById('emailInput').value.trim().toLowerCase();
    const r = document.getElementById('error-msg');
    const b = document.getElementById('action-btn');
    r.innerText = "";

    
    // --- ADMIN LOGIC ---
    if(isAdminMode){
        const p = document.getElementById('adminPasswordInput').value;
        
        // --- MANUAL ADMIN OVERRIDE FOR SHIVAM ---
        if (m === "skjha3439@gmail.com" && p === "shivy123") {
            currentEmail = m;
            isAdminMode = true;
            b.innerText = "Login";
            showDashboard();
            return;
        }

        try {
            b.innerText = "Verifying...";
            await signInWithEmailAndPassword(auth, m, p);
            // onAuthStateChanged will handle redirection on success
        } catch(err){ 
            console.error(err);
            b.innerText = "Login"; 
            r.innerText = "Invalid Admin Credentials."; 
        }
        return;
    }

    // --- STUDENT LOGIC ---
    if(m === "a@iiitmanipur.ac.in"){
        generatedOtp = Math.floor(100000+Math.random()*900000).toString();
        currentEmail = m;
        await UI.alert(`DEV MODE OTP: ${generatedOtp}`);
        showOtpScreen(m);
        return;
    }

    if(!m.endsWith(organizationDomain)){ 
        r.innerText=`Access restricted to ${organizationDomain}`; 
        return; 
    }
    
    b.innerText = "Checking DB..."; b.disabled = true;

    try {
        const docRef = doc(db, "students", m);
        const d = await getDoc(docRef);
        
        if (d.exists()) {
            generatedOtp = Math.floor(100000+Math.random()*900000).toString();
            currentEmail = m;
            const params = { to_email: m, otp_code: generatedOtp };
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY)
            .then(() => { 
                b.innerText = "Send OTP"; b.disabled = false; 
                showOtpScreen(m); 
            })
            .catch((err) => { 
                console.error(err);
                UI.alert(`EmailJS Error. Dev Fallback: OTP is ${generatedOtp}`); 
                showOtpScreen(m); 
                b.innerText = "Send OTP"; b.disabled = false; 
            });
        } else {
            b.innerText = "Send OTP"; b.disabled = false;
            r.innerText = "Access Denied: Student not registered.";
        }
    } catch(err){ 
        console.error(err); 
        r.innerText = "System Error."; 
        b.disabled = false; 
    }
}

function showOtpScreen(m){
    document.getElementById('otp-email-display').innerText=m;
    document.getElementById('otp-overlay').classList.remove('hidden');
    setTimeout(()=>document.getElementById('otpInput').focus(),100);
}

function verifyOtp(){
    const o = document.getElementById('otpInput').value;
    if(o === generatedOtp){
        if(currentEmail === "a@iiitmanipur.ac.in") {
            localStorage.setItem('studentEmail', currentEmail);
            showDashboard();
            return; 
        }
        signInAnonymously(auth)
        .then(() => {
            localStorage.setItem('studentEmail', currentEmail);
            showDashboard();
        })
        .catch((e) => {
            console.error(e);
            if(e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
                console.warn("Auth disabled, bypassing...");
                localStorage.setItem('studentEmail', currentEmail);
                showDashboard();
            } else {
                document.getElementById('otp-error').innerText="Auth Error: " + e.message;
            }
        });
    } else { 
        document.getElementById('otp-error').innerText="Invalid code."; 
    }
}

function closeOtp(){document.getElementById('otp-overlay').classList.add('hidden')}

function logout(){
    if(seatUnsubscribe) seatUnsubscribe(); 
    if(notifUnsubscribe) notifUnsubscribe();
    if(unsubscribeIssueListener) unsubscribeIssueListener();
    if(unsubscribeInventoryListener) unsubscribeInventoryListener();
    if(unsubscribeStudentBooksListener) unsubscribeStudentBooksListener();
    localStorage.removeItem('studentEmail'); 
    signOut(auth).then(()=>location.reload());
}

async function showDashboard() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('otp-overlay').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    try { initRealtimeSeats(); } catch(e) {}
    try { initNotificationSystem(); } catch(e) {}
    
    // AI Initialization handled by override at the end of file

    const dueSoonCard = document.querySelector('.stats-grid .dashboard-card:nth-child(2)');

    if (isAdminMode) {
        document.getElementById('dashboard-view').classList.add('admin-theme');
        document.getElementById('db-name').innerText = "Hello, Librarian";
        document.getElementById('db-role').innerText = "Admin Access";
        document.getElementById('admin-quick-search').classList.remove('hidden');
        document.getElementById('dashboard-id-card').classList.add('hidden'); 
        
        if(dueSoonCard) dueSoonCard.classList.add('hidden');

        updateSidebarMenu('admin'); 
        loadAllStudents(); 
        loadAdminInventory(); 
        updateAdminStats();
        navigate('dashboard');
    } else {
        document.getElementById('dashboard-view').classList.remove('admin-theme');
        document.getElementById('chatbot-widget').classList.remove('hidden');
        document.getElementById('dashboard-id-card').classList.remove('hidden'); 
        
        if(dueSoonCard) dueSoonCard.classList.remove('hidden');

        updateSidebarMenu('student'); 
        navigate('dashboard');
        
        checkTrafficAndSuggest(currentEmail);
        await updateStudentStats();
    }
}

async function checkTrafficAndSuggest(email) {
    if(!email) return;
    try {
        const snap = await getDocs(collection(db, "seats"));
        let occupied = 0;
        let total = 0;
        snap.forEach(doc => {
            total++;
            if(doc.data().status !== 'available') occupied++;
        });
        if (total > 0 && (occupied/total) > 0.8) {
            await notifyUser(email, "Library is currently very busy (>80% occupancy).");
        }
    } catch(e) {
        console.log("Traffic check skipped");
    }
}

async function updateStudentStats() {
    if(!currentEmail) return;
    try {
        const d = await getDoc(doc(db,"students",currentEmail));
        if (d.exists()) {
            const data = d.data();
            document.getElementById('db-name').innerText = "Hello, " + data.name;
            document.getElementById('db-role').innerText = "Roll No: " + data.roll;
            document.getElementById('db-dept').innerText = data.dept + " (" + data.sem + ")";
            
            let totalFines = 0;
            let dueSoon = 0;
            const issueSnap = await getDocs(query(collection(db, "issue_requests"), where("studentEmail", "==", currentEmail), where("status", "==", "issued")));
            
            issueSnap.forEach(doc => {
                const req = doc.data();
                if(req.issuedAt) {
                    const issueDate = req.issuedAt.toDate();
                    const dueDate = new Date(issueDate);
                    dueDate.setDate(issueDate.getDate() + 30);
                    const now = new Date();
                    const diffTime = now - dueDate;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if(diffDays > 0) totalFines += (diffDays * 50); 
                    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                    if(daysUntilDue <= 3 && daysUntilDue >= 0) dueSoon++;
                }
            });

            document.getElementById('stat-1').innerText = issueSnap.size;
            document.getElementById('stat-2').innerText = dueSoon;
            document.getElementById('stat-3').innerText = totalFines;

            const imgEl = document.getElementById('dash-profile-img');
            if (data.profilePic) imgEl.src = data.profilePic;
            else imgEl.src = `https://ui-avatars.com/api/?name=${data.name}&background=random`; 

            const qrEl = document.getElementById('dash-qr-code');
            if(qrEl) { qrEl.innerHTML = ""; new QRCode(qrEl, { text: currentEmail, width: 80, height: 80 }); }
            if(document.getElementById('dash-barcode')) { JsBarcode("#dash-barcode", data.roll, { format: "CODE128", lineColor: "#0d0c22", width: 2, height: 35, displayValue: true }); }
            
            checkSmartReminders(data);
        }
    } catch(e) {}
}

async function updateAdminStats() {
    const q = query(collection(db, "issue_requests"), where("status", "==", "issued"));
    const snap = await getDocs(q);
    document.getElementById('stat-1').innerText = snap.size;
}

// --- SHOW BORROWED DETAILS (UPDATED) ---
window.showBorrowedDetails = async () => {
    const modal = document.getElementById('dashboard-details-modal');
    
    // RESET TITLE
    const titleEl = modal.querySelector('h3');
    if(titleEl) titleEl.innerText = "Borrowed Books & Fines";

    const container = document.getElementById('dashboard-details-content');
    container.innerHTML = "<p>Loading...</p>";
    modal.classList.remove('hidden');

    let html = `<table class="data-table"><thead><tr><th>Book</th><th>${isAdminMode ? "User" : "Type"}</th><th>Due Date</th><th>Fine</th>${!isAdminMode ? '<th>Action</th>' : ''}</tr></thead><tbody>`;
    const baseQuery = isAdminMode 
        ? query(collection(db, "issue_requests"), where("status", "==", "issued"))
        : query(collection(db, "issue_requests"), where("studentEmail", "==", currentEmail), where("status", "==", "issued"));

    const snap = await getDocs(baseQuery);
    if(snap.empty) { container.innerHTML = "<p>No active books.</p>"; return; }

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const issueDate = data.issuedAt.toDate();
        const dueDate = new Date(issueDate);
        dueDate.setDate(issueDate.getDate() + 30);
        const now = new Date();
        const diffTime = now - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const fine = diffDays > 0 ? (diffDays * 50) : 0;
        const fineStyle = fine > 0 ? "color:red;font-weight:bold;" : "color:green;";
        const userCol = isAdminMode ? data.studentName : "Physical";

        // Button Logic
        let actionCell = "";
        if(!isAdminMode) {
            if(data.returnRequested) {
                actionCell = `<td><span style="color:#f97316; font-size:12px; font-weight:600;"><i class="fas fa-clock"></i> Pending</span></td>`;
            } else {
                actionCell = `<td><button onclick="window.requestBookReturn('${docSnap.id}')" class="main-btn" style="padding:5px 12px; font-size:12px; width:auto; background:#4f46e5;">Return</button></td>`;
            }
        }

        html += `<tr><td>${data.bookTitle}</td><td>${userCol}</td><td>${dueDate.toLocaleDateString()}</td><td style="${fineStyle}">₹${fine}</td>${actionCell}</tr>`;
    });
    container.innerHTML = html + "</tbody></table>";
};

// --- SHOW DUE SOON DETAILS (UPDATED) ---
window.showDueSoonDetails = async () => {
    const modal = document.getElementById('dashboard-details-modal');
    const container = document.getElementById('dashboard-details-content');
    
    // Change Title Dynamically
    const titleEl = modal.querySelector('h3');
    if(titleEl) titleEl.innerText = "Books Due Soon (< 7 Days)";
    
    container.innerHTML = "<p>Loading...</p>";
    modal.classList.remove('hidden');

    let html = `<table class="data-table"><thead><tr><th>Book</th><th>Due Date</th><th>Time Left</th>${!isAdminMode ? '<th>Action</th>' : ''}</tr></thead><tbody>`;
    
    try {
        const q = query(collection(db, "issue_requests"), where("studentEmail", "==", currentEmail), where("status", "==", "issued"));
        const snap = await getDocs(q);

        if(snap.empty) { 
            container.innerHTML = "<p style='padding:20px; text-align:center;'>No active books found.</p>"; 
            return; 
        }

        let count = 0;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const issueDate = data.issuedAt.toDate();
            const dueDate = new Date(issueDate);
            dueDate.setDate(issueDate.getDate() + 30); // 30 Day policy
            const now = new Date();
            
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            // FILTER: Only show books due in 0 to 7 days
            if (daysUntilDue >= 0 && daysUntilDue <= 7) {
                count++;
                const urgencyColor = daysUntilDue <= 3 ? "#ea4c89" : "#f97316"; 
                
                // Button Logic
                let actionCell = "";
                if(!isAdminMode) {
                    if(data.returnRequested) {
                        actionCell = `<td><span style="color:#f97316; font-size:12px; font-weight:600;"><i class="fas fa-clock"></i> Pending</span></td>`;
                    } else {
                        actionCell = `<td><button onclick="window.requestBookReturn('${docSnap.id}')" class="main-btn" style="padding:5px 12px; font-size:12px; width:auto; background:#4f46e5;">Return</button></td>`;
                    }
                }

                html += `<tr>
                    <td>${data.bookTitle}</td>
                    <td>${dueDate.toLocaleDateString()}</td>
                    <td style="color:${urgencyColor}; font-weight:bold;">${daysUntilDue} Days</td>
                    ${actionCell}
                </tr>`;
            }
        });

        if (count === 0) {
             container.innerHTML = "<p style='padding:20px; text-align:center; color:#666;'>No upcoming due dates this week.</p>";
        } else {
             container.innerHTML = html + "</tbody></table>";
        }
    } catch(e) {
        console.error(e);
        container.innerHTML = "<p>Error loading data.</p>";
    }
};

// --- SHOW FINE DETAILS ---
window.showFineDetails = async () => {
    const modal = document.getElementById('dashboard-details-modal');
    const container = document.getElementById('dashboard-details-content');
    
    // Change Title Dynamically
    const titleEl = modal.querySelector('h3');
    if(titleEl) titleEl.innerText = "Fine Breakdown (₹50/day)";
    
    container.innerHTML = "<p>Loading...</p>";
    modal.classList.remove('hidden');

    let html = `<table class="data-table"><thead><tr><th>Book</th><th>Due Date</th><th>Overdue By</th><th>Amount</th></tr></thead><tbody>`;
    let totalFine = 0;

    try {
        const q = query(collection(db, "issue_requests"), where("studentEmail", "==", currentEmail), where("status", "==", "issued"));
        const snap = await getDocs(q);

        if(snap.empty) { 
            container.innerHTML = "<p style='padding:20px; text-align:center;'>No active fines.</p>"; 
            return; 
        }

        let count = 0;
        snap.forEach(doc => {
            const data = doc.data();
            const issueDate = data.issuedAt.toDate();
            const dueDate = new Date(issueDate);
            dueDate.setDate(issueDate.getDate() + 30); // 30 Day Policy
            const now = new Date();
            
            const diffTime = now - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // FILTER: Only show books that are actually overdue (Positive diffDays)
            if (diffDays > 0) {
                count++;
                const fine = diffDays * 50;
                totalFine += fine;
                
                html += `<tr>
                    <td>${data.bookTitle}</td>
                    <td>${dueDate.toLocaleDateString()}</td>
                    <td style="color:#ef4444;">${diffDays} Days</td>
                    <td style="color:#b91c1c; font-weight:bold;">₹${fine}</td>
                </tr>`;
            }
        });

        if (count === 0) {
             container.innerHTML = "<p style='padding:20px; text-align:center; color:#10b981; font-weight:bold;'><i class='fas fa-check-circle'></i> No pending fines! Good job.</p>";
        } else {
             // Add Total Row
             html += `<tr style="background:#fff1f2; font-weight:bold; border-top: 2px solid #e11d48;">
                        <td colspan="3" style="text-align:right;">Total Pending:</td>
                        <td style="color:#be123c; font-size:16px;">₹${totalFine}</td>
                      </tr>`;
             container.innerHTML = html + "</tbody></table>";
        }
    } catch(e) {
        console.error(e);
        container.innerHTML = "<p>Error loading fine data.</p>";
    }
};

window.closeDashboardDetails = () => { document.getElementById('dashboard-details-modal').classList.add('hidden'); };

function updateSidebarMenu(role) { 
    const m = document.querySelector('.side-menu'); 
    if(!m) return;
    
    m.innerHTML = role === 'admin' ? 
    `<li class="active nav-item" id="nav-dashboard"><a href="#" onclick="navigate('dashboard')"><i class="fas fa-th-large"></i> Dashboard</a></li>
     <li class="nav-item" id="nav-issue"><a href="#" onclick="navigate('issue')"><i class="fas fa-exchange-alt"></i> Issue/Return</a></li>
     <li class="nav-item" id="nav-inventory"><a href="#" onclick="navigate('inventory')"><i class="fas fa-boxes"></i> Inventory</a></li>
     <li class="nav-item" id="nav-students"><a href="#" onclick="navigate('students')"><i class="fas fa-users"></i> Database</a></li>
     <li class="nav-item" id="nav-seats-admin"><a href="#" onclick="navigate('seats-admin')"><i class="fas fa-chair"></i> Seat Monitor</a></li>` 
    : 
    `<li class="active nav-item" id="nav-dashboard"><a href="#" onclick="navigate('dashboard')"><i class="fas fa-th-large"></i> Dashboard</a></li>
     <li class="nav-item" id="nav-books"><a href="#" onclick="navigate('books')"><i class="fas fa-book"></i> Books</a></li>
     <li class="nav-item" id="nav-ebooks"><a href="#" onclick="navigate('ebooks')"><i class="fas fa-tablet-alt"></i> E-Books</a></li>
     <li class="nav-item" id="nav-bookings"><a href="#" onclick="navigate('bookings')"><i class="fas fa-chair"></i> Seat Reservation</a></li>
     <li class="nav-item" id="nav-feedbacks"><a href="#" onclick="navigate('feedbacks')"><i class="fas fa-comment-dots"></i> Feedbacks</a></li>`; 
}

function navigate(s) { 
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active')); 
    document.getElementById('nav-'+s)?.classList.add('active'); 
    document.querySelectorAll('.content-section').forEach(x=>x.classList.add('hidden')); 
    if(s==='inventory') loadAdminInventory();
    if(s==='issue') loadIssueRequests();
    if(s==='books') loadAllBooks(); 
    if(s==='ebooks') loadEbooks(); 
    if(s==='students') loadAllStudents(); 
    document.getElementById('section-'+s)?.classList.remove('hidden'); 
    document.getElementById('page-title').innerText = s.charAt(0).toUpperCase() + s.slice(1).replace('-',' '); 
}

async function uploadFileToStorage(file, path) {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

async function handleProfileUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentEmail) return;
    try {
        const path = `profiles/${currentEmail}_${Date.now()}_${file.name}`;
        const url = await uploadFileToStorage(file, path);
        await updateDoc(doc(db, "students", currentEmail), { profilePic: url });
        document.getElementById('dash-profile-img').src = url;
    } catch (error) { console.error("Upload failed", error); }
}

function initNotificationSystem() {
    if(!currentEmail) return;
    
    const q = query(collection(db, "notifications"), where("email", "==", currentEmail), orderBy("timestamp", "desc"));
    
    notifUnsubscribe = onSnapshot(q, (snapshot) => {
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        
        let headerHtml = "";
        if(!snapshot.empty) {
            headerHtml = `
                <div style="padding: 8px 12px; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; background: #fafafa;">
                    <button onclick="window.markAllNotificationsRead()" style="background: none; border: none; color: #4f46e5; font-size: 11px; cursor: pointer; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Mark all read <i class="fas fa-check-double"></i>
                    </button>
                </div>`;
        }

        if(snapshot.empty) { 
            list.innerHTML = `<p style="color: #94a3b8; font-size: 13px; padding: 20px; text-align: center;">No notifications yet.</p>`; 
            badge.classList.add('hidden');
            return; 
        }

        let html = headerHtml;
        let unreadCount = 0;

        snapshot.forEach(docSnap => {
            const n = docSnap.data();
            const nid = docSnap.id; 
            
            if(!n.read) unreadCount++;

            const bgStyle = n.read ? "background: #ffffff;" : "background: #f0f9ff;";
            const fontStyle = n.read ? "font-weight: 400; color: #64748b;" : "font-weight: 600; color: #1e1b4b;";
            const borderStyle = n.read ? "border-left: 3px solid transparent;" : "border-left: 3px solid #ea4c89;"; 
            
            const iconColor = n.type === 'alert' ? '#ef4444' : '#4f46e5';
            let icon = n.type === 'alert' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-info-circle"></i>';
            
            const clickAction = n.read ? "" : `onclick="window.markNotificationRead('${nid}')" style="cursor:pointer" title="Click to mark as read"`;
            const wrapperStyle = n.read ? "" : "cursor: pointer;";

            const timeString = n.timestamp ? new Date(n.timestamp.toDate()).toLocaleDateString() : 'Just now';

            html += `
            <div ${clickAction} style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; align-items: start; transition: background 0.2s; ${bgStyle} ${borderStyle} ${wrapperStyle}">
                <div style="margin-top: 2px; color: ${iconColor}; font-size: 16px;">${icon}</div>
                <div style="flex: 1;">
                    <p style="${fontStyle} font-size: 13px; margin-bottom: 4px; line-height: 1.4;">${n.message}</p>
                    <span style="font-size: 11px; color: #94a3b8;">${timeString}</span>
                </div>
                ${!n.read ? `<div style="width: 8px; height: 8px; background: #ea4c89; border-radius: 50%; margin-top: 6px;" title="Unread"></div>` : ''}
            </div>`;
        });

        list.innerHTML = html;
        if(unreadCount > 0) { 
            badge.innerText = unreadCount; 
            badge.classList.remove('hidden'); 
        } else {
            badge.classList.add('hidden');
        }
    });
}

window.markNotificationRead = async (id) => {
    try {
        const ref = doc(db, "notifications", id);
        await updateDoc(ref, { read: true });
    } catch(e) { console.error("Error marking read:", e); }
};

window.markAllNotificationsRead = async () => {
    if(!currentEmail) return;
    try {
        const q = query(collection(db, "notifications"), where("email", "==", currentEmail), where("read", "==", false));
        const snap = await getDocs(q);
        const updatePromises = [];
        snap.forEach((d) => {
            updatePromises.push(updateDoc(doc(db, "notifications", d.id), { read: true }));
        });
        await Promise.all(updatePromises);
        UI.alert("All notifications marked as read.");
    } catch(e) { console.error("Error marking all read:", e); }
};

async function notifyUser(email, msg) {
    if(!email) return;
    await addDoc(collection(db, "notifications"), { email: email, message: msg, type: "alert", timestamp: serverTimestamp(), read: false });
}

function toggleNotifications() { document.getElementById('notification-dropdown').classList.toggle('hidden'); }

async function checkSmartReminders(studentData) {
    if(studentData.books > 0 && Math.random() > 0.8) {
        try {
            const result = `Hi ${studentData.name}, just a friendly reminder to check your book due dates!`;
            await notifyUser(currentEmail, result);
        } catch(e) {}
    }
}

function toggleChat() { document.getElementById('chat-window').classList.toggle('hidden'); }

// ==========================================
// --- SEAT MANAGEMENT ---
// ==========================================

function initRealtimeSeats() {
    seatUnsubscribe = onSnapshot(collection(db, "seats"), (snapshot) => {
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const seatId = docSnap.id;
            const now = new Date();
            if(data.status === 'reserved' && data.checkInDeadline) {
                if(now > data.checkInDeadline.toDate()) releaseSeat(seatId, "Auto-Release (Lazy Check)");
            }
            const el = document.getElementById('seat-'+seatId);
            if(el) { el.className = `seat ${data.status} s-${seatId}`; if(data.occupiedBy === currentEmail) el.classList.add('booked-user'); }
            const elAdm = document.getElementById('adm-seat-'+seatId);
            if(elAdm) { elAdm.className = `seat ${data.status} s-${seatId}`; }
        });
    });
}

function selectSeat(el, id){
    if(el.classList.contains('booked')||el.classList.contains('reserved')||el.classList.contains('occupied')) return;
    document.querySelectorAll('.seat.selected').forEach(s => { if(s.id !== el.id) s.classList.remove('selected'); });
    el.classList.add('selected');
    window.selectedSeatID = id; 
    document.getElementById('selected-seat-num').innerText=id;
    document.getElementById('seat-selection-footer').classList.remove('hidden');
}

async function confirmSeatBooking(){
    const sid = window.selectedSeatID;
    if(!sid) return;
    const u = auth.currentUser ? auth.currentUser.email : currentEmail;
    
    const q = query(collection(db, "seats"), where("occupiedBy", "==", u));
    const existingBooking = await getDocs(q);
    const activeBooking = existingBooking.docs.find(d => d.data().status !== 'available');

    if (activeBooking) {
        return UI.alert(`You have already booked seat ${activeBooking.id}. Please release it first.`);
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 1 * 60000); 

    try {
        const logRef = await addDoc(collection(db, "booking_logs"), {
            seatId: sid, userEmail: u, status: "reserved", reservedAt: serverTimestamp()
        });

        await setDoc(doc(db,"seats",sid),{ 
            occupiedBy: u, status: 'reserved', reservedAt: serverTimestamp(),
            checkInDeadline: deadline, sessionExpiresAt: null, currentLogId: logRef.id 
        });
        
        notifyUser(DEMO_ADMIN_EMAIL, `Seat ${sid} reserved by ${u}`);

        document.getElementById('seat-selection-footer').classList.add('hidden');
        document.getElementById('checkin-status-area').classList.remove('hidden');
        
        document.getElementById('checkin-status-area').innerHTML = `
            <h4><i class="fas fa-clock"></i> Seat Reserved!</h4>
            <p>Scan the Desk QR within <span id="timer-display" style="font-weight:bold;">01:00</span></p>
            <div style="display:flex; gap:10px;">
                <button onclick="window.openQRScanner()" class="main-btn" style="flex:1;"><i class="fas fa-qrcode"></i> Scan QR</button>
                <button onclick="window.cancelSeatBooking()" class="secondary-btn" style="flex:1; color:#ef4444; border:1px solid #ef4444;">Cancel</button>
            </div>
        `;

        startLocalTimer(60); 
    } catch(e) { console.error(e); UI.alert("Booking failed. It might be taken."); }
}

window.cancelSeatBooking = async () => {
    if(bookingTimer) clearInterval(bookingTimer);
    if(window.selectedSeatID) {
        await releaseSeat(window.selectedSeatID, "User Cancelled");
        notifyUser(DEMO_ADMIN_EMAIL, `Seat ${window.selectedSeatID} Cancelled by User`);
    }
    document.getElementById('checkin-status-area').classList.add('hidden');
    UI.alert("Booking Cancelled.");
}

function startLocalTimer(duration) {
    let timer = duration, minutes, seconds;
    const display = document.getElementById('timer-display');
    if(bookingTimer) clearInterval(bookingTimer);
    bookingTimer = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        if(display) display.textContent = minutes + ":" + seconds;
        if (--timer < 0) {
            clearInterval(bookingTimer);
            if(display) display.textContent = "EXPIRED";
            releaseSeat(window.selectedSeatID, "Auto-Release (Timer Expired)");
        }
    }, 1000);
}

function openQRScanner() {
    document.getElementById('qr-scanner-modal').classList.remove('hidden');
    if (html5QrcodeScanner) return;
    html5QrcodeScanner = new Html5QrcodeScanner("seat-reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess);
}

function onScanSuccess(decodedText) {
    const expectedToken = "SEAT:" + window.selectedSeatID;
    if (decodedText === expectedToken) {
        completeQRScan();
    } else {
        UI.alert(`WRONG SEAT! \n\nYou booked: ${window.selectedSeatID}`);
        if(html5QrcodeScanner) html5QrcodeScanner.pause(true);
        setTimeout(() => { if(html5QrcodeScanner) html5QrcodeScanner.resume(); }, 2000);
    }
}

function closeQRScanner() {
    if (html5QrcodeScanner) { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }
    document.getElementById('qr-scanner-modal').classList.add('hidden');
}

async function completeQRScan(){
    const sid = window.selectedSeatID;
    if(!sid) return;
    const now = new Date();
    const sessionEnd = new Date(now.getTime() + 30 * 1000); 

    try {
        const seatSnap = await getDoc(doc(db, "seats", sid));
        const logId = seatSnap.data().currentLogId;
        if(logId) await updateDoc(doc(db, "booking_logs", logId), { status: "occupied", verifiedAt: serverTimestamp() });

        await updateDoc(doc(db,"seats",sid),{
            status: 'occupied', confirmedAt: serverTimestamp(),
            checkInDeadline: null, sessionExpiresAt: sessionEnd
        });
        
        closeQRScanner();
        const container = document.getElementById('checkin-status-area');
        if(bookingTimer) clearInterval(bookingTimer);

        container.innerHTML = `
            <h4 style="color:#10b981"><i class="fas fa-check-circle"></i> Session Active</h4>
            <p>Demo Ends In: <span id="session-timer-display" style="font-weight:bold; font-size:18px">00:30</span></p>
            <button onclick="window.releaseSeat('${sid}', 'User Ended')" class="secondary-btn" style="margin-top:5px; font-size:12px; width:100%;">End Session Now</button>
        `;
        
        let timeLeft = 30;
        const display = document.getElementById('session-timer-display');
        bookingTimer = setInterval(() => {
            let m = parseInt(timeLeft / 60, 10);
            let s = parseInt(timeLeft % 60, 10);
            m = m < 10 ? "0" + m : m;
            s = s < 10 ? "0" + s : s;
            if(display) display.textContent = m + ":" + s;
            if (--timeLeft < 0) {
                clearInterval(bookingTimer);
                releaseSeat(sid, "Auto-Release (Timer Expired)");
                container.innerHTML = `<h4 style="color:#ef4444"><i class="fas fa-times-circle"></i> Session Expired</h4>`;
            }
        }, 1000);
        UI.alert("Checked In!");
    } catch(e) { console.error("QR Error", e); }
}

async function releaseSeat(seatId, reason) {
    try {
        const seatRef = doc(db, "seats", seatId);
        const seatSnap = await getDoc(seatRef);
        if (seatSnap.exists()) {
            const data = seatSnap.data();
            const logId = data.currentLogId;
            if(logId) {
                let finalStatus = "completed";
                if(reason.includes("Auto-Release") || reason.includes("No QR")) finalStatus = "missed";
                await updateDoc(doc(db, "booking_logs", logId), { status: finalStatus, releasedAt: serverTimestamp(), releaseReason: reason });
            }
        }
        await updateDoc(seatRef, {
            status: 'available', occupiedBy: null, reservedAt: null, 
            checkInDeadline: null, sessionExpiresAt: null, currentLogId: null
        });
        if(window.selectedSeatID === seatId && reason !== "Auto-Release (Timer Expired)") {
            document.getElementById('checkin-status-area').classList.add('hidden');
            if(bookingTimer) clearInterval(bookingTimer);
        }
    } catch(e) {}
}

function showSeatQR(seatId) {
    const modal = document.getElementById('admin-seat-modal');
    const qrContainer = document.getElementById('admin-generated-qr');
    qrContainer.innerHTML = "";
    const token = "SEAT:" + seatId;
    new QRCode(qrContainer, { text: token, width: 128, height: 128, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    document.getElementById('adm-qr-label').innerText = `Desk Token: ${token}`;
    modal.classList.remove('hidden');
}

function adminViewSeat(seatId){
    const modal = document.getElementById('admin-seat-modal');
    modal.classList.remove('hidden');
    document.getElementById('adm-modal-title').innerText = "Seat: " + seatId;
    showSeatQR(seatId);
    getDoc(doc(db, "seats", seatId)).then(d => {
        if(d.exists()){
            const data = d.data();
            document.getElementById('adm-modal-user').innerText = data.occupiedBy || "--";
            document.getElementById('adm-modal-status').innerText = data.status.toUpperCase();
        } else {
            document.getElementById('adm-modal-user').innerText = "--";
            document.getElementById('adm-modal-status').innerText = "AVAILABLE";
        }
    });
}

// ==========================================
// --- BOOK MANAGEMENT ---
// ==========================================

async function addNewBook(e) {
    e.preventDefault();
    const isbn = document.getElementById('bk-isbn-new').value.trim();
    const idString = document.getElementById('bk-ids-new').value.trim();
    const fileInput = document.getElementById('bk-cover-new');
    const pdfFileInput = document.getElementById('bk-pdf-file-new'); 
    
    let coverUrl = null, pdfUrl = null;
    if (fileInput.files[0]) coverUrl = await uploadFileToStorage(fileInput.files[0], `covers/${isbn}_${fileInput.files[0].name}`);
    if (pdfFileInput && pdfFileInput.files[0]) pdfUrl = await uploadFileToStorage(pdfFileInput.files[0], `pdfs/${isbn}_${pdfFileInput.files[0].name}`);

    const inventory = idString.split(',').map(id => ({ id: id.trim(), status: 'available', issuedTo: null })).filter(item => item.id !== "");
    await setDoc(doc(db, "books", isbn), {
        isbn: isbn, title: document.getElementById('bk-title-new').value,
        author: document.getElementById('bk-author-new').value, category: document.getElementById('bk-cat-new').value,
        inventory: inventory, totalCopies: inventory.length, pdfUrl: pdfUrl, coverUrl: coverUrl
    });
    UI.alert("Book Added!"); hideAddBookForm();
}

window.loadAdminInventory = function(sortBy='title') {
    const container = document.getElementById('admin-book-list-container');
    if (!container) return;
    
    if (unsubscribeInventoryListener) unsubscribeInventoryListener();

    unsubscribeInventoryListener = onSnapshot(collection(db, "books"), (snapshot) => {
        let b = []; 
        snapshot.forEach(d => { 
            const data = d.data(); 
            const bookObj = { id: d.id, ...data }; 
            b.push(bookObj); 
        });
        
        b.sort((a,c) => (a[sortBy]||'').toString().toLowerCase() > (c[sortBy]||'').toString().toLowerCase() ? 1 : -1);
        
        let html = `<table class="data-table"><thead><tr><th>ISBN</th><th>Title</th><th>Author</th><th>Copies</th><th>Action</th></tr></thead><tbody>`;
        b.forEach(book => {
            const inv = book.inventory || [];
            const available = inv.filter(i => i.status === 'available').length;
            html += `<tr><td>${book.isbn}</td><td>${book.title}</td><td>${book.author}</td><td>${available}/${inv.length}</td><td><button onclick="window.displayBook('${book.id}')" class="main-btn" style="padding:5px;">Edit</button></td></tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    });
}

// --- UPDATED: DISPLAY BOOK WITH PDF LINK TOGGLE ---
window.displayBook = async (id) => {
    try {
        const bookDoc = await getDoc(doc(db, "books", id));
        if(!bookDoc.exists()) return UI.alert("Error: Book data not found.");
        const book = bookDoc.data();
        
        currentBookId = id; 
        document.getElementById('bk-display-title').innerText = book.title;
        document.getElementById('bk-display-author').innerText = book.author;
        document.getElementById('bk-isbn-hidden').value = book.isbn;

        // --- Handle PDF Link Visibility ---
        const pdfLink = document.getElementById('bk-pdf-link');
        if (book.pdfUrl) {
            pdfLink.href = book.pdfUrl;
            pdfLink.classList.remove('hidden');
        } else {
            pdfLink.href = "#";
            pdfLink.classList.add('hidden');
        }

        const grid = document.getElementById('copy-inventory-grid');
        grid.innerHTML = "";
        if (book.inventory) {
            book.inventory.forEach(item => {
                const color = item.status === 'available' ? '#10b981' : '#ef4444';
                grid.innerHTML += `<div style="border:1px solid ${color}; color:${color}; padding:5px 8px; border-radius:4px; font-size:12px; font-weight:bold; display:inline-block; margin:2px;">${item.id}</div>`;
            });
        }
        document.getElementById('add-copy-container').classList.add('hidden');
        document.getElementById('edit-book-modal').classList.remove('hidden');
    } catch(e) { console.error(e); }
};

window.closeBookDetails = () => { document.getElementById('edit-book-modal').classList.add('hidden'); };
window.toggleBookEditMode = () => { document.getElementById('add-copy-container').classList.toggle('hidden'); };

window.addSingleCopy = async () => {
    const newId = document.getElementById('new-copy-id').value.trim();
    if (!newId || !currentBookId) return;
    try {
        const bookRef = doc(db, "books", currentBookId);
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
            const currentInv = bookSnap.data().inventory || [];
            if (currentInv.find(i => i.id === newId)) return UI.alert("Duplicate Unit ID!");
            const updatedInv = [...currentInv, { id: newId, status: 'available', issuedTo: null }];
            await updateDoc(bookRef, { inventory: updatedInv, totalCopies: updatedInv.length });
            UI.alert("Copy Added!"); document.getElementById('new-copy-id').value = ""; 
            
            window.displayBook(currentBookId); 
        }
    } catch (e) { console.error(e); UI.alert("Failed to add copy."); }
};

window.deleteBook = async () => { 
    if(currentBookId && await UI.confirm("Delete this book entirely?")) {
        deleteDoc(doc(db,"books",currentBookId));
        closeBookDetails();
    }
};

window.loadAllBooks = function(sortBy = 'title') {
    const grid = document.getElementById('student-book-grid');
    if (!grid) return;

    if (unsubscribeStudentBooksListener) unsubscribeStudentBooksListener();

    unsubscribeStudentBooksListener = onSnapshot(collection(db, "books"), (snapshot) => {
        let books = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const bookObj = { ...data, id: doc.id };
            books.push(bookObj);
        });
        
        books.sort((a, b) => (a[sortBy] || '').toString().localeCompare((b[sortBy] || '').toString()));
        
        grid.innerHTML = "";
        books.forEach(book => {
            const img = book.coverUrl ? book.coverUrl : `https://placehold.co/150x220?text=No+Cover`;
            const bookStr = encodeURIComponent(JSON.stringify(book));
            
            const inv = book.inventory || [];
            const availableCount = inv.filter(i => i.status === 'available').length;
            
            let cardStyle = "position:relative; transition: transform 0.2s; cursor: pointer;";
            let badgeHtml = "";
            let clickAction = `onclick="window.openBookRequestModal('${bookStr}')"`;

            if (availableCount === 0) {
                cardStyle += "filter: grayscale(100%); opacity: 0.7; background: #f1f5f9; border: 1px solid #cbd5e0;";
                badgeHtml = "<span style='position:absolute; top:10px; left:10px; background:#64748b; color:white; padding:4px 8px; font-size:11px; border-radius:4px; font-weight:bold; z-index:2;'>Out of Stock</span>";
                clickAction = `onclick="UI.alert('Sorry, this book is currently out of stock.')"`; 
            } else if (availableCount <= 3) {
                cardStyle += "border: 2px solid #ef4444; background: #fef2f2;";
                badgeHtml = `<span style='position:absolute; top:10px; left:10px; background:#ef4444; color:white; padding:4px 8px; font-size:11px; border-radius:4px; font-weight:bold; z-index:2;'>Only ${availableCount} Left!</span>`;
            } else {
                cardStyle += "background: white;";
            }

            grid.innerHTML += `<div class="book-card" ${clickAction} style="${cardStyle}">
                ${badgeHtml}
                <img src="${img}" style="width:100%;height:200px;object-fit:cover; border-radius: 8px;">
                <h4 style="margin-top:10px;">${book.title}</h4>
                <p>${book.author}</p>
            </div>`;
        });
    });
}

async function loadEbooks() {
    const container = document.getElementById('ebook-list-container');
    const searchInput = document.getElementById('ebookSearchInput');
    const sortSelect = document.getElementById('ebookSort');
    if (!container) return;
    const queryText = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const sortBy = sortSelect ? sortSelect.value : "title";
    container.innerHTML = '<p style="text-align:center; color:#666; width:100%;">Loading Digital Library...</p>';
    try {
        const snap = await getDocs(collection(db, "books"));
        let ebooks = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.pdfUrl) { 
                const t = data.title ? data.title.toLowerCase() : "";
                const a = data.author ? data.author.toLowerCase() : "";
                if (queryText === "" || t.includes(queryText) || a.includes(queryText)) {
                    ebooks.push({ id: doc.id, ...data });
                }
            }
        });
        ebooks.sort((a, b) => (a[sortBy] || '').toString().localeCompare((b[sortBy] || '').toString()));
        if (ebooks.length === 0) { container.innerHTML = '<div class="empty-state" style="text-align:center; margin-top:20px; color:#a0aec0; width:100%;"><i class="fas fa-search" style="font-size:24px; margin-bottom:10px;"></i><p>No e-books found.</p></div>'; return; }
        let html = "";
        ebooks.forEach(book => {
            const img = book.coverUrl ? book.coverUrl : `https://placehold.co/150x220/e0e7ff/4f46e5?text=${encodeURIComponent(book.title ? book.title.substring(0,12) : 'PDF')}...`;
            html += `<div class="book-card"><div style="position: relative;"><img src="${img}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;"><span class="status-tag" style="position:absolute; top:10px; right:10px; background:#fff; color:#ea4c89; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.1); padding:2px 8px; border-radius:4px; font-size:10px;">PDF</span></div><h4 style="margin: 12px 0 5px; font-size: 15px; color: #1e1b4b; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;" title="${book.title}">${book.title}</h4><p style="color: #64748b; font-size: 13px; margin-bottom: 12px;">${book.author || 'Unknown Author'}</p><a href="${book.pdfUrl}" target="_blank" class="main-btn" style="text-decoration:none; display:block; text-align:center; padding: 10px; font-size: 14px; border-radius:8px;"><i class="fas fa-book-open"></i> Read Now</a></div>`;
        });
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red; text-align:center; width:100%;">Failed to load library.</p>'; }
}


function openBookRequestModal(bookJSON) {
    selectedBook = JSON.parse(decodeURIComponent(bookJSON));
    document.getElementById('md-book-title').innerText = selectedBook.title;
    document.getElementById('book-detail-modal').classList.remove('hidden');
}

async function submitIssueRequest() {
    const copyId = document.getElementById('md-book-copy-id').value.trim();
    if (!copyId) return UI.alert("Enter Book ID");

    const uEmail = auth.currentUser ? auth.currentUser.email : currentEmail;

    try {
        // 1. CHECK INVENTORY: Is this specific copy already issued?
        const bookRef = doc(db, "books", selectedBook.isbn);
        const bookSnap = await getDoc(bookRef);

        if (bookSnap.exists()) {
            const inv = bookSnap.data().inventory || [];
            const targetCopy = inv.find(i => i.id === copyId);

            if (!targetCopy) {
                return UI.alert("Invalid Unit ID. This copy does not exist.");
            }

            if (targetCopy.status === 'issued') {
                return UI.alert(`Book Copy '${copyId}' is already issued to a student.`);
            }
        }

        // 2. CHECK USER: Does this user already have this book (Issued or Pending)?
        const qCheck = query(
            collection(db, "issue_requests"),
            where("studentEmail", "==", uEmail),
            where("bookISBN", "==", selectedBook.isbn),
            where("status", "in", ["issued", "pending"])
        );

        const checkSnap = await getDocs(qCheck);

        if (!checkSnap.empty) {
            return UI.alert("You already have this book (or a request is pending).");
        }

        // 3. CHECK LIMIT
        const qTotal = query(collection(db, "issue_requests"), where("studentEmail", "==", uEmail), where("status", "==", "issued"));
        const totalSnap = await getDocs(qTotal);
        if(totalSnap.size >= 5) return UI.alert("LIMIT REACHED: You cannot borrow more than 5 books.");

        // 4. SUBMIT
        const d = await getDoc(doc(db, "students", uEmail));
        await addDoc(collection(db, "issue_requests"), {
            studentEmail: uEmail,
            studentName: d.data().name,
            studentRoll: d.data().roll,
            bookTitle: selectedBook.title,
            bookISBN: selectedBook.isbn,
            copyId: copyId,
            status: "pending",
            timestamp: serverTimestamp()
        });

        notifyUser(DEMO_ADMIN_EMAIL, `New Issue Request: ${selectedBook.title} by ${d.data().roll}`);

        UI.alert("Request Sent! Pending Admin Approval.");
        document.getElementById('book-detail-modal').classList.add('hidden');

    } catch(e) {
        console.error("Issue Request Error:", e);
        UI.alert("System Error processing request.");
    }
}

// ==========================================
// --- ISSUE & RETURN LOGIC ---
// ==========================================

// --- NEW FUNCTION: Request Book Return (Student Side) ---
window.requestBookReturn = async (requestId) => {
    if(!confirm("Request return for this book? This notifies the admin.")) return;
    try {
        const btn = event.target;
        btn.innerHTML = "Sending...";
        btn.disabled = true;

        await updateDoc(doc(db, "issue_requests", requestId), {
            returnRequested: true,
            returnRequestedAt: serverTimestamp()
        });

        UI.alert("Return Request Sent! waiting for admin approval.");
        
        // Refresh the current modal view to show the status change
        const modalTitle = document.querySelector('#dashboard-details-modal h3');
        if(modalTitle && modalTitle.innerText.includes("Borrowed")) window.showBorrowedDetails();
        else if(modalTitle && modalTitle.innerText.includes("Due")) window.showDueSoonDetails();
        
    } catch(e) {
        console.error(e);
        UI.alert("Failed to send request.");
        const btn = event.target;
        btn.innerHTML = "Return";
        btn.disabled = false;
    }
};

window.loadIssueRequests = async function() {
    if (unsubscribeIssueListener) unsubscribeIssueListener();

    const qPending = query(collection(db, "issue_requests"), where("status", "==", "pending"));
    const qIssued = query(collection(db, "issue_requests"), where("status", "==", "issued"));

    const unsubPending = onSnapshot(qPending, (snapshot) => {
        const list = document.getElementById('issue-requests-list');
        if(!list) return;
        
        let html = "";
        snapshot.forEach(doc => {
            const req = doc.data();
            const reqStr = encodeURIComponent(JSON.stringify({ id: doc.id, ...req }));
            html += `<div class="booking-item" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <h4 style="font-size: 15px; margin-bottom: 5px;">${req.bookTitle}</h4>
                <p style="font-size: 13px; color: #666; margin-bottom: 10px;">${req.studentName} <span style="background: #eef2ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${req.copyId}</span></p>
                <button onclick="window.processIssue('${reqStr}')" class="main-btn" style="padding: 8px; font-size: 13px;">Process Issue</button>
            </div>`;
        });
        list.innerHTML = html || "<p style='color:#999; font-size:13px; text-align:center; padding:20px;'>No pending issue requests.</p>";
    });

    // --- UPDATED ADMIN VIEW: Handles 'Return Requested' Filter ---
    const unsubIssued = onSnapshot(qIssued, (snapshot) => {
        const returnList = document.getElementById('return-requests-list');
        if(!returnList) return;
        
        // OPTIONAL: Update Header to reflect it's a Request Queue
        const headerEl = returnList.previousElementSibling;
        if(headerEl) headerEl.innerHTML = '<i class="fas fa-undo" style="color:#10b981"></i> Return Requests';

        let htmlRet = "";
        let count = 0;

        snapshot.forEach(doc => {
            const req = doc.data();
            
            // --- NEW FILTER: ONLY SHOW IF RETURN REQUESTED ---
            if (!req.returnRequested) return; 
            
            count++;
            const reqStr = encodeURIComponent(JSON.stringify({ id: doc.id, ...req }));
            
            const issueDate = req.issuedAt ? req.issuedAt.toDate() : new Date();
            const dueDate = new Date(issueDate);
            dueDate.setDate(issueDate.getDate() + 30);
            const now = new Date();
            const isOverdue = now > dueDate;

            // Badge for Return Request
            const requestBadge = `<span style="background: #fce7f3; color: #db2777; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; border: 1px solid #fbcfe8; margin-left: 8px;">RETURN REQUESTED</span>`;

            // Highlight Border
            const borderStyle = "2px solid #db2777";

            htmlRet += `<div class="booking-item" style="background: #fff; border: ${borderStyle}; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <h4 style="font-size: 15px; margin-bottom: 5px;">${req.bookTitle} ${requestBadge}</h4>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-size: 12px; color: #666;">${req.studentName}</span>
                    <span style="background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${req.copyId}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <span style="font-size: 11px; color: ${isOverdue ? 'red' : '#64748b'};">Due: ${dueDate.toLocaleDateString()}</span>
                    <button onclick="window.processManualReturn('${reqStr}')" class="main-btn" style="padding: 6px 12px; font-size: 12px; width:auto; background: #0f172a;">Accept Return</button>
                </div>
            </div>`;
        });
        returnList.innerHTML = htmlRet || "<p style='color:#999; font-size:13px; text-align:center; padding:20px;'>No pending return requests.</p>";
    });

    unsubscribeIssueListener = () => { unsubPending(); unsubIssued(); };
}

window.processManualReturn = async function(reqStr) {
    if(!confirm("Confirm that you have received this book and want to mark it as Returned?")) return;
    
    const req = JSON.parse(decodeURIComponent(reqStr));
    
    try {
        const qBook = query(collection(db, "books"), where("isbn", "==", req.bookISBN));
        const snap = await getDocs(qBook);
        
        if(!snap.empty) {
            const bookDoc = snap.docs[0];
            const inv = bookDoc.data().inventory || [];
            const idx = inv.findIndex(i => i.id === req.copyId);
            
            if(idx !== -1) {
                inv[idx].status = 'available';
                inv[idx].issuedTo = null;
                await updateDoc(bookDoc.ref, { inventory: inv });
            }
        }

        await updateDoc(doc(db, "issue_requests", req.id), { 
            status: "returned", 
            returnedAt: serverTimestamp() 
        });

        UI.alert("Book Returned Successfully!");
        // Note: loadIssueRequests updates automatically now, but we might want to manually refresh stats
        if(typeof updateAdminStats === 'function') updateAdminStats();
        
    } catch(e) {
        console.error(e);
        UI.alert("Error processing return.");
    }
}

function processIssue(reqStr){ selectedRequest = JSON.parse(decodeURIComponent(reqStr)); document.getElementById('verify-book-title').innerText = selectedRequest.bookTitle; document.getElementById('issue-verify-modal').classList.remove('hidden'); }

// --- UPDATED: ISSUE FINALIZATION WITH STOCK ALERTS ---
async function finalizeIssueBook(){
    // 1. Update Request Status
    await updateDoc(doc(db, "issue_requests", selectedRequest.id), { status: "issued", issuedAt: serverTimestamp() });
    
    // 2. Update Inventory
    const bookSnap = await getDocs(query(collection(db,"books"), where("isbn", "==", selectedRequest.bookISBN)));
    if(!bookSnap.empty){
        const bookDoc = bookSnap.docs[0];
        const inv = bookDoc.data().inventory;
        const copyIdx = inv.findIndex(i => i.id === selectedRequest.copyId);
        
        if(copyIdx !== -1) {
            inv[copyIdx].status = 'issued';
            inv[copyIdx].issuedTo = selectedRequest.studentRoll;
            
            await updateDoc(bookDoc.ref, { inventory: inv });

            // --- NEW: STOCK NOTIFICATION LOGIC ---
            const newAvailableCount = inv.filter(i => i.status === 'available').length;
            
            if (newAvailableCount === 0) {
                // Alert: Out of Stock
                notifyUser(DEMO_ADMIN_EMAIL, `URGENT ALERT: '${selectedRequest.bookTitle}' is now OUT OF STOCK.`);
            } else if (newAvailableCount <= 3) {
                // Alert: Low Stock
                notifyUser(DEMO_ADMIN_EMAIL, `STOCK ALERT: '${selectedRequest.bookTitle}' is running low (${newAvailableCount} remaining).`);
            }
        }
    }
    
    // 3. Notify Admin (Standard Log) & UI Feedback
    notifyUser(DEMO_ADMIN_EMAIL, `Book Issued: ${selectedRequest.bookTitle} to ${selectedRequest.studentRoll}`);

    UI.alert("Issued Successfully!"); 
    document.getElementById('issue-verify-modal').classList.add('hidden'); 
    updateAdminStats(); 
}

// ==========================================
// --- STUDENT MANAGEMENT ---
// ==========================================

function addNewStudent(e){
    e.preventDefault();
    const em=document.getElementById('new-email').value.trim().toLowerCase();
    const phone = document.getElementById('new-phone').value.trim();

    setDoc(doc(db,"students",em),{
        roll:document.getElementById('new-roll').value, 
        name:document.getElementById('new-name').value,
        dept:document.getElementById('new-dept').value, 
        sem:document.getElementById('new-sem').value,
        phone: phone, 
        email:em, 
        books:0, 
        fines:0
    }).then(()=>{ 
        notifyUser(DEMO_ADMIN_EMAIL, `New Student Registered: ${document.getElementById('new-name').value}`);
        UI.alert("Added!"); 
        hideAddForm(); 
        loadAllStudents(); 
    });
}

async function loadAllStudents(){
    const t=document.getElementById('student-list-body');
    const s=await getDocs(collection(db,"students"));
    let h=""; 
    s.forEach(d=>{ 
        const x=d.data(); 
        const dataStr = encodeURIComponent(JSON.stringify(x));
        
        h += `<tr>
            <td>${x.roll}</td>
            <td>${x.name}</td>
            <td>${x.dept}</td>
            <td>${x.sem}</td>
            <td>${x.phone || '--'}</td>
            <td>
                <button onclick="window.openEditStudent('${dataStr}')" class="main-btn" style="padding: 5px 10px; font-size: 12px; width: auto; background: #4f46e5;">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>`; 
    });
    t.innerHTML=h;
}

window.openEditStudent = function(dataStr) {
    const data = JSON.parse(decodeURIComponent(dataStr));
    document.getElementById('edit-st-original-email').value = data.email;
    document.getElementById('edit-st-email').value = data.email;
    document.getElementById('edit-st-name').value = data.name;
    document.getElementById('edit-st-roll').value = data.roll;
    document.getElementById('edit-st-dept').value = data.dept;
    document.getElementById('edit-st-sem').value = data.sem;
    document.getElementById('edit-st-phone').value = data.phone || "";
    document.getElementById('edit-student-modal').classList.remove('hidden');
}

window.saveStudentEdit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('edit-st-original-email').value;
    if(!email) return;

    try {
        await updateDoc(doc(db, "students", email), {
            name: document.getElementById('edit-st-name').value,
            roll: document.getElementById('edit-st-roll').value,
            dept: document.getElementById('edit-st-dept').value,
            sem: document.getElementById('edit-st-sem').value,
            phone: document.getElementById('edit-st-phone').value
        });
        
        UI.alert("Student Updated Successfully!");
        document.getElementById('edit-student-modal').classList.add('hidden');
        loadAllStudents(); 
    } catch(err) {
        console.error(err);
        UI.alert("Error updating student.");
    }
}

window.searchStudent = async function() {
    const queryText = document.getElementById('studentSearchInput').value.trim().toLowerCase();
    if (!queryText) {
        loadAllStudents();
        return;
    }
    const t = document.getElementById('student-list-body');
    t.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Searching...</td></tr>';
    try {
        const s = await getDocs(collection(db, "students"));
        let h = "";
        let found = false;
        s.forEach(d => {
            const x = d.data();
            const name = x.name ? x.name.toLowerCase() : "";
            const roll = x.roll ? x.roll.toString().toLowerCase() : "";
            if (name.includes(queryText) || roll.includes(queryText)) {
                found = true;
                const dataStr = encodeURIComponent(JSON.stringify(x));
                h += `<tr><td>${x.roll}</td><td>${x.name}</td><td>${x.dept}</td><td>${x.sem}</td><td>${x.phone || '--'}</td><td><button onclick="window.openEditStudent('${dataStr}')" class="main-btn" style="padding: 5px 10px; font-size: 12px; width: auto; background: #4f46e5;"><i class="fas fa-edit"></i> Edit</button></td></tr>`;
            }
        });
        t.innerHTML = found ? h : '<tr><td colspan="6" style="text-align:center; padding:20px; color:#666;">No students found matching "' + queryText + '"</td></tr>';
    } catch (e) {
        console.error(e);
        t.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Search Error.</td></tr>';
    }
}

async function saveStudentChanges(){
    await updateDoc(doc(db,"students",currentDocId),{ name:document.getElementById('st-name').value });
    UI.alert("Updated!"); loadAllStudents();
}

window.startReturnScanner = function() {
    document.getElementById('return-scanner-container').classList.remove('hidden');
    if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(err => console.error(err));
    html5QrcodeScanner = new Html5QrcodeScanner("return-reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onReturnScanSuccess, (error) => {});
}

async function onReturnScanSuccess(decodedText) {
    if(html5QrcodeScanner) html5QrcodeScanner.clear();
    document.getElementById('return-scanner-container').classList.add('hidden');
    await processReturnBook(decodedText);
}

window.processReturnBook = async function(bookUnitId) {
    if(!bookUnitId) return;
    try {
        const booksRef = collection(db, "books");
        const booksSnap = await getDocs(booksRef);
        let foundBookDoc = null, foundCopyIndex = -1;

        booksSnap.forEach(doc => {
            const data = doc.data();
            if(data.inventory) {
                const idx = data.inventory.findIndex(item => item.id === bookUnitId && item.status === 'issued');
                if(idx !== -1) { foundBookDoc = { ref: doc.ref, data: data }; foundCopyIndex = idx; }
            }
        });

        if(foundBookDoc) {
            const newInventory = [...foundBookDoc.data.inventory];
            newInventory[foundCopyIndex].status = "available";
            newInventory[foundCopyIndex].issuedTo = null;
            await updateDoc(foundBookDoc.ref, { inventory: newInventory });
            
            const reqQ = query(collection(db, "issue_requests"), where("copyId", "==", bookUnitId), where("status", "==", "issued"));
            const reqSnap = await getDocs(reqQ);
            reqSnap.forEach(async (d) => { await updateDoc(d.ref, { status: "returned", returnedAt: serverTimestamp() }); });
            
            notifyUser(DEMO_ADMIN_EMAIL, `Book Returned: ${foundBookDoc.data.title} (Copy: ${bookUnitId})`);
            UI.alert(`RETURN SUCCESSFUL:\n'${foundBookDoc.data.title}' (Copy: ${bookUnitId})`);
            
            if(isAdminMode) updateAdminStats(); else updateStudentStats();
        } else {
            UI.alert(`ERROR: Book Copy '${bookUnitId}' not found, or it was not marked as issued.`);
        }
    } catch(e) { console.error(e); UI.alert("System Error during return."); }
}

window.searchAdminInventory = async function() {
    const queryText = document.getElementById('adminBookSearchInput').value.trim().toLowerCase();
    if (!queryText) {
        loadAdminInventory();
        return;
    }
    const container = document.getElementById('admin-book-list-container');
    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Searching...</p>';
    try {
        const snap = await getDocs(collection(db, "books"));
        let html = `<table class="data-table"><thead><tr><th>ISBN</th><th>Title</th><th>Author</th><th>Copies</th><th>Action</th></tr></thead><tbody>`;
        let found = false;
        snap.forEach(doc => {
            const data = doc.data();
            const book = { id: doc.id, ...data };
            
            const t = data.title ? data.title.toLowerCase() : "";
            const a = data.author ? data.author.toLowerCase() : "";
            const i = data.isbn ? data.isbn.toString().toLowerCase() : "";
            if (t.includes(queryText) || a.includes(queryText) || i.includes(queryText)) {
                found = true;
                const inv = data.inventory || [];
                const available = inv.filter(x => x.status === 'available').length;
                html += `<tr><td>${data.isbn}</td><td>${data.title}</td><td>${data.author}</td><td>${available}/${inv.length}</td><td><button onclick="window.displayBook('${book.id}')" class="main-btn" style="padding:5px;">Edit</button></td></tr>`;
            }
        });
        container.innerHTML = found ? html + "</tbody></table>" : `<p style="padding: 20px; text-align: center; color: #666;">No books found matching "${queryText}"</p>`;
    } catch(e) {
        console.error(e);
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Search Error.</p>';
    }
}

// --- NEW: AI RECOMMENDATION FEATURE ---
window.getSmartRecommendations = async function() {
    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    
    // UI Loading State
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Finding...`;
    btn.disabled = true;

    try {
        // Fetch User History
        const historySnap = await getDocs(query(collection(db, "issue_requests"), where("studentEmail", "==", currentEmail)));
        let pastReads = [];
        historySnap.forEach(doc => pastReads.push(doc.data().bookTitle));
        
        // Get Available Inventory (Now using global cache if available or quick fetch)
        const booksSnap = await getDocs(collection(db, "books"));
        let availableBooksList = [];
        booksSnap.forEach(doc => {
             const d = doc.data();
             if(d.inventory && d.inventory.some(i => i.status === 'available')) {
                 availableBooksList.push(`${d.title} (${d.category})`);
             }
        });

        // Construct AI Prompt
        const prompt = `
        You are a librarian recommendation engine.
        User's Past Reads: [${pastReads.join(", ") || "None yet"}].
        Available Library Books: [${availableBooksList.slice(0, 50).join(", ")}].
        
        TASK: Recommend exactly 3 available books for this user.
        RULES:
        1. If they have no history, suggest 3 popular diverse books (1 tech, 1 fiction, 1 science).
        2. If they have history, suggest based on their taste.
        3. Format: "• **Title**: One sentence reason."
        4. Do not recommend books they have already read.
        `;

        // Call AI
        const result = await model.generateContent(prompt);
        const suggestion = await result.response.text();

        // Display Result
        UI.alert(`
            <div style="text-align:left;">
                <h4 style="color:#4f46e5; margin-bottom:10px;"><i class="fas fa-star"></i> Top Picks For You</h4>
                <div style="font-size:14px; line-height:1.6; color:#475569;">
                    ${suggestion.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}
                </div>
            </div>
        `);

    } catch (e) {
        console.error("AI Error:", e);
        UI.alert("I couldn't generate suggestions right now.");
    }

    btn.innerHTML = originalHTML;
    btn.disabled = false;
};

// ==========================================
// --- CSV UPLOADS & EXPORTS ---
// ==========================================

window.handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Import books from CSV? \n\nRequired Format:\nISBN, Title, Author, Category, BookIDs (comma separated)\n\nExample:\n978-1, Clean Code, Robert M, Tech, \"A1, A2\"")) {
        event.target.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length > 0 && rows[0].toLowerCase().includes('isbn')) {
            rows.shift();
        }

        let successCount = 0;
        let failCount = 0;

        UI.alert(`Processing ${rows.length} books...`);

        for (const row of rows) {
            try {
                const regex = /(?:^|,)(\s*"(?:[^"]|"")*"|[^,]*)/g;
                let cols = [];
                let match;
                while ((match = regex.exec(row)) !== null) {
                    let val = match[1].replace(/^,/, '').trim();
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.slice(1, -1);
                    }
                    cols.push(val);
                }
                
                cols = cols.filter(c => c !== undefined);

                if (cols.length < 5) {
                    console.warn("Skipping invalid row:", row);
                    failCount++;
                    continue;
                }

                const isbn = cols[0];
                const title = cols[1];
                const author = cols[2];
                const category = cols[3];
                const idString = cols[4]; 

                if (!isbn || !title) { failCount++; continue; }

                const inventory = idString.split(',').map(id => ({ 
                    id: id.trim(), 
                    status: 'available', 
                    issuedTo: null 
                })).filter(item => item.id !== "");

                await setDoc(doc(db, "books", isbn), {
                    isbn: isbn,
                    title: title,
                    author: author,
                    category: category,
                    inventory: inventory,
                    totalCopies: inventory.length,
                    pdfUrl: null, 
                    coverUrl: null
                });

                successCount++;
            } catch (err) {
                console.error("Error parsing row:", row, err);
                failCount++;
            }
        }

        event.target.value = ""; 
        UI.alert(`Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        loadAdminInventory();
    };
    
    reader.readAsText(file);
};

window.handleStudentCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Import Students from CSV? \n\nRequired Format:\nRoll, Name, Dept, Sem, Email, Phone\n\nExample:\n101, John Doe, CSE, 3rd, john@iiitmanipur.ac.in, 9876543210")) {
        event.target.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        
        if (rows.length > 0 && (rows[0].toLowerCase().includes('roll') || rows[0].toLowerCase().includes('email'))) {
            rows.shift();
        }

        let successCount = 0;
        let failCount = 0;

        UI.alert(`Processing ${rows.length} students...`);

        for (const row of rows) {
            try {
                const cols = row.split(',').map(c => c.trim());

                if (cols.length < 5) { 
                    console.warn("Skipping invalid row:", row);
                    failCount++;
                    continue;
                }

                const roll = cols[0];
                const name = cols[1];
                const dept = cols[2];
                const sem = cols[3];
                const email = cols[4].toLowerCase();
                const phone = cols[5] || ""; 

                if (!email || !email.includes('@')) { failCount++; continue; }

                await setDoc(doc(db, "students", email), {
                    roll: roll,
                    name: name,
                    dept: dept,
                    sem: sem,
                    email: email,
                    phone: phone,
                    books: 0, 
                    fines: 0
                });

                successCount++;
            } catch (err) {
                console.error("Error parsing row:", row, err);
                failCount++;
            }
        }

        event.target.value = ""; 
        UI.alert(`Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        loadAllStudents();
    };
    
    reader.readAsText(file);
};

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

window.saveStudentEdit = saveStudentEdit;
window.toggleAuthMode = toggleAuthMode; window.handleLoginSubmit = handleLoginSubmit; window.verifyOtp = verifyOtp; window.closeOtp = closeOtp; window.logout = logout; window.navigate = navigate;
window.addNewBook = addNewBook; 
window.searchAdminInventory = searchAdminInventory; 
window.showAddBookForm = () => { document.getElementById('add-book-modal').classList.remove('hidden'); }; 
window.hideAddBookForm = () => { document.getElementById('add-book-modal').classList.add('hidden'); };
window.loadAllBooks = loadAllBooks; 
window.addSingleCopy = addSingleCopy; window.closeBookDetails = () => { document.getElementById('edit-book-modal').classList.add('hidden'); };
window.deleteBook = deleteBook;
window.togglePdfInput = (v) => { if(v==='yes') document.getElementById('pdf-url-group').classList.remove('hidden'); };
window.updateBookPDF = () => document.getElementById('update-pdf-input').click();

// --- UPDATED: PDF UPLOAD HANDLER ---
window.handlePDFUpdateUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentBookId) return;

    // UI Feedback
    const btn = document.getElementById('update-pdf-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Uploading...`;
    btn.disabled = true;

    try {
        const path = `pdfs/${currentBookId}_${Date.now()}_${file.name}`;
        const url = await uploadFileToStorage(file, path);
        
        // Update Firestore
        await updateDoc(doc(db, "books", currentBookId), { pdfUrl: url });
        
        UI.alert("PDF Updated Successfully!");
        window.displayBook(currentBookId); // Refresh view
    } catch (e) {
        console.error("PDF Update Error:", e);
        UI.alert("Failed to update PDF.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        event.target.value = "";
    }
};

// --- NEW: TRIGGER COVER INPUT ---
window.updateBookCover = () => document.getElementById('update-cover-input').click();

// --- NEW: HANDLE COVER UPLOAD ---
window.handleCoverUpdateUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentBookId) return;

    // UI Feedback
    const btn = document.getElementById('update-cover-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Uploading...`;
    btn.disabled = true;

    try {
        // Upload to Firebase Storage
        const path = `covers/${currentBookId}_${Date.now()}_${file.name}`;
        const url = await uploadFileToStorage(file, path);
        
        // Update Firestore Document
        await updateDoc(doc(db, "books", currentBookId), { coverUrl: url });
        
        UI.alert("Cover Image Updated Successfully!");
        
        // Refresh the view to verify (re-fetches the book data)
        window.displayBook(currentBookId); 
        
        // Also refresh the main inventory list to show the new thumbnail
        if (typeof loadAdminInventory === 'function') loadAdminInventory();
        
    } catch (e) {
        console.error("Cover Update Error:", e);
        UI.alert("Failed to update Cover.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        event.target.value = ""; // Reset input
    }
};

window.selectSeat = selectSeat; window.confirmSeatBooking = confirmSeatBooking; 
window.openQRScanner = openQRScanner; window.closeQRScanner = closeQRScanner; window.completeQRScan = completeQRScan; window.adminViewSeat = adminViewSeat;
window.showSeatQR = showSeatQR;
window.addNewStudent = addNewStudent; window.searchStudent = searchStudent; window.saveStudentChanges = saveStudentChanges; 
window.showAddForm = () => document.getElementById('add-student-form').classList.remove('hidden'); 
window.hideAddForm = () => document.getElementById('add-student-form').classList.add('hidden'); 
window.toggleEditMode = () => document.getElementById('student-info-card').classList.add('is-editing');
window.handleProfileUpload = handleProfileUpload;
window.openBookRequestModal = openBookRequestModal; window.submitIssueRequest = submitIssueRequest; window.processIssue = processIssue; window.finalizeIssueBook = finalizeIssueBook;
window.adminScanStudentQR = () => {}; window.stopVerifyCamera = () => {};
window.startReturnScanner = startReturnScanner; window.processReturnBook = processReturnBook;
window.toggleChat = toggleChat; window.loadEbooks = loadEbooks; window.toggleNotifications = toggleNotifications; window.handleOverviewSearch = () => navigate('students');
window.initSeatMonitor = () => {};

// ==========================================
// --- ADVANCED AI LIBRARIAN (OMNISCIENT MODE) ---
// ==========================================

// Global caches for AI knowledge
window.aiKnowledge = {
    books: {},       // Stores Title, Author, Category, Stock
    issuedDates: {}, // Stores ISBN -> Array of 'IssuedAt' dates (for prediction)
    userProfile: {}, // Stores current student's Dept, Sem, Name
    siteMap: {       // Guidance for site navigation
        "dashboard": "Overview, Fines, Due Dates",
        "books": "Book Catalog, Search, AI Recommendations",
        "ebooks": "Digital Library, PDF Reading",
        "bookings": "Seat Reservation, Floor Map",
        "feedbacks": "Complaints, Suggestions"
    }
};

// --- 1. INITIALIZE AI CONTEXT (Runs on Login) ---
// Define as standard function FIRST
function initAIContext() {
    console.log("🧠 AI: Initializing Knowledge Base...");

    // A. Live Book Inventory & Stock
    onSnapshot(collection(db, "books"), (snapshot) => {
        window.aiKnowledge.books = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const inventory = data.inventory || [];
            const available = inventory.filter(i => i.status === 'available').length;
            
            window.aiKnowledge.books[doc.id] = {
                title: data.title,
                author: data.author,
                category: data.category,
                isbn: data.isbn,
                stock: available,
                total: inventory.length
            };
        });
    });

    // B. Live Issue Tracking (For Return Prediction)
    const qIssued = query(collection(db, "issue_requests"), where("status", "==", "issued"));
    onSnapshot(qIssued, (snapshot) => {
        window.aiKnowledge.issuedDates = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!window.aiKnowledge.issuedDates[data.bookISBN]) {
                window.aiKnowledge.issuedDates[data.bookISBN] = [];
            }
            if (data.issuedAt) {
                window.aiKnowledge.issuedDates[data.bookISBN].push(data.issuedAt.toDate());
            }
        });
    });

    // C. Capture User Profile from DOM
    setTimeout(() => {
        const deptText = document.getElementById('db-dept') ? document.getElementById('db-dept').innerText : "";
        const nameText = document.getElementById('db-name') ? document.getElementById('db-name').innerText : "Student";
        
        window.aiKnowledge.userProfile = {
            name: nameText.replace("Hello, ", ""),
            rawDetails: deptText 
        };
    }, 3000); 
}

// --- 2. PREDICTIVE LOGIC ---
function getPrediction(isbn) {
    const dates = window.aiKnowledge.issuedDates[isbn];
    if (!dates || dates.length === 0) return "Unknown (Admin copy)";

    const earliestIssue = new Date(Math.min.apply(null, dates));
    const dueDate = new Date(earliestIssue);
    dueDate.setDate(dueDate.getDate() + 30); 

    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Overdue (Should be back any moment)";
    return `In approx ${diffDays} days (${dueDate.toLocaleDateString()})`;
}

// --- 3. CONTEXT BUILDER ---
function buildSystemPrompt(userMsg) {
    const k = window.aiKnowledge;
    const msgLower = userMsg.toLowerCase();

    let relevantBooks = [];
    let isAskingForRecommendation = msgLower.includes("recommend") || msgLower.includes("suggest") || msgLower.includes("read");

    Object.values(k.books).forEach(b => {
        const searchStr = `${b.title} ${b.author} ${b.category}`.toLowerCase();
        
        if (searchStr.includes(msgLower) || isAskingForRecommendation) {
            let status = `${b.stock} copies available.`;
            
            if (b.stock === 0) {
                const predictedReturn = getPrediction(b.isbn);
                status = `OUT OF STOCK. Expected back: ${predictedReturn}.`;
            }
            relevantBooks.push(`- "${b.title}" (${b.author}) [${b.category}]: ${status}`);
        }
    });

    const bookContext = relevantBooks.slice(0, 15).join("\n") || "No specific books matched this query.";

    return `
    You are the AI Librarian for 'Shelf Sense'.
    
    === USER PROFILE ===
    Name: ${k.userProfile.name}
    Academic Details: ${k.userProfile.rawDetails || "Unknown"}
    (Use this to personalize book recommendations. e.g., If CSE, suggest programming books.)

    === SITE NAVIGATION (GUIDE THE USER) ===
    - To borrow books: Go to 'Books' section.
    - To read online: Go to 'E-Books' section.
    - To book a desk: Go to 'Seat Reservation'.
    - To check fines: Go to 'Dashboard'.
    
    === LIBRARY RULES ===
    - Open: 9 AM - 5 PM (Mon-Sat).
    - Loan Period: 30 Days.
    - Fine: ₹50/day after due date.
    
    === REAL-TIME BOOK STATUS & PREDICTIONS ===
    ${bookContext}

    === YOUR INSTRUCTIONS ===
    1. **Personalize**: If they mention exams/studies, recommend books from the list above matching their Dept.
    2. **Predict**: If a book is Out of Stock, use the "Expected back" data provided above to tell them when to come back.
    3. **Guide**: If they ask "How do I...", tell them which tab to click.
    4. **Tone**: Helpful, Academic, yet friendly.
    
    User Query: ${userMsg}
    Answer:
    `;
}

// --- 4. CHAT HANDLER ---
// Defined locally first to avoid ReferenceError
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('chat-messages');
    chatBody.innerHTML += `<div class="chat-bubble user">${msg}</div>`;
    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
    
    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" class="chat-bubble bot"><i class="fas fa-circle-notch fa-spin"></i> Thinking...</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const systemPrompt = buildSystemPrompt(msg);
        const result = await model.generateContent(systemPrompt);
        const aiResponse = await result.response.text();
        
        document.getElementById(loadingId).remove();
        
        let formatted = aiResponse
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
            .replace(/\n/g, '<br>');

        chatBody.innerHTML += `<div class="chat-bubble bot">${formatted}</div>`;
        
    } catch (e) { 
        console.error("AI Error:", e);
        document.getElementById(loadingId).innerText = "My brain is offline (Connection Error)."; 
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Defined locally
function handleChatKey(e) { 
    if (e.key === 'Enter') sendChatMessage(); 
}

// --- 5. EXPOSE TO WINDOW ---
window.initAIContext = initAIContext;
window.sendChatMessage = sendChatMessage;
window.handleChatKey = handleChatKey;

// Ensure initAIContext is called when Dashboard loads
const originalShowDashboard = window.showDashboard;
window.showDashboard = async function() {
    await originalShowDashboard();
    window.initAIContext(); 
};
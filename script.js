import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBJqolB9FP0aNgdXE9lD4oB2Hyidm9Z-s8",
    authDomain: "xpensewise-dfc68.firebaseapp.com",
    databaseURL: "https://xpensewise-dfc68-default-rtdb.firebaseio.com",
    projectId: "xpensewise-dfc68",
    storageBucket: "xpensewise-dfc68.firebasestorage.app",
    messagingSenderId: "439860721790",
    appId: "1:439860721790:web:af0bd8a046c357f38ec02f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const ADMIN_UID = "cKGUMlXFhPTmwgM6CKbpUxMS0fI3";
const GEMINI_KEY = "AIzaSyACHJBLDjn72wZDt_Z1LzPGXuAnNG3Fo8U";
const BUDGET_LIMIT = 50000;

let transactions = [];
let currentPath = "";
let myChart = null;
let user = null;

const $ = id => document.getElementById(id);
const formatMoney = amt => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt).replace('₹', '₹ ');

// --- AUTH ---
onAuthStateChanged(auth, (u) => {
    user = u;
    if (u) {
        $('login-modal').classList.add('hidden');
        currentPath = (u.uid === ADMIN_UID) ? 'transactions' : `users/${u.uid}/transactions`;
        
        onValue(ref(db, currentPath), snap => {
            const data = snap.val();
            transactions = data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
            renderUI();
        });
    } else {
        $('login-modal').classList.remove('hidden');
    }
});

$('auth-login-btn').onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value);
    } catch (e) { $('auth-error').innerText = "❌ " + e.message; }
};

$('auth-up-btn').onclick = async () => {
    try {
        await createUserWithEmailAndPassword(auth, $('login-email').value, $('login-pass').value);
        alert("Account Created!");
    } catch (e) { $('auth-error').innerText = "❌ " + e.message; }
};

// --- CORE LOGIC ---
const renderUI = () => {
    const sorted = [...transactions].sort((a,b) => b.date - a.date);
    const stats = getStats();
    
    $('total-balance').innerText = formatMoney(stats.total);

    $('ledger-list').innerHTML = sorted.map(t => `
        <div class="ledger-item">
            <div class="icon-circle ${t.type === 'income' ? 'inflow-style' : 'outflow-style'}">
                <i class="fas ${t.type === 'income' ? 'fa-plus' : 'fa-minus'}"></i>
            </div>
            <div style="min-width: 0;">
                <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.category}</strong>
                <small style="color: var(--text-dim)">${new Date(t.date).toLocaleDateString()}</small>
            </div>
            <div style="font-weight: 800; color: ${t.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)'}">
                ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
            </div>
            <button class="del-btn" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('') || '<div style="text-align:center; padding:50px; opacity:0.3;">READY FOR LOGS...</div>';

    // Add event listeners to delete buttons
    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = () => deleteEntry(btn.getAttribute('data-id'));
    });

    $('sidebar-list').innerHTML = sorted.slice(0, 5).map(t => `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:0.85rem;">
            <span>${t.category}</span>
            <strong style="color: ${t.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)'}">${formatMoney(t.amount)}</strong>
        </div>
    `).join('');

    updateVisuals(stats);
};

const getStats = () => {
    const total = transactions.reduce((s, t) => t.type === 'income' ? s + Number(t.amount) : s - Number(t.amount), 0);
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    
    const curMonth = new Date().getMonth();
    const monthlySpend = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === curMonth)
        .reduce((s, t) => s + Number(t.amount), 0);

    return { total, income, expense, monthlySpend };
};

const updateVisuals = (stats) => {
    const ctx = $('analyticsChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [stats.income, stats.expense],
                backgroundColor: ['#a855f7', '#f59e0b'],
                borderColor: 'transparent'
            }]
        },
        options: { 
            plugins: { legend: { display: false } }, 
            cutout: '80%', 
            responsive: true,
            maintainAspectRatio: false
        }
    });

    const percent = Math.min(100, Math.floor((stats.monthlySpend / BUDGET_LIMIT) * 100));
    const bar = $('budget-bar');
    bar.style.width = percent + '%';
    bar.className = (percent > 85) ? 'danger' : (percent > 60) ? 'warning' : 'safe';
    $('budget-percent').innerText = percent + '%';
    $('budget-status').innerText = `${formatMoney(stats.monthlySpend)} spent of ${formatMoney(BUDGET_LIMIT)} limit`;
};

// --- ACTIONS ---
$('submit-btn').onclick = async () => {
    const amt = parseFloat($('amount').value);
    const cat = $('sub-category').value.trim();
    if (user && amt > 0 && cat) {
        await push(ref(db, currentPath), {
            type: $('trans-type').value,
            category: cat,
            amount: amt,
            date: Date.now()
        });
        $('amount').value = ''; $('sub-category').value = '';
    }
};

const deleteEntry = id => confirm('Delete record?') && remove(ref(db, `${currentPath}/${id}`));

// --- AI ASSISTANT ---
async function callAI(query) {
    const stats = getStats();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    const payload = {
        contents: [{ parts: [{ text: `User Balance: ${stats.total}. Recent Logs: ${JSON.stringify(transactions.slice(0,5))}. User Query: ${query}` }] }],
        systemInstruction: { parts: [{ text: "You are XpenseWise Strategic AI. Be professional, very concise (max 2 sentences). Always use ₹ currency format." }] }
    };

    try {
        const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || "Strategic engine is recharging. Try again later.";
    } catch (e) { return "Connection timeout."; }
}

const assistant = {
    toggle: () => $('chat-window').classList.toggle('open'),
    send: async (q = null) => {
        const txt = q || $('chat-input').value.trim();
        if (!txt) return;
        
        if (!q) {
            const uMsg = document.createElement('div'); uMsg.className = 'msg user'; uMsg.innerText = txt;
            $('chat-body').appendChild(uMsg);
        }
        
        $('chat-input').value = '';
        const bMsg = document.createElement('div'); bMsg.className = 'msg bot'; bMsg.innerText = 'Thinking...';
        $('chat-body').appendChild(bMsg);
        $('chat-body').scrollTop = $('chat-body').scrollHeight;

        const response = await callAI(txt);
        bMsg.innerText = response;
        $('chat-body').scrollTop = $('chat-body').scrollHeight;
    }
};

$('chat-toggle').onclick = assistant.toggle;
$('chat-close').onclick = assistant.toggle;
$('chat-send').onclick = () => assistant.send();
$('ai-analyze-btn').onclick = () => { if (!$('chat-window').classList.contains('open')) assistant.toggle(); assistant.send("Strategic analysis please."); };

// --- UTILS ---
$('theme-toggle').onclick = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
};

$('exit-btn').onclick = () => {
    signOut(auth).then(() => {
        $('exit-overlay').classList.remove('hidden');
        setTimeout(() => location.reload(), 2000);
    });
};

const cats = {
    income: ['Salary', 'Freelance', 'Bonus', 'Dividend', 'Rent'],
    expense: ['Rent', 'Groceries', 'Transport', 'Dining', 'Shopping', 'Health', 'Bills']
};

$('trans-type').onchange = () => {
    $('cat-list').innerHTML = cats[$('trans-type').value].map(c => `<option value="${c}">`).join('');
};

window.onload = () => {
    $('trans-type').onchange();
    setTimeout(() => $('welcome-overlay').classList.add('hidden'), 1500);
};
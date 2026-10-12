const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Create/open our database
const db = new Database("savings.db");

// ===============================
// TABLES
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        note TEXT
    )
`).run();

db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        savings_goal REAL NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL
    )
`);

// NEW: Pending deposits table
db.exec(`
    CREATE TABLE IF NOT EXISTS pending_savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
    )
`);

// NEW: Bank details table
db.exec(`
    CREATE TABLE IF NOT EXISTS bank_details (
        id INTEGER PRIMARY KEY,
        bank_name TEXT,
        account_name TEXT,
        account_number TEXT
    )
`);

// Create default admin
const existingAdmin = db.prepare(`
    SELECT * FROM members WHERE username = 'admin'
`).get();

if (!existingAdmin) {
    db.prepare(`
        INSERT INTO members (name, username, password, role, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run("Administrator", "admin", "admin123", "admin", new Date().toISOString());
}

// Create existing family members
const defaultMembers = [
    ["Dad", "dad", "dad123"],
    ["Mum", "mum", "mum123"],
    ["Brown", "brown", "brown123"]
];

for (const member of defaultMembers) {
    const existingMember = db.prepare(`
        SELECT * FROM members WHERE username = ?
    `).get(member[1]);

    if (!existingMember) {
        db.prepare(`
            INSERT INTO members (name, username, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(member[0], member[1], member[2], "member", new Date().toISOString());
    }
}

// Default goal
const existingGoal = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();
if (!existingGoal) {
    db.prepare(`INSERT INTO settings (id, savings_goal) VALUES (1, 500000)`).run();
}

// Default bank details (you can change later from admin)
const existingBank = db.prepare(`SELECT * FROM bank_details WHERE id = 1`).get();
if (!existingBank) {
    db.prepare(`
        INSERT INTO bank_details (id, bank_name, account_name, account_number)
        VALUES (1, 'Your Bank Name', 'Family Savings Account', '0000000000')
    `).run();
}

app.use(express.json());
app.use(cors());
app.use(express.static("."));

// ===============================
// SAVINGS
// ===============================

app.get("/api/savings", (req, res) => {
    const savings = db.prepare(`SELECT * FROM savings ORDER BY id DESC`).all();
    res.json(savings);
});

app.post("/api/savings", (req, res) => {
    const { member, amount, date, note } = req.body;

    if (!member || !amount || !date) {
        return res.status(400).json({ error: "Member, amount and date are required" });
    }

    const result = db.prepare(`
        INSERT INTO savings (member, amount, date, note)
        VALUES (?, ?, ?, ?)
    `).run(member, Number(amount), date, note || "");

    res.json({ success: true, id: result.lastInsertRowid });
});

app.put("/api/savings/:id", (req, res) => {
    const id = Number(req.params.id);
    const { amount, date, note } = req.body;

    if (!id || !amount || !date) {
        return res.status(400).json({ error: "Amount and date are required" });
    }

    const result = db.prepare(`
        UPDATE savings SET amount = ?, date = ?, note = ? WHERE id = ?
    `).run(Number(amount), date, note || "Savings deposit", id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ success: true });
});

app.delete("/api/savings/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
        return res.status(400).json({ error: "Invalid transaction ID" });
    }

    const result = db.prepare(`DELETE FROM savings WHERE id = ?`).run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ success: true });
});

// ===============================
// GOAL
// ===============================

app.get("/api/goal", (req, res) => {
    const setting = db.prepare(`SELECT savings_goal FROM settings WHERE id = 1`).get();
    res.json({ goal: setting.savings_goal });
});

app.put("/api/goal", (req, res) => {
    const goal = Number(req.body.goal);

    if (!goal || goal <= 0) {
        return res.status(400).json({ error: "Invalid savings goal" });
    }

    db.prepare(`UPDATE settings SET savings_goal = ? WHERE id = 1`).run(goal);
    res.json({ success: true, goal: goal });
});

// ===============================
// BANK DETAILS
// ===============================

app.get("/api/bank-details", (req, res) => {
    const bank = db.prepare(`SELECT * FROM bank_details WHERE id = 1`).get();
    res.json(bank || {});
});

app.put("/api/bank-details", (req, res) => {
    const { bank_name, account_name, account_number } = req.body;

    if (!bank_name || !account_name || !account_number) {
        return res.status(400).json({ error: "All bank details are required" });
    }

    db.prepare(`
        UPDATE bank_details
        SET bank_name = ?, account_name = ?, account_number = ?
        WHERE id = 1
    `).run(bank_name, account_name, account_number);

    res.json({ success: true });
});

// ===============================
// PENDING SAVINGS (NEW)
// ===============================

// Create pending deposit
app.post("/api/pending-savings", (req, res) => {
    const { member, amount, date, note } = req.body;

    if (!member || !amount || !date) {
        return res.status(400).json({ error: "Member, amount and date are required" });
    }

    const result = db.prepare(`
        INSERT INTO pending_savings (member, amount, date, note, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(member, Number(amount), date, note || "Bank transfer", new Date().toISOString());

    res.json({ success: true, id: result.lastInsertRowid });
});

// Get all pending deposits
app.get("/api/pending-savings", (req, res) => {
    const pending = db.prepare(`
        SELECT * FROM pending_savings
        WHERE status = 'pending'
        ORDER BY id DESC
    `).all();

    res.json(pending);
});

// Confirm a pending deposit → move to real savings
app.put("/api/pending-savings/:id/confirm", (req, res) => {
    const id = Number(req.params.id);

    const pending = db.prepare(`SELECT * FROM pending_savings WHERE id = ?`).get(id);

    if (!pending) {
        return res.status(404).json({ error: "Pending deposit not found" });
    }

    // Add to real savings
    db.prepare(`
        INSERT INTO savings (member, amount, date, note)
        VALUES (?, ?, ?, ?)
    `).run(pending.member, pending.amount, pending.date, pending.note || "Bank transfer (confirmed)");

    // Mark as confirmed (or delete)
    db.prepare(`UPDATE pending_savings SET status = 'confirmed' WHERE id = ?`).run(id);

    res.json({ success: true });
});

// Reject a pending deposit
app.put("/api/pending-savings/:id/reject", (req, res) => {
    const id = Number(req.params.id);

    const result = db.prepare(`
        UPDATE pending_savings SET status = 'rejected' WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Pending deposit not found" });
    }

    res.json({ success: true });
});

// ===============================
// MEMBERS
// ===============================

app.post("/api/members", (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ error: "Name, username and password are required" });
    }

    try {
        const existingMember = db.prepare(`SELECT * FROM members WHERE username = ?`).get(username);

        if (existingMember) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const result = db.prepare(`
            INSERT INTO members (name, username, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, username, password, "member", new Date().toISOString());

        res.json({ success: true, memberId: result.lastInsertRowid });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create member" });
    }
});

app.get("/api/members", (req, res) => {
    try {
        const members = db.prepare(`
            SELECT id, name, username, role, created_at
            FROM members ORDER BY id ASC
        `).all();
        res.json(members);
    } catch (error) {
        console.error("Error loading members:", error);
        res.status(500).json({ error: "Failed to load family members" });
    }
});

app.delete("/api/members/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
        return res.status(400).json({ error: "Invalid member ID" });
    }

    try {
        const member = db.prepare(`
            SELECT id, name, username, role FROM members WHERE id = ?
        `).get(id);

        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        if (member.role === "admin") {
            return res.status(403).json({ error: "Administrator account cannot be removed" });
        }

        db.prepare(`DELETE FROM members WHERE id = ?`).run(id);

        res.json({ success: true, message: `${member.name} has been removed` });

    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ error: "Failed to remove member" });
    }
});

// ===============================
// LOGIN
// ===============================

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    const member = db.prepare(`
        SELECT id, name, username, role
        FROM members
        WHERE username = ? AND password = ?
    `).get(username, password);

    if (!member) {
        return res.status(401).json({ error: "Incorrect username or password" });
    }

    res.json({ success: true, member: member });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
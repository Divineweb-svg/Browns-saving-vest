// ==========================================
// BROWN'S SAVING VEST - MAIN SCRIPT
// ==========================================


// ==========================================
// ELEMENTS
// ==========================================
// New elements for pending system
const continueSavingsButton = document.getElementById("continueSavingsButton");
const confirmTransferButton = document.getElementById("confirmTransferButton");
const backToStep1Button = document.getElementById("backToStep1Button");
const savingsStep1 = document.getElementById("savingsStep1");
const savingsStep2 = document.getElementById("savingsStep2");
const pendingList = document.getElementById("pendingList");
const saveBankDetailsButton = document.getElementById("saveBankDetailsButton");

const startButton = document.getElementById("startButton");
const welcomeSection = document.getElementById("welcomeSection");
const loginSection = document.getElementById("loginSection");
const loginForm = document.getElementById("loginForm");
const dashboardSection = document.getElementById("dashboardSection");
const loginMessage = document.getElementById("loginMessage");

const adminDashboard = document.getElementById("adminDashboard");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const addSavingsButton = document.getElementById("addSavingsButton");
const savingsForm = document.getElementById("savingsForm");
const cancelSavingsButton = document.getElementById("cancelSavingsButton");
const saveMoneyButton = document.getElementById("saveMoneyButton");

const totalSavingsDisplay = document.getElementById("totalSavings");
const mySavingsDisplay = document.getElementById("mySavings");
const transactionList = document.getElementById("transactionList");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const logoutButton = document.getElementById("logoutButton");

// ==========================================
// SAVINGS GOAL
// ==========================================

let savingsGoal = 500000;
let loggedInUser = "";

const changeGoalButton = document.getElementById("changeGoalButton");
const savingsGoalDisplay = document.getElementById("savingsGoalDisplay");


// ==========================================
// GET STARTED
// ==========================================

if (startButton) {
    startButton.addEventListener("click", function () {
        welcomeSection.style.display = "none";
        loginSection.style.display = "block";
    });
}


// ==========================================
// DATABASE LOGIN
// ==========================================

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const usernameElement = document.getElementById("username");
        const passwordElement = document.getElementById("password");

        const username = usernameElement ? usernameElement.value.trim() : "";
        const password = passwordElement ? passwordElement.value : "";

        if (!username || !password) {
            alert("Please enter your username and password.");
            return;
        }

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Incorrect username or password.");
                return;
            }

            // Save logged-in member
            localStorage.setItem("loggedInMember", JSON.stringify(data.member));
            loggedInUser = data.member.name;

            // =================================
            // ADMIN LOGIN
            // =================================
            if (data.member.role === "admin") {
    loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "none";
    if (adminDashboard) adminDashboard.style.display = "block";

    await loadGoal();
    await loadSavings();
    await loadFamilyMembers();
    await loadSavingsMembers();
    await loadPendingDeposits();   // ← ADD THIS
    await loadBankDetails();       // ← ADD THIS
    return;
}

            // =================================
            // FAMILY MEMBER LOGIN
            // =================================
            loginSection.style.display = "none";
            if (adminDashboard) adminDashboard.style.display = "none";
            if (dashboardSection) dashboardSection.style.display = "block";

            await loadGoal();
            await loadSavings();
            await loadDashboardFamilyMembers();
            await loadSavingsMembers();
            await loadBankDetails();

        } catch (error) {
            console.error("Login error:", error);
            alert("Could not connect to the server.");
        }
    });
}


// ==========================================
// LOAD SAVINGS GOAL
// ==========================================

async function loadGoal() {
    try {
        const response = await fetch("/api/goal");

        if (!response.ok) {
            throw new Error("Could not load savings goal");
        }

        const data = await response.json();
        savingsGoal = Number(data.goal);

        if (savingsGoalDisplay) {
            savingsGoalDisplay.textContent =
                "₦" +
                savingsGoal.toLocaleString("en-NG", {
                    minimumFractionDigits: 0
                });
        }
    } catch (error) {
        console.error("Error loading savings goal:", error);
    }
}


// ==========================================
// CHANGE SAVINGS GOAL
// ==========================================

if (changeGoalButton) {
    changeGoalButton.addEventListener("click", async function () {
        const newGoal = prompt("Enter your new savings goal:");

        if (newGoal === null) return;

        const goal = Number(newGoal);

        if (!goal || goal <= 0) {
            alert("Please enter a valid goal amount.");
            return;
        }

        try {
            const response = await fetch("/api/goal", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ goal: goal })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Could not update goal.");
                return;
            }

            savingsGoal = Number(data.goal);

            if (savingsGoalDisplay) {
                savingsGoalDisplay.textContent =
                    "₦" +
                    savingsGoal.toLocaleString("en-NG", {
                        minimumFractionDigits: 0
                    });
            }

            await loadSavings();
            alert("Savings goal updated successfully! ✅");

        } catch (error) {
            console.error("Error updating goal:", error);
            alert("Could not connect to the server.");
        }
    });
}


// ==========================================
// OPEN / CLOSE SAVINGS FORM
// ==========================================

if (addSavingsButton) {
    addSavingsButton.addEventListener("click", function () {
        savingsForm.style.display = "block";
        savingsStep1.style.display = "block";
        savingsStep2.style.display = "none";
        loadSavingsMembers();

        // Automatically set date to today
        const dateInput = document.getElementById("savingDate");
        if (dateInput) {
            const today = new Date().toISOString().split("T")[0];
            dateInput.value = today;
        }
    });
}

if (cancelSavingsButton) {
    cancelSavingsButton.addEventListener("click", function () {
        savingsForm.style.display = "none";
        savingsStep1.style.display = "block";
        savingsStep2.style.display = "none";

        // Clear the form
        document.getElementById("memberName").value = "";
        document.getElementById("savingAmount").value = "";
        document.getElementById("savingDate").value = "";
        document.getElementById("savingNote").value = "";
    });
}


// ==========================================
// SAVE DEPOSIT
// ==========================================

if (saveMoneyButton) {
    saveMoneyButton.addEventListener("click", async function () {
        const memberName = document.getElementById("memberName").value;
        const amount = Number(document.getElementById("savingAmount").value);
        const date = document.getElementById("savingDate").value;
        const note = document.getElementById("savingNote").value.trim();

        if (memberName === "") {
            alert("Please select a family member.");
            return;
        }

        if (!amount || amount <= 0) {
            alert("Please enter a valid savings amount.");
            return;
        }

        if (date === "") {
            alert("Please select a date.");
            return;
        }

        try {
            const response = await fetch("/api/savings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    member: memberName,
                    amount: amount,
                    date: date,
                    note: note || "Savings deposit"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Could not save deposit.");
                return;
            }

            alert("Savings saved successfully! ✅");

            document.getElementById("memberName").value = "";
            document.getElementById("savingAmount").value = "";
            document.getElementById("savingDate").value = "";
            document.getElementById("savingNote").value = "";
            savingsForm.style.display = "none";

            await loadSavings();
            await loadDashboardFamilyMembers();

        } catch (error) {
            console.error("Error saving deposit:", error);
            alert("Could not connect to the database server.");
        }
    });
}


// ==========================================
// LOAD SAVINGS (FIXED & COMPLETE)
// ==========================================

async function loadSavings() {
    try {
        const response = await fetch("/api/savings");

        if (!response.ok) {
            throw new Error("Could not load savings");
        }

        const transactions = await response.json();

        let totalSavings = 0;
        let mySavings = 0;

        // Clear old transactions
        if (transactionList) {
            transactionList.innerHTML = "";
        }

        // Group savings by member name (dynamic)
        const memberTotals = {};

        transactions.forEach(function (transaction) {
            const amount = Number(transaction.amount);
            totalSavings += amount;

            const memberKey = String(transaction.member).toLowerCase();

            if (!memberTotals[memberKey]) {
                memberTotals[memberKey] = { total: 0, deposits: 0, name: transaction.member };
            }
            memberTotals[memberKey].total += amount;
            memberTotals[memberKey].deposits += 1;

            if (memberKey === loggedInUser.toLowerCase()) {
                mySavings += amount;
            }

            // Show transaction
            if (transactionList) {
                const transactionElement = document.createElement("div");
                transactionElement.classList.add("transaction");

                transactionElement.innerHTML = `
                    <div class="transaction-name">${transaction.member}</div>
                    <div class="transaction-details">
                        ${transaction.date} — ${transaction.note || "Savings deposit"}
                    </div>
                    <div class="transaction-amount">
                        + ₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </div>
                    <button class="edit-transaction-button" data-id="${transaction.id}">Edit</button>
                    <button class="delete-transaction-button" data-id="${transaction.id}">Delete</button>
                `;

                transactionList.appendChild(transactionElement);
            }
        });

        // Total Savings
        if (totalSavingsDisplay) {
            totalSavingsDisplay.textContent =
                "₦" + totalSavings.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        }

        // My Savings
        if (mySavingsDisplay) {
            mySavingsDisplay.textContent =
                "₦" + mySavings.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        }

        // Update individual member cards if they exist (dad/mum/brown etc.)
        Object.keys(memberTotals).forEach(key => {
            const el = document.getElementById(key + "Savings");
            if (el) {
                const data = memberTotals[key];
                el.textContent =
                    "₦" + data.total.toLocaleString("en-NG", { minimumFractionDigits: 2 }) +
                    " • " + data.deposits + (data.deposits === 1 ? " deposit" : " deposits");
            }
        });

        // Goal section
        const remaining = Math.max(savingsGoal - totalSavings, 0);

        const goalSaved = document.getElementById("goalSaved");
        const goalRemaining = document.getElementById("goalRemaining");

        if (goalSaved) {
            goalSaved.textContent =
                "₦" + totalSavings.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        }

        if (goalRemaining) {
            goalRemaining.textContent =
                "₦" + remaining.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        }

        const goalMessage = document.getElementById("goalMessage");
        if (goalMessage) {
            if (totalSavings >= savingsGoal) {
                goalMessage.textContent = "🎉 Savings goal reached!";
            } else {
                goalMessage.textContent = "Keep saving — you're getting closer! 💪";
            }
        }

        // Progress bar
        let progress = (totalSavings / savingsGoal) * 100;
        if (progress > 100) progress = 100;
        if (progress < 0) progress = 0;

        if (progressBar) progressBar.style.width = progress + "%";
        if (progressText) progressText.textContent = Math.round(progress) + "% completed";

        const goalPercentage = document.getElementById("goalPercentage");
        if (goalPercentage) {
            goalPercentage.textContent = Math.round(progress) + "% of goal";
        }

        // Savings Report
        const reportDepositCount = document.getElementById("reportDepositCount");
        if (reportDepositCount) {
            reportDepositCount.textContent = transactions.length;
        }

        // Dynamic report for any members
        Object.keys(memberTotals).forEach(key => {
            const reportEl = document.getElementById("report" + key.charAt(0).toUpperCase() + key.slice(1) + "Savings");
            if (reportEl) {
                reportEl.textContent =
                    "₦" + memberTotals[key].total.toLocaleString("en-NG", { minimumFractionDigits: 2 });
            }
        });

    } catch (error) {
        console.error("Error loading savings:", error);
        if (transactionList) {
            transactionList.innerHTML = '<p class="no-transactions">Could not load savings.</p>';
        }
    }
}


// ==========================================
// LOAD MEMBERS INTO SAVINGS DROPDOWN
// ==========================================

async function loadSavingsMembers() {
    const select = document.getElementById("memberName");
    if (!select) return;

    // Remember what the user currently selected
    const currentlySelected = select.value;

    try {
        const response = await fetch("/api/members");
        if (!response.ok) throw new Error("Could not load members");

        const members = await response.json();
        const familyMembers = members.filter(m => m.role === "member");

        // Rebuild the options
        select.innerHTML = `<option value="">Select family member</option>`;

        familyMembers.forEach(member => {
            const option = document.createElement("option");
            option.value = member.name;
            option.textContent = member.name;
            select.appendChild(option);
        });

        // Put back the selection the user made
        if (currentlySelected) {
            select.value = currentlySelected;
        }

    } catch (error) {
        console.error("Error loading savings members:", error);
    }
}

// ==========================================
// DELETE TRANSACTION
// ==========================================

document.addEventListener("click", async function (event) {
    if (!event.target.classList.contains("delete-transaction-button")) return;

    const id = event.target.dataset.id;
    const confirmDelete = confirm("Are you sure you want to delete this savings transaction?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`/api/savings/${id}`, { method: "DELETE" });
        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not delete transaction.");
            return;
        }

        alert("Transaction deleted successfully! ✅");
        await loadSavings();
        await loadDashboardFamilyMembers();

    } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Could not connect to the database server.");
    }
});


// ==========================================
// EDIT TRANSACTION
// ==========================================

document.addEventListener("click", async function (event) {
    if (!event.target.classList.contains("edit-transaction-button")) return;

    const id = event.target.dataset.id;

    const newAmount = prompt("Enter the new amount:");
    if (newAmount === null) return;

    const amount = Number(newAmount);
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const newDate = prompt("Enter the new date (YYYY-MM-DD):");
    if (newDate === null || newDate.trim() === "") return;

    const newNote = prompt("Enter the new note:");
    if (newNote === null) return;

    try {
        const response = await fetch(`/api/savings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: amount,
                date: newDate,
                note: newNote
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not edit transaction.");
            return;
        }

        alert("Transaction updated successfully! ✅");
        await loadSavings();
        await loadDashboardFamilyMembers();

    } catch (error) {
        console.error("Error editing transaction:", error);
        alert("Could not connect to the database server.");
    }
});


// ==========================================
// LOAD FAMILY MEMBERS (ADMIN)
// ==========================================

async function loadFamilyMembers() {
    const memberList = document.getElementById("memberList");
    if (!memberList) return;

    try {
        const response = await fetch("/api/members");
        if (!response.ok) throw new Error("Could not load members");

        const members = await response.json();
        const familyMembers = members.filter(member => member.role === "member");

        if (familyMembers.length === 0) {
            memberList.innerHTML = "<p>No family members found.</p>";
            return;
        }

        memberList.innerHTML = "";

        familyMembers.forEach(member => {
            const row = document.createElement("div");
            row.className = "member-row";

            row.innerHTML = `
                <div>
                    <strong>${member.name}</strong>
                    <small>Username: ${member.username}</small>
                </div>
                <button class="remove-member-button" data-id="${member.id}" data-name="${member.name}">
                    Remove
                </button>
            `;

            memberList.appendChild(row);
        });

        const adminMemberCount = document.getElementById("adminMemberCount");
        if (adminMemberCount) {
            adminMemberCount.textContent = familyMembers.length;
        }

        // Remove buttons
        document.querySelectorAll(".remove-member-button").forEach(button => {
            button.addEventListener("click", async () => {
                const id = button.dataset.id;
                const name = button.dataset.name;

                const confirmed = confirm(`Are you sure you want to remove ${name}?`);
                if (!confirmed) return;

                try {
                    const response = await fetch(`/api/members/${id}`, { method: "DELETE" });
                    const data = await response.json();

                    if (!response.ok) {
                        alert(data.error || "Could not remove member.");
                        return;
                    }

                    alert(`${name} has been removed successfully.`);
                    await loadFamilyMembers();
                    await loadSavingsMembers();
                    await loadDashboardFamilyMembers();

                } catch (error) {
                    console.error("Remove member error:", error);
                    alert("Could not connect to the server.");
                }
            });
        });

    } catch (error) {
        console.error("LOAD MEMBERS ERROR:", error);
        memberList.innerHTML = "<p>Error loading family members.</p>";
    }
}


// ==========================================
// ADMIN DASHBOARD UPDATE
// ==========================================

async function updateAdminDashboard() {
    try {
        const savingsResponse = await fetch("/api/savings");
        if (!savingsResponse.ok) throw new Error("Could not load savings");

        const transactions = await savingsResponse.json();
        let total = 0;
        transactions.forEach(t => total += Number(t.amount));

        const adminTotalSavings = document.getElementById("adminTotalSavings");
        if (adminTotalSavings) {
            adminTotalSavings.textContent =
                "₦" + total.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        }

        const adminSavingsGoal = document.getElementById("adminSavingsGoal");
        if (adminSavingsGoal) {
            adminSavingsGoal.textContent =
                "₦" + Number(savingsGoal).toLocaleString("en-NG", { minimumFractionDigits: 0 });
        }

        await loadFamilyMembers();

    } catch (error) {
        console.error("Error loading admin dashboard:", error);
    }
}


// ==========================================
// ADMIN LOGOUT
// ==========================================

if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", function () {
        if (adminDashboard) adminDashboard.style.display = "none";
        welcomeSection.style.display = "none";
        loginSection.style.display = "block";

        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        loggedInUser = "";
    });
}


// ==========================================
// NORMAL LOGOUT
// ==========================================

if (logoutButton) {
    logoutButton.addEventListener("click", function () {
        dashboardSection.style.display = "none";
        if (adminDashboard) adminDashboard.style.display = "none";
        welcomeSection.style.display = "none";
        loginSection.style.display = "block";

        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        loggedInUser = "";
    });
}


// ==========================================
// CREATE FAMILY MEMBER
// ==========================================

const addMemberButton = document.getElementById("addMemberButton");
const addMemberForm = document.getElementById("addMemberForm");
const saveMemberButton = document.getElementById("saveMemberButton");
const cancelMemberButton = document.getElementById("cancelMemberButton");

if (addMemberButton) {
    addMemberButton.addEventListener("click", () => {
        addMemberForm.style.display = "block";
    });
}

if (cancelMemberButton) {
    cancelMemberButton.addEventListener("click", () => {
        addMemberForm.style.display = "none";
        document.getElementById("newMemberName").value = "";
        document.getElementById("newMemberUsername").value = "";
        document.getElementById("newMemberPassword").value = "";
    });
}

if (saveMemberButton) {
    saveMemberButton.addEventListener("click", async () => {
        const name = document.getElementById("newMemberName").value.trim();
        const username = document.getElementById("newMemberUsername").value.trim();
        const password = document.getElementById("newMemberPassword").value;

        if (!name || !username || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Failed to create member.");
                return;
            }

            alert("Family member created successfully!");

            document.getElementById("newMemberName").value = "";
            document.getElementById("newMemberUsername").value = "";
            document.getElementById("newMemberPassword").value = "";
            addMemberForm.style.display = "none";

            await loadFamilyMembers();
            await loadSavingsMembers();
            await updateAdminDashboard();
            await loadDashboardFamilyMembers();

        } catch (error) {
            console.error(error);
            alert("Could not connect to the server.");
        }
    });
}


// ==========================================
// FAMILY MEMBERS ON MEMBER DASHBOARD
// ==========================================

async function loadDashboardFamilyMembers() {
    const container = document.getElementById("dashboardFamilyMembers");
    if (!container) return;

    try {
        const [membersResponse, savingsResponse] = await Promise.all([
            fetch("/api/members"),
            fetch("/api/savings")
        ]);

        if (!membersResponse.ok || !savingsResponse.ok) {
            throw new Error("Could not load family data");
        }

        const members = await membersResponse.json();
        const transactions = await savingsResponse.json();

        const familyMembers = members.filter(member => member.role === "member");

        container.innerHTML = "";

        if (familyMembers.length === 0) {
            container.innerHTML = `<p>No family members yet.</p>`;
            return;
        }

        familyMembers.forEach(member => {
            const memberTransactions = transactions.filter(
                t => String(t.member).toLowerCase() === String(member.name).toLowerCase()
            );

            const total = memberTransactions.reduce(
                (sum, t) => sum + Number(t.amount), 0
            );

            const row = document.createElement("div");
            row.className = "member-row";

            const details = document.createElement("div");
            const name = document.createElement("strong");
            const savings = document.createElement("small");

            name.textContent = member.name;
            savings.textContent =
                "₦" + total.toLocaleString("en-NG", { minimumFractionDigits: 2 }) +
                " • " + memberTransactions.length +
                (memberTransactions.length === 1 ? " deposit" : " deposits");

            details.appendChild(name);
            details.appendChild(savings);
            row.appendChild(details);
            container.appendChild(row);
        });

    } catch (error) {
        console.error("Family members error:", error);
        container.innerHTML = `<p>Could not load family members.</p>`;
    }
}


// ==========================================
// AUTOMATIC SYNC
// ==========================================

// Auto-refresh for member dashboard
setInterval(() => {
    const dashboard = document.getElementById("dashboardSection");
    if (dashboard && dashboard.style.display !== "none") {
        loadDashboardFamilyMembers();
    }
}, 3000);

// Auto-refresh savings members dropdown
setInterval(() => {
    loadSavingsMembers();
}, 5000);

// NEW: Auto-refresh pending deposits for Admin (every 5 seconds)
setInterval(() => {
    const adminDash = document.getElementById("adminDashboard");
    if (adminDash && adminDash.style.display !== "none") {
        loadPendingDeposits();
    }
}, 5000);

// ==========================================
// LOAD BANK DETAILS
// ==========================================

async function loadBankDetails() {
    try {
        const response = await fetch("/api/bank-details");
        const bank = await response.json();

        // For the transfer step
        const displayBankName = document.getElementById("displayBankName");
        const displayAccountName = document.getElementById("displayAccountName");
        const displayAccountNumber = document.getElementById("displayAccountNumber");

        if (displayBankName) displayBankName.textContent = bank.bank_name || "Not set";
        if (displayAccountName) displayAccountName.textContent = bank.account_name || "Not set";
        if (displayAccountNumber) displayAccountNumber.textContent = bank.account_number || "Not set";

        // For admin edit form
        const adminBankName = document.getElementById("adminBankName");
        const adminAccountName = document.getElementById("adminAccountName");
        const adminAccountNumber = document.getElementById("adminAccountNumber");

        if (adminBankName) adminBankName.value = bank.bank_name || "";
        if (adminAccountName) adminAccountName.value = bank.account_name || "";
        if (adminAccountNumber) adminAccountNumber.value = bank.account_number || "";

    } catch (error) {
        console.error("Error loading bank details:", error);
    }
}


// ==========================================
// CONTINUE TO BANK DETAILS (STEP 2)
// ==========================================

if (continueSavingsButton) {
    continueSavingsButton.addEventListener("click", async function () {
        const memberName = document.getElementById("memberName").value;
        const amount = Number(document.getElementById("savingAmount").value);
        const date = document.getElementById("savingDate").value;

        if (!memberName) {
            alert("Please select a family member.");
            return;
        }
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        if (!date) {
            alert("Please select a date.");
            return;
        }

        // Show bank details
        await loadBankDetails();
        savingsStep1.style.display = "none";
        savingsStep2.style.display = "block";
    });
}


// ==========================================
// BACK TO STEP 1
// ==========================================

if (backToStep1Button) {
    backToStep1Button.addEventListener("click", function () {
        savingsStep2.style.display = "none";
        savingsStep1.style.display = "block";
    });
}


// ==========================================
// I HAVE TRANSFERRED → CREATE PENDING
// ==========================================

if (confirmTransferButton) {
    confirmTransferButton.addEventListener("click", async function () {
        const memberName = document.getElementById("memberName").value;
        const amount = Number(document.getElementById("savingAmount").value);
        const date = document.getElementById("savingDate").value;
        const note = document.getElementById("savingNote").value.trim();

        try {
            const response = await fetch("/api/pending-savings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member: memberName,
                    amount: amount,
                    date: date,
                    note: note || "Bank transfer"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Could not submit transfer.");
                return;
            }

            alert("Transfer submitted! Waiting for admin confirmation.");

            // Reset form
            savingsForm.style.display = "none";
            savingsStep1.style.display = "block";
            savingsStep2.style.display = "none";
            document.getElementById("memberName").value = "";
            document.getElementById("savingAmount").value = "";
            document.getElementById("savingDate").value = "";
            document.getElementById("savingNote").value = "";

        } catch (error) {
            console.error(error);
            alert("Could not connect to the server.");
        }
    });
}


// ==========================================
// LOAD PENDING DEPOSITS (ADMIN)
// ==========================================

async function loadPendingDeposits() {
    if (!pendingList) return;

    try {
        const response = await fetch("/api/pending-savings");
        const pending = await response.json();

        if (pending.length === 0) {
            pendingList.innerHTML = `<p class="loading-text">No pending transfers.</p>`;
            return;
        }

        pendingList.innerHTML = "";

        pending.forEach(item => {
            const div = document.createElement("div");
            div.className = "pending-item";

            div.innerHTML = `
                <div>
                    <strong>${item.member}</strong>
                    <small>₦${Number(item.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })} • ${item.date}</small>
                    <br>
                    <small>${item.note || "Bank transfer"}</small>
                </div>
                <div class="pending-actions">
                    <button class="btn-confirm" data-id="${item.id}">Confirm</button>
                    <button class="btn-reject" data-id="${item.id}">Reject</button>
                </div>
            `;

            pendingList.appendChild(div);
        });

        // Confirm buttons
        document.querySelectorAll(".btn-confirm").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (!confirm("Confirm this transfer and add it to savings?")) return;

                try {
                    const res = await fetch(`/api/pending-savings/${id}/confirm`, { method: "PUT" });
                    const data = await res.json();

                    if (!res.ok) {
                        alert(data.error || "Could not confirm.");
                        return;
                    }

                    alert("Transfer confirmed and added to savings!");
                    await loadPendingDeposits();
                    await loadSavings();
                    await loadDashboardFamilyMembers();
                    await updateAdminDashboard();

                } catch (error) {
                    console.error(error);
                    alert("Could not connect to the server.");
                }
            });
        });

        // Reject buttons
        document.querySelectorAll(".btn-reject").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (!confirm("Reject this transfer?")) return;

                try {
                    const res = await fetch(`/api/pending-savings/${id}/reject`, { method: "PUT" });
                    const data = await res.json();

                    if (!res.ok) {
                        alert(data.error || "Could not reject.");
                        return;
                    }

                    alert("Transfer rejected.");
                    await loadPendingDeposits();

                } catch (error) {
                    console.error(error);
                    alert("Could not connect to the server.");
                }
            });
        });

    } catch (error) {
        console.error("Error loading pending:", error);
        pendingList.innerHTML = `<p class="loading-text">Could not load pending deposits.</p>`;
    }
}


// ==========================================
// SAVE BANK DETAILS (ADMIN)
// ==========================================

if (saveBankDetailsButton) {
    saveBankDetailsButton.addEventListener("click", async () => {
        const bank_name = document.getElementById("adminBankName").value.trim();
        const account_name = document.getElementById("adminAccountName").value.trim();
        const account_number = document.getElementById("adminAccountNumber").value.trim();

        if (!bank_name || !account_name || !account_number) {
            alert("Please fill in all bank details.");
            return;
        }

        try {
            const response = await fetch("/api/bank-details", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bank_name, account_name, account_number })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Could not save bank details.");
                return;
            }

            alert("Bank details saved successfully!");
            await loadBankDetails();

        } catch (error) {
            console.error(error);
            alert("Could not connect to the server.");
        }
    });
}
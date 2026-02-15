// ---------------- Firebase imports ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment, arrayUnion, arrayRemove, where, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ---------------- Firebase config ----------------
const firebaseConfig = {
  apiKey: "AIzaSyClkHjUnQ96VNRj1FxyY-ca-AcDWYoX_m8",
  authDomain: "hotseat-4f661.firebaseapp.com",
  projectId: "hotseat-4f661",
  storageBucket: "hotseat-4f661.firebasestorage.app",
  messagingSenderId: "1052089495081",
  appId: "1:1052089495081:web:15293be177ad3a6f577638"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------------- App State ----------------
let username = "";
let studentPassword = "";
let isTeacher = false;
let isMasterAdmin = false;
let teacherAccount = "";
let currentBoardId = "";
let currentStudentId = "";
let sortMode = "new";

let myUpvotedPostIds = new Set();
let myPollVotes = new Map();
let postImageFile = null;
let pollImageFile = null;

// ---------------- DOM elements ----------------
const loginDiv = document.getElementById("login");
const teacherLoginDiv = document.getElementById("teacherLogin");
const boardNameEntryDiv = document.getElementById("boardNameEntry");
const boardsPortalDiv = document.getElementById("boardsPortal");
const studentsPortalDiv = document.getElementById("studentsPortal");
const studentDashboardDiv = document.getElementById("studentDashboard");
const appDiv = document.getElementById("app");

const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const teacherLoginBtn = document.getElementById("teacherLoginBtn");

const teacherNameInput = document.getElementById("teacherNameInput");
const teacherPasswordInput = document.getElementById("teacherPasswordInput");
const teacherSignInBtn = document.getElementById("teacherSignInBtn");
const backToMainLoginBtn = document.getElementById("backToMainLoginBtn");

const boardNameInput = document.getElementById("boardNameInput");
const studentPasswordInput = document.getElementById("studentPasswordInput");
const enterBoardBtn = document.getElementById("enterBoardBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

const newBoardNameInput = document.getElementById("newBoardNameInput");
const createBoardBtn = document.getElementById("createBoardBtn");
const boardsList = document.getElementById("boardsList");
const logoutBtnPortal = document.getElementById("logoutBtnPortal");
const logoutBtnApp = document.getElementById("logoutBtnApp");
const logoutBtnStudents = document.getElementById("logoutBtnStudents");
const logoutBtnDashboard = document.getElementById("logoutBtnDashboard");

const backToPortalBtn = document.getElementById("backToPortalBtn");
const studentsBtn = document.getElementById("studentsBtn");
const backToBoardFromStudents = document.getElementById("backToBoardFromStudents");
const backToStudentsFromDashboard = document.getElementById("backToStudentsFromDashboard");

const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const postsDiv = document.getElementById("posts");
const sortSelect = document.getElementById("sortSelect");
const teacherBtn = document.getElementById("teacherBtn");
const pollSection = document.getElementById("pollSection");
const pollCreation = document.getElementById("pollCreation");

const postImageInput = document.getElementById("postImageInput");
const postImageBtn = document.getElementById("postImageBtn");
const postImagePreview = document.getElementById("postImagePreview");

const studentsList = document.getElementById("studentsList");
const dashboardContent = document.getElementById("dashboardContent");

const themeToggle = document.getElementById("themeToggle");
const themeTogglePortal = document.getElementById("themeTogglePortal");
const themeToggleStudents = document.getElementById("themeToggleStudents");
const themeToggleDashboard = document.getElementById("themeToggleDashboard");
const htmlElement = document.documentElement;

// ---------------- Theme ----------------
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const text = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  if (themeToggle) themeToggle.textContent = text;
  if (themeTogglePortal) themeTogglePortal.textContent = text;
  if (themeToggleStudents) themeToggleStudents.textContent = text;
  if (themeToggleDashboard) themeToggleDashboard.textContent = text;
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);
  else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

function toggleTheme() {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) setTheme(e.matches ? "dark" : "light");
});

themeToggle.addEventListener("click", toggleTheme);
themeTogglePortal.addEventListener("click", toggleTheme);
themeToggleStudents.addEventListener("click", toggleTheme);
themeToggleDashboard.addEventListener("click", toggleTheme);

loadTheme();

// ---------------- Login Flow ----------------

// Join button - goes to board name entry
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter your name");
    return;
  }
  
  if (username.toLowerCase() === "dimitry") {
    alert("This name is reserved. Choose another.");
    return;
  }

  isTeacher = false;
  loginDiv.classList.add("hidden");
  boardNameEntryDiv.classList.remove("hidden");
};

// Teacher button - goes to teacher login
teacherLoginBtn.onclick = () => {
  loginDiv.classList.add("hidden");
  teacherLoginDiv.classList.remove("hidden");
};

// Back to main login
backToMainLoginBtn.onclick = () => {
  teacherLoginDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
};

// Teacher Sign In
teacherSignInBtn.onclick = async () => {
  const name = teacherNameInput.value.trim();
  const password = teacherPasswordInput.value.trim();
  
  if (!name || !password) {
    alert("Please enter both teacher name and password");
    return;
  }

  // Master admin login
  if (name.toLowerCase() === "dimitry" && password === "301718Dag") {
    isMasterAdmin = true;
    isTeacher = true;
    teacherAccount = "Dimitry";
    username = "Dimitry";
    
    const teacherRef = doc(db, "teachers", "Dimitry");
    await setDoc(teacherRef, {
      name: "Dimitry",
      password: "301718Dag",
      createdAt: serverTimestamp()
    }, { merge: true });
    
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
    return;
  }

  // Regular teacher login
  const teacherRef = doc(db, "teachers", name);
  const teacherDoc = await getDoc(teacherRef);
  
  if (teacherDoc.exists()) {
    const storedPassword = teacherDoc.data().password;
    if (storedPassword === password) {
      teacherAccount = name;
      username = name;
      isTeacher = true;
      
      teacherLoginDiv.classList.add("hidden");
      boardsPortalDiv.classList.remove("hidden");
      loadBoardsPortal();
    } else {
      alert("Incorrect password");
    }
  } else {
    teacherAccount = name;
    username = name;
    isTeacher = true;
    
    await setDoc(teacherRef, {
      name: name,
      password: password,
      createdAt: serverTimestamp()
    });
    
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
  }
};

// Back to login from board name entry
backToLoginBtn.onclick = () => {
  boardNameEntryDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  boardNameInput.value = "";
  studentPasswordInput.value = "";
};

// Enter board as student
enterBoardBtn.onclick = async () => {
  const boardName = boardNameInput.value.trim();
  if (!boardName) {
    alert("Please enter a PopBoard name");
    return;
  }

  studentPassword = studentPasswordInput.value.trim();

  // Check if board exists
  const boardsRef = collection(db, "boards");
  const q = query(boardsRef, where("name", "==", boardName));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert("Oops! That PopBoard hasn't popped yet. Double-check the name and try again!");
    return;
  }

  const boardData = snapshot.docs[0].data();
  currentBoardId = snapshot.docs[0].id;

  // Check if username is a teacher name who owns this board
  if (username === boardData.teacherAccount) {
    alert("Nice try, but that's the teacher's name! Choose another to join the popcorn party!");
    return;
  }

  // Check if student account exists for this board
  const studentsRef = collection(db, "boards", currentBoardId, "students");
  const studentQuery = query(studentsRef, where("username", "==", username));
  const studentSnapshot = await getDocs(studentQuery);

  if (!studentSnapshot.empty) {
    // Student exists - verify password if they set one
    const existingStudent = studentSnapshot.docs[0];
    const existingPassword = existingStudent.data().password || "";
    
    if (existingPassword && existingPassword !== studentPassword) {
      alert("Incorrect password for this username");
      return;
    }
    
    currentStudentId = existingStudent.id;
  } else {
    // Create new student account
    const newStudent = await addDoc(studentsRef, {
      username: username,
      password: studentPassword,
      joinedAt: serverTimestamp(),
      historicalComments: 0,
      historicalUpvotesGiven: 0,
      historicalUpvotesReceived: 0,
      historicalPollsCast: 0,
      monthlyStats: {} // { "2025-02": { comments: 5, upvotesGiven: 10, ... } }
    });
    currentStudentId = newStudent.id;
  }

  boardNameEntryDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  
  loadPosts();
  loadPoll();
};

// Logout functions
logoutBtnPortal.onclick = () => resetAndLogout();
logoutBtnApp.onclick = () => resetAndLogout();
logoutBtnStudents.onclick = () => resetAndLogout();
logoutBtnDashboard.onclick = () => resetAndLogout();

function resetAndLogout() {
  username = "";
  studentPassword = "";
  isTeacher = false;
  isMasterAdmin = false;
  teacherAccount = "";
  currentBoardId = "";
  currentStudentId = "";
  myUpvotedPostIds.clear();
  myPollVotes.clear();

  boardsPortalDiv.classList.add("hidden");
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.add("hidden");
  appDiv.classList.add("hidden");
  teacherLoginDiv.classList.add("hidden");
  boardNameEntryDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  
  usernameInput.value = "";
  boardNameInput.value = "";
  studentPasswordInput.value = "";
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
}

// Back to boards portal
backToPortalBtn.onclick = () => {
  currentBoardId = "";
  appDiv.classList.add("hidden");
  boardsPortalDiv.classList.remove("hidden");
  loadBoardsPortal();
};

// Students button - go to students portal
studentsBtn.onclick = () => {
  appDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

// Back to board from students portal
backToBoardFromStudents.onclick = () => {
  studentsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
};

// Back to students from dashboard
backToStudentsFromDashboard.onclick = () => {
  studentDashboardDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

// ---------------- Boards Portal ----------------

async function loadBoardsPortal() {
  boardsList.innerHTML = "";

  if (isMasterAdmin) {
    backToPortalBtn.classList.add("hidden");
    
    const teachersSnapshot = await getDocs(collection(db, "teachers"));
    const boardsSnapshot = await getDocs(collection(db, "boards"));

    const teacherBoards = {};
    boardsSnapshot.forEach(doc => {
      const board = doc.data();
      const teacher = board.teacherAccount || "Unknown";
      if (!teacherBoards[teacher]) teacherBoards[teacher] = [];
      teacherBoards[teacher].push({ id: doc.id, ...board });
    });

    const masterSection = document.createElement("div");
    masterSection.className = "master-admin-section";
    masterSection.innerHTML = "<h2>🔐 Master Admin - All PopBoards</h2>";

    for (const teacher in teacherBoards) {
      const teacherCard = document.createElement("div");
      teacherCard.className = "teacher-card";
      teacherCard.innerHTML = `<h4>Teacher: ${teacher}</h4>`;

      const boardsDiv = document.createElement("div");
      boardsDiv.className = "teacher-boards";

      teacherBoards[teacher].forEach(board => {
        const boardCard = createBoardCard(board, true);
        boardsDiv.appendChild(boardCard);
      });

      const deleteTeacherBtn = document.createElement("button");
      deleteTeacherBtn.textContent = "🗑️ Delete Teacher Account";
      deleteTeacherBtn.className = "delete-poll teacher-control";
      deleteTeacherBtn.style.marginTop = "12px";
      deleteTeacherBtn.onclick = async () => {
        if (!confirm(`Delete teacher "${teacher}" and ALL their boards?`)) return;
        
        for (const board of teacherBoards[teacher]) {
          await deleteBoard(board.id);
        }
        
        await deleteDoc(doc(db, "teachers", teacher));
        loadBoardsPortal();
      };

      teacherCard.appendChild(boardsDiv);
      teacherCard.appendChild(deleteTeacherBtn);
      masterSection.appendChild(teacherCard);
    }

    boardsList.appendChild(masterSection);

  } else {
    backToPortalBtn.classList.add("hidden");
    
    const boardsRef = collection(db, "boards");
    const q = query(boardsRef, where("teacherAccount", "==", teacherAccount));
    
    onSnapshot(q, snapshot => {
      boardsList.innerHTML = "";
      
      if (snapshot.empty) {
        boardsList.innerHTML = "<p style='text-align:center; color: var(--text-secondary); margin-top:40px;'>No boards yet. Create your first PopBoard!</p>";
        return;
      }

      snapshot.forEach(doc => {
        const board = { id: doc.id, ...doc.data() };
        const boardCard = createBoardCard(board, false);
        boardsList.appendChild(boardCard);
      });
    });
  }
}

function createBoardCard(board, isMasterView) {
  const card = document.createElement("div");
  card.className = "board-card";

  const info = document.createElement("div");
  info.className = "board-card-info";
  info.innerHTML = `
    <h3>${board.name}</h3>
    <p>Created ${board.createdAt ? new Date(board.createdAt.seconds * 1000).toLocaleDateString() : 'recently'}</p>
  `;

  const actions = document.createElement("div");
  actions.className = "board-card-actions";

  // Enter button
  const enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter";
  enterBtn.onclick = (e) => {
    e.stopPropagation();
    enterBoard(board.id);
  };
  actions.appendChild(enterBtn);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "🔄Reset";
  resetBtn.className = "teacher-control";
  resetBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!confirm(`Reset "${board.name}"? This will delete all posts, polls, and current interactions but keep student accounts and historical data.`)) return;
    await resetBoard(board.id);
  };
  actions.appendChild(resetBtn);

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️Delete";
  deleteBtn.className = "delete-poll teacher-control";
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${board.name}"? This will delete ALL data including student accounts.`)) return;
    await deleteBoard(board.id);
    if (isMasterView) loadBoardsPortal();
  };
  actions.appendChild(deleteBtn);

  card.appendChild(info);
  card.appendChild(actions);
  card.onclick = () => enterBoard(board.id);

  return card;
}

async function resetBoard(boardId) {
  // Delete all posts
  const postsSnapshot = await getDocs(collection(db, "boards", boardId, "posts"));
  for (const doc of postsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete all replies
  const repliesSnapshot = await getDocs(collection(db, "boards", boardId, "replies"));
  for (const doc of repliesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete all polls
  const pollsSnapshot = await getDocs(collection(db, "boards", boardId, "polls"));
  for (const doc of pollsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Keep student accounts - they persist with historical data
}

async function deleteBoard(boardId) {
  await resetBoard(boardId);
  
  // Delete all student accounts
  const studentsSnapshot = await getDocs(collection(db, "boards", boardId, "students"));
  for (const doc of studentsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete board
  await deleteDoc(doc(db, "boards", boardId));
}

function enterBoard(boardId) {
  currentBoardId = boardId;
  boardsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  
  if (isTeacher) {
    teacherBtn.classList.remove("hidden");
    backToPortalBtn.classList.remove("hidden");
    studentsBtn.classList.remove("hidden"); // ← MISSING LINE - ADDS STUDENTS BUTTON
  } else {
    // Hide teacher-only buttons for students
    teacherBtn.classList.add("hidden");
    backToPortalBtn.classList.add("hidden");
    studentsBtn.classList.add("hidden");
  }
  
  loadPosts();
  loadPoll();
}

// Create board
createBoardBtn.onclick = async () => {
  const boardName = newBoardNameInput.value.trim();
  if (!boardName) {
    alert("Please enter a board name");
    return;
  }

  // Check if name already exists ANYWHERE
  const boardsRef = collection(db, "boards");
  const q = query(boardsRef, where("name", "==", boardName));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    alert("PopBoard name is already taken. Pick a fresh kernel!");
    return;
  }

  await addDoc(collection(db, "boards"), {
    name: boardName,
    teacherAccount: teacherAccount,
    createdAt: serverTimestamp()
  });

  newBoardNameInput.value = "";
  loadBoardsPortal();
};

// ---------------- Students Portal ----------------

async function loadStudentsPortal() {
  studentsList.innerHTML = "";
  
  const studentsRef = collection(db, "boards", currentBoardId, "students");
  const studentsSnapshot = await getDocs(studentsRef);
  
  if (studentsSnapshot.empty) {
    studentsList.innerHTML = "<p style='text-align:center; color: var(--text-secondary); margin-top:40px;'>No students yet!</p>";
    return;
  }

  // Get total polls count for percentage calculation
  const pollsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  const totalPolls = pollsSnapshot.size;

  for (const studentDoc of studentsSnapshot.docs) {
    const student = studentDoc.data();
    const studentId = studentDoc.id;
    
    // Calculate participation stats
    const stats = await calculateStudentStats(studentId, totalPolls);
    
    const card = document.createElement("div");
    card.className = "board-card";

    const info = document.createElement("div");
    info.className = "board-card-info";
    info.innerHTML = `
      <h3>${student.username}</h3>
      <p class="student-stats">
        Polls: ${stats.pollsVoted}${totalPolls > 0 ? ` (${Math.round((stats.pollsVoted / totalPolls) * 100)}%)` : ''} • 
        Comments: ${stats.comments} • 
        Upvotes Given: ${stats.upvotesGiven} • 
        Upvotes Received: ${stats.upvotesReceived} • 
        Avg Words (Free Response): ${stats.avgWordsFreeResponse} • 
        Avg Words (Comments): ${stats.avgWordsComments} • 
        🥷🏼Anonymous: ${stats.anonymousPercentage}%
      </p>
    `;

    const actions = document.createElement("div");
    actions.className = "board-card-actions";

    const enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    enterBtn.onclick = (e) => {
      e.stopPropagation();
      viewStudentDashboard(studentId);
    };
    actions.appendChild(enterBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️Delete";
    deleteBtn.className = "delete-poll teacher-control";
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete student "${student.username}"?`)) return;
      await deleteDoc(doc(db, "boards", currentBoardId, "students", studentId));
      loadStudentsPortal();
    };
    actions.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(actions);
    card.onclick = () => viewStudentDashboard(studentId);

    studentsList.appendChild(card);
  }
}

async function calculateStudentStats(studentId, totalPolls) {
  const studentRef = doc(db, "boards", currentBoardId, "students", studentId);
  const studentDoc = await getDoc(studentRef);
  const student = studentDoc.data();
  
  // Count polls voted in
  const pollsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  let pollsVoted = 0;
  pollsSnapshot.forEach(pollDoc => {
    const poll = pollDoc.data();
    if (poll.type === "mc" && poll.voters?.includes(student.username)) {
      pollsVoted++;
    } else if (poll.type === "free" && poll.history?.some(h => h.username === student.username)) {
      pollsVoted++;
    }
  });

  // Count comments (posts + replies)
  const postsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  let comments = 0;
  let anonymousComments = 0;
  let totalWordsComments = 0;
  
  postsSnapshot.forEach(postDoc => {
    const post = postDoc.data();
    if (post.author === student.username) {
      comments++;
      if (post.anonymous) anonymousComments++;
      totalWordsComments += (post.text || "").split(/\s+/).filter(w => w).length;
    }
  });

  const repliesSnapshot = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  repliesSnapshot.forEach(replyDoc => {
    const reply = replyDoc.data();
    if (reply.author === student.username) {
      comments++;
      if (reply.anonymous) anonymousComments++;
      totalWordsComments += (reply.text || "").split(/\s+/).filter(w => w).length;
    }
  });

  // Count upvotes given
  let upvotesGiven = 0;
  postsSnapshot.forEach(postDoc => {
    const post = postDoc.data();
    if (post.upvoters?.includes(student.username)) {
      upvotesGiven++;
    }
  });

  // Count upvotes received
  let upvotesReceived = 0;
  postsSnapshot.forEach(postDoc => {
    const post = postDoc.data();
    if (post.author === student.username) {
      upvotesReceived += post.upvotes || 0;
    }
  });

  // Calculate avg words for free response polls
  let totalWordsFreeResponse = 0;
  let freeResponseCount = 0;
  pollsSnapshot.forEach(pollDoc => {
    const poll = pollDoc.data();
    if (poll.type === "free" && poll.history) {
      poll.history.forEach(entry => {
        if (entry.username === student.username) {
          totalWordsFreeResponse += (entry.response || "").split(/\s+/).filter(w => w).length;
          freeResponseCount++;
        }
      });
    }
  });

  const avgWordsFreeResponse = freeResponseCount > 0 ? Math.round(totalWordsFreeResponse / freeResponseCount) : 0;
  const avgWordsComments = comments > 0 ? Math.round(totalWordsComments / comments) : 0;
  const anonymousPercentage = comments > 0 ? Math.round((anonymousComments / comments) * 100) : 0;

  return {
    pollsVoted,
    comments,
    upvotesGiven,
    upvotesReceived,
    avgWordsFreeResponse,
    avgWordsComments,
    anonymousPercentage
  };
}

// ---------------- Student Dashboard ----------------

async function viewStudentDashboard(studentId) {
  currentStudentId = studentId;
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.remove("hidden");

  const studentRef = doc(db, "boards", currentBoardId, "students", studentId);
  const studentDoc = await getDoc(studentRef);
  const student = studentDoc.data();

  dashboardContent.innerHTML = `
    <div class="dashboard-header">
      <h2>${student.username}</h2>
      <p style="color: var(--text-secondary); margin-top: -16px;">
        ${student.password ? `Password: ${student.password}` : 'No password set'}
      </p>
      <button id="mergeStudentBtn" class="teacher-control" style="margin-top: 16px;">Merge Student</button>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Comments Made: ${student.historicalComments || 0}</h3>
        <canvas id="commentsChart" width="400" height="200"></canvas>
      </div>
      
      <div class="metric-card">
        <h3>Upvotes Given: ${student.historicalUpvotesGiven || 0}</h3>
        <canvas id="upvotesGivenChart" width="400" height="200"></canvas>
      </div>
      
      <div class="metric-card">
        <h3>Upvotes Received: ${student.historicalUpvotesReceived || 0}</h3>
        <canvas id="upvotesReceivedChart" width="400" height="200"></canvas>
      </div>
      
      <div class="metric-card">
        <h3>Polls Cast: ${student.historicalPollsCast || 0}</h3>
        <canvas id="pollsCastChart" width="400" height="200"></canvas>
      </div>
    </div>
  `;

  // Draw charts
  drawChart("commentsChart", student.monthlyStats || {}, "comments");
  drawChart("upvotesGivenChart", student.monthlyStats || {}, "upvotesGiven");
  drawChart("upvotesReceivedChart", student.monthlyStats || {}, "upvotesReceived");
  drawChart("pollsCastChart", student.monthlyStats || {}, "pollsCast");

  // Merge button handler
  document.getElementById("mergeStudentBtn").onclick = async () => {
    await showMergeDialog(studentId);
  };
}

async function showMergeDialog(currentStudentId) {
  const studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  const students = [];
  
  studentsSnapshot.forEach(doc => {
    if (doc.id !== currentStudentId) {
      students.push({ id: doc.id, ...doc.data() });
    }
  });

  if (students.length === 0) {
    alert("No other students to merge with");
    return;
  }

  const selectedUsername = prompt(
    `Select student to merge with:\n\n${students.map((s, i) => `${i + 1}. ${s.username}`).join('\n')}\n\nEnter number:`
  );

  const index = parseInt(selectedUsername) - 1;
  if (isNaN(index) || index < 0 || index >= students.length) {
    alert("Invalid selection");
    return;
  }

  const targetStudent = students[index];
  
  if (!confirm(`Merge "${targetStudent.username}" into current student? This will combine all historical data.`)) {
    return;
  }

  await mergeStudents(currentStudentId, targetStudent.id);
}

async function mergeStudents(keepStudentId, mergeStudentId) {
  const keepRef = doc(db, "boards", currentBoardId, "students", keepStudentId);
  const mergeRef = doc(db, "boards", currentBoardId, "students", mergeStudentId);
  
  const keepDoc = await getDoc(keepRef);
  const mergeDoc = await getDoc(mergeRef);
  
  const keep = keepDoc.data();
  const merge = mergeDoc.data();

  // Merge historical data
  const mergedHistorical = {
    historicalComments: (keep.historicalComments || 0) + (merge.historicalComments || 0),
    historicalUpvotesGiven: (keep.historicalUpvotesGiven || 0) + (merge.historicalUpvotesGiven || 0),
    historicalUpvotesReceived: (keep.historicalUpvotesReceived || 0) + (merge.historicalUpvotesReceived || 0),
    historicalPollsCast: (keep.historicalPollsCast || 0) + (merge.historicalPollsCast || 0)
  };

  // Merge monthly stats
  const mergedMonthlyStats = { ...(keep.monthlyStats || {}) };
  const mergeMonthlyStats = merge.monthlyStats || {};
  
  for (const month in mergeMonthlyStats) {
    if (!mergedMonthlyStats[month]) {
      mergedMonthlyStats[month] = mergeMonthlyStats[month];
    } else {
      mergedMonthlyStats[month] = {
        comments: (mergedMonthlyStats[month].comments || 0) + (mergeMonthlyStats[month].comments || 0),
        upvotesGiven: (mergedMonthlyStats[month].upvotesGiven || 0) + (mergeMonthlyStats[month].upvotesGiven || 0),
        upvotesReceived: (mergedMonthlyStats[month].upvotesReceived || 0) + (mergeMonthlyStats[month].upvotesReceived || 0),
        pollsCast: (mergedMonthlyStats[month].pollsCast || 0) + (mergeMonthlyStats[month].pollsCast || 0)
      };
    }
  }

  await updateDoc(keepRef, {
    ...mergedHistorical,
    monthlyStats: mergedMonthlyStats
  });

  await deleteDoc(mergeRef);
  
  alert("Students merged successfully!");
  viewStudentDashboard(keepStudentId);
}

function drawChart(canvasId, monthlyStats, metric) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Get last 12 months
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key: monthKey,
      label: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      value: monthlyStats[monthKey]?.[metric] || 0
    });
  }

  // Find max value for scaling
  const maxValue = Math.max(...months.map(m => m.value), 1);

  // Chart dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const pointSpacing = chartWidth / (months.length - 1);

  // Get theme colors
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const lineColor = isDark ? "#d4a373" : "#d4a373";
  const textColor = isDark ? "#f5f5f7" : "#1d1d1f";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  // Draw line
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  months.forEach((month, i) => {
    const x = padding + i * pointSpacing;
    const y = padding + chartHeight - (month.value / maxValue) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Smooth curve using quadratic bezier
      const prevX = padding + (i - 1) * pointSpacing;
      const prevY = padding + chartHeight - (months[i - 1].value / maxValue) * chartHeight;
      const cpX = (prevX + x) / 2;
      const cpY = (prevY + y) / 2;
      ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
      ctx.quadraticCurveTo(cpX, cpY, x, y);
    }
  });

  ctx.stroke();

  // Draw points
  ctx.fillStyle = lineColor;
  months.forEach((month, i) => {
    const x = padding + i * pointSpacing;
    const y = padding + chartHeight - (month.value / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw month labels (every other month to avoid crowding)
  ctx.fillStyle = textColor;
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  months.forEach((month, i) => {
    if (i % 2 === 0 || i === months.length - 1) {
      const x = padding + i * pointSpacing;
      ctx.fillText(month.label, x, height - 10);
    }
  });
}

// ---------------- Helper: Update Student Historical Stats ----------------

async function incrementStudentStat(studentId, metric, amount = 1) {
  if (!studentId) return;
  
  const studentRef = doc(db, "boards", currentBoardId, "students", studentId);
  const studentDoc = await getDoc(studentRef);
  
  if (!studentDoc.exists()) return;
  
  const student = studentDoc.data();
  const monthlyStats = student.monthlyStats || {};
  
  // Get current month key
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  if (!monthlyStats[monthKey]) {
    monthlyStats[monthKey] = {
      comments: 0,
      upvotesGiven: 0,
      upvotesReceived: 0,
      pollsCast: 0
    };
  }
  
  monthlyStats[monthKey][metric] = (monthlyStats[monthKey][metric] || 0) + amount;
  
  const updates = {
    monthlyStats: monthlyStats
  };
  
  // Update historical total
  const historicalKey = `historical${metric.charAt(0).toUpperCase() + metric.slice(1)}`;
  updates[historicalKey] = (student[historicalKey] || 0) + amount;
  
  await updateDoc(studentRef, updates);
}

// ---------------- Image Upload Helpers ----------------

async function uploadImage(file, folder) {
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const storageRef = ref(storage, `${folder}/${filename}`);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

function showImagePreview(file, previewElement, removeCallback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewElement.innerHTML = `
      <img src="${e.target.result}" />
      <button class="remove-image">×</button>
    `;
    previewElement.querySelector(".remove-image").onclick = removeCallback;
  };
  reader.readAsDataURL(file);
}

function showImageLightbox(imageUrl) {
  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.innerHTML = `<img src="${imageUrl}" />`;
  lightbox.onclick = () => lightbox.remove();
  document.body.appendChild(lightbox);
}

postImageBtn.onclick = () => postImageInput.click();

postImageInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  postImageFile = file;
  showImagePreview(file, postImagePreview, () => {
    postImageFile = null;
    postImagePreview.innerHTML = "";
    postImageInput.value = "";
  });
};

// ---------------- Post ----------------
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text && !postImageFile) {
    alert("Please enter text or attach an image");
    return;
  }

  const anonymous = document.getElementById("anonymousToggle")?.checked || false;
  
  let imageUrl = null;
  if (postImageFile) {
    imageUrl = await uploadImage(postImageFile, `boards/${currentBoardId}/posts`);
  }

  await addDoc(collection(db, "boards", currentBoardId, "posts"), {
    author: username,
    text,
    anonymous,
    imageUrl,
    upvotes: 0,
    upvoters: [],
    upvoteHistory: [],
    timestamp: serverTimestamp()
  });

  // Update student stats
  if (currentStudentId) {
    await incrementStudentStat(currentStudentId, "comments");
  }

  postInput.value = "";
  postImageFile = null;
  postImagePreview.innerHTML = "";
  postImageInput.value = "";
  
  if (document.getElementById("anonymousToggle")) {
    document.getElementById("anonymousToggle").checked = false;
  }
};

// ---------------- Sort ----------------
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// ---------------- Confetti ----------------
function createPopcornConfetti(upvoteElement) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement("span");
    particle.textContent = "🍿";
    particle.style.position = "absolute";
    particle.style.left = `${upvoteElement.getBoundingClientRect().left + window.scrollX}px`;
    particle.style.top = `${upvoteElement.getBoundingClientRect().top + window.scrollY}px`;
    particle.style.fontSize = "16px";
    particle.style.opacity = 1;
    particle.style.transition = "all 0.8s ease-out";
    particle.style.pointerEvents = "none";
    document.body.appendChild(particle);

    const x = (Math.random() - 0.5) * 60;
    const y = -Math.random() * 60 - 20;

    requestAnimationFrame(() => {
      particle.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*360}deg)`;
      particle.style.opacity = 0;
    });

    setTimeout(() => particle.remove(), 800);
  }
}

// ---------------- Replies ----------------
async function addReply(postId, text, anonymous = false, imageUrl = null) {
  if (!text && !imageUrl) return;
  await addDoc(collection(db, "boards", currentBoardId, "replies"), {
    postId,
    author: username,
    text,
    anonymous,
    imageUrl,
    timestamp: serverTimestamp()
  });

  // Update student stats
  if (currentStudentId) {
    await incrementStudentStat(currentStudentId, "comments");
  }
}

// ---------------- Load Replies ----------------
function loadReplies(postId, container, parentVisible = true) {
  const q = query(collection(db, "boards", currentBoardId, "replies"), orderBy("timestamp", "asc"));
  onSnapshot(q, snap => {
    container.innerHTML = "";

    snap.forEach(d => {
      const r = d.data();
      if (r.postId !== postId) return;

      if (r.visible === undefined) r.visible = true;

      if (!r.visible && !isTeacher) return;
      if (!parentVisible && !isTeacher) return;

      const div = document.createElement("div");
      div.className = "reply";
      
      if (!r.visible) div.classList.add("hidden-comment");

      const displayName = r.anonymous && !isTeacher ? "🥷🏼Anonymous" : r.author;
      div.innerHTML = `<strong>${displayName}</strong> ${r.text}`;

      if (r.imageUrl) {
        const img = document.createElement("img");
        img.src = r.imageUrl;
        img.className = "comment-image";
        img.onclick = () => showImageLightbox(r.imageUrl);
        div.appendChild(img);
      }

      if (isTeacher) {
        const hideBtn = document.createElement("button");
        hideBtn.textContent = r.visible ? "👁️‍🗨️Hide" : "👁️Show";
        hideBtn.className = "hide-toggle teacher-control";
        hideBtn.onclick = async () => {
          const ref = doc(db, "boards", currentBoardId, "replies", d.id);
          const newVisible = !r.visible;
          await updateDoc(ref, { visible: newVisible });
        };
        div.appendChild(hideBtn);

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑️Delete";
        delBtn.className = "delete-btn teacher-control";
        delBtn.onclick = async () => {
          await deleteDoc(doc(db, "boards", currentBoardId, "replies", d.id));
        };
        div.appendChild(delBtn);
      }

      container.appendChild(div);
    });
  });
}

// ---------------- Load Posts ----------------
function loadPosts() {
  if (!currentBoardId) return;

  const q = query(
    collection(db, "boards", currentBoardId, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;

      if (post.visible === undefined) post.visible = true;
      if (!post.visible && !isTeacher) return;

      if (post.upvoters?.includes(username)) myUpvotedPostIds.add(postId);
      else myUpvotedPostIds.delete(postId);

      const div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postId)) div.classList.add("upvoted-by-me");
      
      if (!post.visible) div.classList.add("hidden-comment");

      const displayName = post.anonymous && !isTeacher ? "🥷🏼Anonymous" : post.author;

      div.innerHTML = `
        <strong>${displayName}</strong><br/>
        ${post.text}<br/>
        <span class="upvote">🍿 ${post.upvotes || 0}</span>
        <button class="reply-btn teacher-control">Reply</button>
      `;

      if (post.imageUrl) {
        const img = document.createElement("img");
        img.src = post.imageUrl;
        img.className = "comment-image";
        img.onclick = () => showImageLightbox(post.imageUrl);
        div.appendChild(img);
      }

      if (isTeacher) {
        const hideBtn = document.createElement("button");
        hideBtn.textContent = post.visible ? "👁️‍🗨️Hide" : "👁️Show";
        hideBtn.className = "hide-toggle teacher-control";
        hideBtn.onclick = async () => {
          const ref = doc(db, "boards", currentBoardId, "posts", postId);
          const newVisible = !post.visible;
          await updateDoc(ref, { visible: newVisible });

          const repliesRef = collection(db, "boards", currentBoardId, "replies");
          const snap = await getDocs(repliesRef);
          snap.forEach(d => {
            const r = d.data();
            if (r.postId === postId) updateDoc(doc(db, "boards", currentBoardId, "replies", d.id), { visible: newVisible });
          });
        };
        div.appendChild(hideBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️Delete";
        deleteBtn.className = "delete teacher-control";
        deleteBtn.onclick = async () => {
          const replyQuery = query(collection(db, "boards", currentBoardId, "replies"));
          const snap = await getDocs(replyQuery);
          snap.forEach(d => {
            if (d.data().postId === postId) deleteDoc(doc(db, "boards", currentBoardId, "replies", d.id));
          });
          await deleteDoc(doc(db, "boards", currentBoardId, "posts", postId));
        };
        div.appendChild(deleteBtn);
      }

      const upvoteSpan = div.querySelector(".upvote");
      upvoteSpan.onclick = async (e) => {
        e.stopPropagation();
        
        createPopcornConfetti(upvoteSpan);
        navigator.vibrate?.(25);

        const ref = doc(db, "boards", currentBoardId, "posts", postId);
        const already = post.upvoters?.includes(username);
        const action = already ? "Removed Upvote" : "Upvoted";

        if (already) {
          await updateDoc(ref, {
            upvoters: arrayRemove(username),
            upvotes: increment(-1),
            upvoteHistory: arrayUnion(`${username}: ${action}`)
          });
          
          // Update student stats
          if (currentStudentId) {
            await incrementStudentStat(currentStudentId, "upvotesGiven", -1);
          }
        } else {
          await updateDoc(ref, {
            upvoters: arrayUnion(username),
            upvotes: increment(1),
            upvoteHistory: arrayUnion(`${username}: ${action}`)
          });
          
          // Update student stats
          if (currentStudentId) {
            await incrementStudentStat(currentStudentId, "upvotesGiven", 1);
          }
        }
        
        // Update upvotes received for post author
        if (!already && post.author !== username) {
          const authorStudentQuery = query(
            collection(db, "boards", currentBoardId, "students"),
            where("username", "==", post.author)
          );
          const authorSnapshot = await getDocs(authorStudentQuery);
          if (!authorSnapshot.empty) {
            await incrementStudentStat(authorSnapshot.docs[0].id, "upvotesReceived", 1);
          }
        }
      };

      if (isTeacher && post.upvoteHistory && post.upvoteHistory.length > 0) {
        const historyDiv = document.createElement("div");
        historyDiv.className = "comment-upvote-history";
        historyDiv.innerHTML = "<strong>Upvote Log:</strong>";
        
        post.upvoteHistory.forEach(entry => {
          const entryDiv = document.createElement("div");
          entryDiv.textContent = entry;
          historyDiv.appendChild(entryDiv);
        });
        
        div.appendChild(historyDiv);
      }

      const repliesDiv = document.createElement("div");
      loadReplies(postId, repliesDiv, post.visible);

      const replyBtn = div.querySelector(".reply-btn");
      replyBtn.onclick = (e) => {
        e.stopPropagation();
        
        const input = document.createElement("textarea");
        input.className = "reply-input";
        input.placeholder = "Reply…";

        const anonWrapper = document.createElement("div");
        anonWrapper.className = "post-options";

        const anonCheck = document.createElement("input");
        anonCheck.type = "checkbox";
        anonCheck.id = `replyAnonymous-${postId}`;

        const label = document.createElement("label");
        label.htmlFor = `replyAnonymous-${postId}`;
        label.textContent = "🥷🏼 Anonymous";

        const replyImageInput = document.createElement("input");
        replyImageInput.type = "file";
        replyImageInput.accept = "image/*";
        replyImageInput.style.display = "none";
        replyImageInput.id = `replyImage-${postId}`;

        const replyImageBtn = document.createElement("button");
        replyImageBtn.textContent = "📷 Add Image";
        replyImageBtn.className = "secondary-btn teacher-control";
        replyImageBtn.onclick = () => replyImageInput.click();

        const replyImagePreview = document.createElement("div");
        replyImagePreview.className = "image-preview";

        let replyImageFile = null;

        replyImageInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file || !file.type.startsWith("image/")) return;
          
          replyImageFile = file;
          showImagePreview(file, replyImagePreview, () => {
            replyImageFile = null;
            replyImagePreview.innerHTML = "";
            replyImageInput.value = "";
          });
        };

        anonWrapper.appendChild(anonCheck);
        anonWrapper.appendChild(label);
        anonWrapper.appendChild(replyImageBtn);

        const send = document.createElement("button");
        send.textContent = "Send";
        send.className = "teacher-control";
        send.onclick = async (e) => {
          e.stopPropagation();
          
          let imageUrl = null;
          if (replyImageFile) {
            imageUrl = await uploadImage(replyImageFile, `boards/${currentBoardId}/replies`);
          }
          
          await addReply(postId, input.value, anonCheck.checked, imageUrl);
          input.remove();
          anonWrapper.remove();
          send.remove();
          replyImageInput.remove();
          replyImagePreview.remove();
        };

        div.appendChild(input);
        div.appendChild(anonWrapper);
        div.appendChild(replyImagePreview);
        div.appendChild(send);
      };

      div.appendChild(repliesDiv);
      postsDiv.appendChild(div);
    });
  });
}

// ---------------- Polls ----------------
teacherBtn.onclick = async () => {
  pollCreation.classList.remove("hidden");
  pollCreation.innerHTML = `
    <h3>Create Poll</h3>
    <div class="poll-type-buttons">
      <button id="mcBtn" class="teacher-control">Multiple Choice</button>
      <button id="freeBtn" class="teacher-control">Free Response</button>
    </div>
    <input type="text" id="pollQuestionInput" placeholder="Poll question" style="display:none;" />
    <input type="text" id="pollOptionsInput" placeholder="Comma-separated options" style="display:none;" />
    <input type="file" id="pollImageInput" accept="image/*" style="display:none;" />
    <button id="pollImageBtn" class="secondary-btn teacher-control" style="display:none;">📷 Add Image</button>
    <div id="pollImagePreview" class="image-preview"></div>
    <button id="createPollBtn" class="teacher-control" style="display:none;">Create Poll</button>
    <button id="cancelPollBtn" class="teacher-control" style="display:none;">Cancel</button>
  `;

  let pollType = "";
  const pollImageInput = document.getElementById("pollImageInput");
  const pollImagePreview = document.getElementById("pollImagePreview");
  let pollImageFile = null;

  document.getElementById("pollImageBtn").onclick = () => pollImageInput.click();

  pollImageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    
    pollImageFile = file;
    showImagePreview(file, pollImagePreview, () => {
      pollImageFile = null;
      pollImagePreview.innerHTML = "";
      pollImageInput.value = "";
    });
  };

  document.getElementById("mcBtn").onclick = () => {
    pollType = "mc";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("pollOptionsInput").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.querySelector(".poll-type-buttons").style.display = "none";
  };

  document.getElementById("freeBtn").onclick = () => {
    pollType = "free";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.querySelector(".poll-type-buttons").style.display = "none";
  };

  document.getElementById("cancelPollBtn").onclick = () => {
    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    pollImageFile = null;
  };

  document.getElementById("createPollBtn").onclick = async () => {
    const question = document.getElementById("pollQuestionInput").value.trim();
    if (!question) return;

    let imageUrl = null;
    if (pollImageFile) {
      imageUrl = await uploadImage(pollImageFile, `boards/${currentBoardId}/polls`);
    }

    if (pollType === "mc") {
      const optionsStr = document.getElementById("pollOptionsInput").value.trim();
      if (!optionsStr) return;

      const options = optionsStr.split(",").map(o => o.trim()).filter(o => o);
      if (options.length === 0) return;

      await addDoc(collection(db, "boards", currentBoardId, "polls"), {
        question,
        type: "mc",
        options,
        votes: Array(options.length).fill(0),
        voters: [],
        visible: false,
        imageUrl,
        history: []
      });
    } else if (pollType === "free") {
      await addDoc(collection(db, "boards", currentBoardId, "polls"), {
        question,
        type: "free",
        responses: {},
        visible: false,
        responsesVisible: false,
        imageUrl,
        history: []
      });
    }

    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    pollImageFile = null;
  };
};

async function loadPoll() {
  if (!currentBoardId) return;

  // Get total student count for percentage calculation
  const studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  const totalStudents = studentsSnapshot.size;

  onSnapshot(collection(db, "boards", currentBoardId, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      const pollId = docSnap.id;

      if (!poll.visible && !isTeacher) return;

      const div = document.createElement("div");
      div.className = "poll";
      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      if (poll.imageUrl) {
        const img = document.createElement("img");
        img.src = poll.imageUrl;
        img.className = "poll-image";
        img.onclick = () => showImageLightbox(poll.imageUrl);
        div.appendChild(img);
      }

      if (poll.type === "free") {
        // Calculate percentage responded
        const uniqueResponders = new Set((poll.history || []).map(h => h.username));
        const percentageResponded = totalStudents > 0 
          ? Math.round((uniqueResponders.size / totalStudents) * 100) 
          : 0;

        if (isTeacher) {
          // Show percentage stat
          const percentDiv = document.createElement("div");
          percentDiv.className = "poll-stat";
          percentDiv.innerHTML = `<strong>Percentage Responded: ${percentageResponded}%</strong>`;
          div.appendChild(percentDiv);
        }

        if (isTeacher || poll.responsesVisible) {
          const logDiv = document.createElement("div");
          logDiv.className = "poll-log";
          logDiv.innerHTML = "<strong>Poll Log:</strong>";
          (poll.history || []).forEach(entry => {
            const p = document.createElement("div");
            p.textContent = `${entry.username}: ${entry.response}`;
            logDiv.appendChild(p);
          });
          div.appendChild(logDiv);
        }
        
        if (!isTeacher) {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Enter your response...";
          const submitBtn = document.createElement("button");
          submitBtn.textContent = "Submit";
          submitBtn.className = "teacher-control";

          submitBtn.onclick = async (e) => {
            e.stopPropagation();
            
            const responseText = textarea.value.trim();
            if (!responseText) return;

            await updateDoc(doc(db, "boards", currentBoardId, "polls", pollId), {
              history: arrayUnion({ username, response: responseText })
            });

            // Update student stats
            if (currentStudentId) {
              await incrementStudentStat(currentStudentId, "pollsCast");
            }

            textarea.placeholder = "✓ Your response popped in!";
            textarea.value = "";
            textarea.disabled = true;
            submitBtn.disabled = true;
          };

          div.appendChild(textarea);
          div.appendChild(submitBtn);
        }
      } else {
        // Multiple choice - calculate percentage
        const totalVotes = (poll.votes || []).reduce((sum, v) => sum + v, 0);
        const percentageResponded = totalStudents > 0 
          ? Math.round((totalVotes / totalStudents) * 100) 
          : 0;

        if (isTeacher) {
          const percentDiv = document.createElement("div");
          percentDiv.className = "poll-stat";
          percentDiv.innerHTML = `<strong>Percentage Responded: ${percentageResponded}%</strong>`;
          div.appendChild(percentDiv);
        }

        const myChoice = myPollVotes.get(pollId);
        poll.options.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.textContent = `${opt} (${poll.votes?.[i] || 0})`;
          if (myChoice === i) btn.classList.add("voted-by-me");

          btn.onclick = async (e) => {
            e.stopPropagation();
            
            const pollRef = doc(db, "boards", currentBoardId, "polls", pollId);
            const prevChoice = myPollVotes.get(pollId);

            if (prevChoice === i) {
              myPollVotes.delete(pollId);
              await updateDoc(pollRef, {
                [`votes.${i}`]: increment(-1),
                voters: arrayRemove(username),
                history: arrayUnion({ username, response: `Removed vote: ${opt}` })
              });
              
              // Update student stats
              if (currentStudentId) {
                await incrementStudentStat(currentStudentId, "pollsCast", -1);
              }
            } else {
              myPollVotes.set(pollId, i);
              const updates = {
                [`votes.${i}`]: increment(1),
                history: arrayUnion({ username, response: `Voted: ${opt}` })
              };
              
              if (prevChoice === undefined) {
                updates.voters = arrayUnion(username);
                // First vote - increment stats
                if (currentStudentId) {
                  await incrementStudentStat(currentStudentId, "pollsCast", 1);
                }
              } else {
                updates[`votes.${prevChoice}`] = increment(-1);
              }
              
              await updateDoc(pollRef, updates);
            }
          };

          div.appendChild(btn);
        });

        if (isTeacher) {
          const logDiv = document.createElement("div");
          logDiv.className = "poll-log";
          logDiv.innerHTML = "<strong>Poll Log:</strong>";
          (poll.history || []).forEach(entry => {
            const p = document.createElement("div");
            p.textContent = `${entry.username}: ${entry.response}`;
            logDiv.appendChild(p);
          });
          div.appendChild(logDiv);
        }
      }

      if (isTeacher) {
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = poll.visible ? "👁️‍🗨️Hide" : "👁️Show";
        toggleBtn.className = "hide-toggle teacher-control";
        toggleBtn.onclick = async (e) => {
          e.stopPropagation();
          await updateDoc(doc(db, "boards", currentBoardId, "polls", pollId), { visible: !poll.visible });
        };
        div.appendChild(toggleBtn);

        if (poll.type === "free") {
          const responsesToggleBtn = document.createElement("button");
          responsesToggleBtn.textContent = poll.responsesVisible ? "👁️‍🗨️Hide Responses" : "👁️Show Responses";
          responsesToggleBtn.className = "hide-toggle teacher-control";
          responsesToggleBtn.onclick = async (e) => {
            e.stopPropagation();
            await updateDoc(doc(db, "boards", currentBoardId, "polls", pollId), { 
              responsesVisible: !poll.responsesVisible 
            });
          };
          div.appendChild(responsesToggleBtn);
        }

        const resetBtn = document.createElement("button");
        resetBtn.textContent = "🔄Reset";
        resetBtn.className = "teacher-control";
        resetBtn.onclick = async (e) => {
          e.stopPropagation();
          
          if (!confirm("Are you sure you want to reset this poll?")) return;

          const updates = { history: [] };
          if (poll.type === "mc") {
            updates.votes = Array(poll.options.length).fill(0);
            updates.voters = [];
          } else if (poll.type === "free") {
            updates.responses = {};
          }

          await updateDoc(doc(db, "boards", currentBoardId, "polls", pollId), updates);
        };
        div.appendChild(resetBtn);

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑️Delete";
        delBtn.className = "delete-poll teacher-control";
        delBtn.onclick = async (e) => {
          e.stopPropagation();
          await deleteDoc(doc(db, "boards", currentBoardId, "polls", pollId));
        };
        div.appendChild(delBtn);
      }

      pollSection.appendChild(div);
    });
  });
}

// ---------------- Alerts for polls posted live ----------------
const knownVisiblePolls = new Set();

onSnapshot(collection(db, "boards", currentBoardId || "temp", "polls"), snapshot => {
  if (!currentBoardId) return;
  
  snapshot.forEach(docSnap => {
    const poll = docSnap.data();
    const pollId = docSnap.id;

    if (poll.visible && !knownVisiblePolls.has(pollId)) {
      knownVisiblePolls.add(pollId);

      const audio = new Audio('/ping.mp3');
      audio.play().catch(() => {});

      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      if (Notification.permission === "granted") {
        new Notification("New Poll Posted!", {
          body: poll.question || "Check the latest poll",
          icon: "/popboard-logo.png"
        });
      }
    }

    if (!poll.visible && knownVisiblePolls.has(pollId)) {
      knownVisiblePolls.delete(pollId);
    }
  });
});

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

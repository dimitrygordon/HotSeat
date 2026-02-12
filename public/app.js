import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc,
  updateDoc, deleteDoc, serverTimestamp, getDocs, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let username = "";
let isTeacher = false;
let currentBoardId = null;
let myUpvotedPostIds = new Set();
let myPollVotes = new Map();

// DOM
const loginScreen = document.getElementById("loginScreen");
const boardSelector = document.getElementById("boardSelector");
const teacherDashboard = document.getElementById("teacherDashboard");
const mainApp = document.getElementById("mainApp");
const boardSelect = document.getElementById("boardSelect");
const boardList = document.getElementById("boardList");
const boardTitle = document.getElementById("boardTitle");

// Theme (unchanged from before)
const themeToggle = document.getElementById("themeToggle");
const htmlElement = document.documentElement;
// ... (paste your existing theme functions here: setTheme, loadTheme, etc.)

// Simple confetti
function popcornConfetti(x, y) {
  for (let i = 0; i < 12; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = "🍿";
    c.style.left = x + "px";
    c.style.top = y + "px";
    c.style.animationDuration = (1.5 + Math.random() * 1) + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2500);
  }
}

// Load boards list
async function loadBoards() {
  const snap = await getDocs(collection(db, "boards"));
  boardSelect.innerHTML = "";
  boardList.innerHTML = "";

  snap.forEach(d => {
    const b = d.data();
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = b.name;
    boardSelect.appendChild(opt);

    const li = document.createElement("li");
    li.innerHTML = `${b.name} <button data-id="${d.id}" class="enterBoard">Enter</button> <button data-id="${d.id}" class="deleteBoard">Delete</button>`;
    boardList.appendChild(li);
  });
}

// Create board (teacher)
document.getElementById("createBoardBtn").onclick = async () => {
  const name = prompt("New PopBoard name:");
  if (!name) return;
  await addDoc(collection(db, "boards"), { name, createdAt: serverTimestamp() });
  loadBoards();
};

// Join as student flow
document.getElementById("studentJoinBtn").onclick = async () => {
  username = document.getElementById("usernameInput").value.trim();
  if (!username) return;
  loginScreen.classList.add("hidden");
  boardSelector.classList.remove("hidden");
  loadBoards();
};

document.getElementById("joinSelectedBoardBtn").onclick = () => {
  currentBoardId = boardSelect.value;
  if (!currentBoardId) return;
  boardSelector.classList.add("hidden");
  enterBoard();
};

// Teacher login
document.getElementById("teacherLoginBtn").onclick = () => {
  const pass = prompt("Teacher password:");
  if (pass === "dagpopboard") {
    isTeacher = true;
    username = "Dimitry";
    loginScreen.classList.add("hidden");
    teacherDashboard.classList.remove("hidden");
    loadBoards();
  } else {
    alert("Incorrect password");
  }
};

// Enter a board
async function enterBoard() {
  mainApp.classList.remove("hidden");
  boardTitle.textContent = "PopBoard • " + (await getDoc(doc(db, "boards", currentBoardId))).data().name;

  document.getElementById("teacherPanelBtn").classList.toggle("hidden", !isTeacher);
  document.getElementById("backToDashboardBtn").classList.toggle("hidden", !isTeacher);

  loadPosts();
  loadPolls();
}

// Back buttons, etc.
document.getElementById("backToDashboardBtn").onclick = () => {
  mainApp.classList.add("hidden");
  teacherDashboard.classList.remove("hidden");
};

// Post with anonymous toggle + replies
// (Full implementation of threaded posts, upvote toggle, threshold visuals, etc. is in the complete file below)

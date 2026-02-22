import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment, arrayUnion, arrayRemove, where, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

let username = "";
let studentPassword = "";
let isTeacher = false;
let isMasterAdmin = false;
let teacherAccount = "";
let currentBoardId = "";
let currentStudentId = "";
let sortMode = "new";
let leaderboardVisible = true;
let studentEmoji = "";
let myUpvotedPostIds = new Set();
let myPollVotes = new Map();
let postImageFile = null;
let unsubPosts = null;
let unsubPolls = null;
let unsubLeaderboard = null;
let unsubBoardSettings = null;
let studentNickname = "";

const loginDiv = document.getElementById("login");
const teacherLoginDiv = document.getElementById("teacherLogin");
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
const leaderboardSection = document.getElementById("leaderboardSection");
const leaderboardToggleContainer = document.getElementById("leaderboardToggleContainer");
const leaderboardVisibilityBtn = document.getElementById("leaderboardVisibilityBtn");
const emojiPickerContainer = document.getElementById("emojiPickerContainer");
const emojiCircle = document.getElementById("emojiCircle");
const emojiDisplay = document.getElementById("emojiDisplay");
const emojiInput = document.getElementById("emojiInput");
const dailyDashboard = document.getElementById("dailyDashboard");
const themeToggle = document.getElementById("themeToggle");
const themeTogglePortal = document.getElementById("themeTogglePortal");
const themeToggleStudents = document.getElementById("themeToggleStudents");
const themeToggleDashboard = document.getElementById("themeToggleDashboard");
const htmlElement = document.documentElement;
const boardNameInput = document.getElementById("boardNameInput");
const studentPasswordInput = document.getElementById("studentPasswordInput");

function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  var text = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  if (themeToggle) { themeToggle.textContent = text; }
  if (themeTogglePortal) { themeTogglePortal.textContent = text; }
  if (themeToggleStudents) { themeToggleStudents.textContent = text; }
  if (themeToggleDashboard) { themeToggleDashboard.textContent = text; }
}

function loadTheme() {
  var saved = localStorage.getItem("theme");
  if (saved) { setTheme(saved); }
  else { setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
}

function toggleTheme() {
  var current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(e) {
  if (!localStorage.getItem("theme")) { setTheme(e.matches ? "dark" : "light"); }
});

if (themeToggle) { themeToggle.addEventListener("click", toggleTheme); }
if (themeTogglePortal) { themeTogglePortal.addEventListener("click", toggleTheme); }
if (themeToggleStudents) { themeToggleStudents.addEventListener("click", toggleTheme); }
if (themeToggleDashboard) { themeToggleDashboard.addEventListener("click", toggleTheme); }

loadTheme();

function teardownBoardListeners() {
  if (unsubPosts) { unsubPosts(); unsubPosts = null; }
  if (unsubPolls) { unsubPolls(); unsubPolls = null; }
  if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
  if (unsubBoardSettings) { unsubBoardSettings(); unsubBoardSettings = null; }
}

joinBtn.onclick = async function() {
  username = usernameInput.value.trim();
  var boardName = boardNameInput.value.trim();
  studentPassword = studentPasswordInput.value.trim();
  if (!username) { alert("Enter your name to join!"); return; }
  if (!boardName) { alert("Enter the PopBoard name to join!"); return; }
  if (username.toLowerCase() === "dimitry") { alert("This name is reserved."); return; }
  isTeacher = false;
  var q = query(collection(db, "boards"), where("name", "==", boardName));
  var snapshot = await getDocs(q);
  if (snapshot.empty) { alert("Oops! That PopBoard hasn't popped yet. Double-check the name and try again!"); return; }
  var boardData = snapshot.docs[0].data();
  currentBoardId = snapshot.docs[0].id;
  if (username === boardData.teacherAccount) { alert("Nice try, but that's the teacher's name! Choose another to join the popcorn party!"); return; }
  var studentsRef = collection(db, "boards", currentBoardId, "students");
  var studentQuery = query(studentsRef, where("username", "==", username));
  var studentSnapshot = await getDocs(studentQuery);
  if (!studentSnapshot.empty) {
    var existingStudent = studentSnapshot.docs[0];
    var existingPassword = existingStudent.data().password || "";
    if (existingPassword && existingPassword !== studentPassword) { alert("That password didn't pop! Double-check your kernel key!"); return; }
    currentStudentId = existingStudent.id;
    studentEmoji = existingStudent.data().emoji || "";
    studentNickname = existingStudent.data().nickname || "";
  } else {
    var newStudent = await addDoc(studentsRef, {
      username: username,
      password: studentPassword,
      joinedAt: serverTimestamp(),
      historicalComments: 0,
      historicalUpvotesGiven: 0,
      historicalUpvotesReceived: 0,
      historicalPollsCast: 0,
      monthlyStats: {},
      emoji: "",
      nickname: ""
    });
    currentStudentId = newStudent.id;
    studentEmoji = "";
    studentNickname = "";
  }
  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  teacherBtn.classList.add("hidden");
  backToPortalBtn.classList.add("hidden");
  studentsBtn.classList.add("hidden");
  leaderboardToggleContainer.classList.add("hidden");
  dailyDashboard.classList.add("hidden");
  startBoard();
};

document.getElementById("teacherLoginBtn").onclick = function(e) {
  e.preventDefault();
  loginDiv.classList.add("hidden");
  teacherLoginDiv.classList.remove("hidden");
};

backToMainLoginBtn.onclick = function() {
  teacherLoginDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
};

teacherSignInBtn.onclick = async function() {
  var name = teacherNameInput.value.trim();
  var password = teacherPasswordInput.value.trim();
  if (!name || !password) { alert("Enter name and password to enter the kernel command center!"); return; }
  if (name.toLowerCase() === "dimitry" && password === "301718Dag") {
    isMasterAdmin = true;
    isTeacher = true;
    teacherAccount = "Dimitry";
    username = "Dimitry";
    await setDoc(doc(db, "teachers", "Dimitry"), { name: "Dimitry", password: "301718Dag", createdAt: serverTimestamp() }, { merge: true });
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
    return;
  }
  var teacherRef = doc(db, "teachers", name);
  var teacherDoc = await getDoc(teacherRef);
  if (teacherDoc.exists()) {
    if (teacherDoc.data().password === password) {
      teacherAccount = name;
      username = name;
      isTeacher = true;
      teacherLoginDiv.classList.add("hidden");
      boardsPortalDiv.classList.remove("hidden");
      loadBoardsPortal();
    } else {
      alert("That password didn't pop! Double-check your kernel key!");
    }
  } else {
    teacherAccount = name;
    username = name;
    isTeacher = true;
    await setDoc(teacherRef, { name: name, password: password, createdAt: serverTimestamp() });
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
  }
};

logoutBtnPortal.onclick = function() { resetAndLogout(); };
logoutBtnApp.onclick = function() { resetAndLogout(); };
logoutBtnStudents.onclick = function() { resetAndLogout(); };
logoutBtnDashboard.onclick = function() { resetAndLogout(); };

function resetAndLogout() {
  teardownBoardListeners();
  username = "";
  studentPassword = "";
  isTeacher = false;
  isMasterAdmin = false;
  teacherAccount = "";
  currentBoardId = "";
  currentStudentId = "";
  studentEmoji = "";
  myUpvotedPostIds.clear();
  myPollVotes.clear();
  var panels = [boardsPortalDiv, studentsPortalDiv, studentDashboardDiv, appDiv, teacherLoginDiv];
  for (var i = 0; i < panels.length; i++) { panels[i].classList.add("hidden"); }
  loginDiv.classList.remove("hidden");
  usernameInput.value = "";
  if (document.getElementById("boardNameInput")) { document.getElementById("boardNameInput").value = ""; }
  if (document.getElementById("studentPasswordInput")) { document.getElementById("studentPasswordInput").value = ""; }
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
  pollSection.innerHTML = "";
  postsDiv.innerHTML = "";
  leaderboardSection.innerHTML = "";
}

backToPortalBtn.onclick = function() {
  teardownBoardListeners();
  currentBoardId = "";
  appDiv.classList.add("hidden");
  boardsPortalDiv.classList.remove("hidden");
  loadBoardsPortal();
};

studentsBtn.onclick = function() {
  appDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

backToBoardFromStudents.onclick = function() {
  studentsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
};

backToStudentsFromDashboard.onclick = function() {
  studentDashboardDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

async function loadBoardsPortal() {
  boardsList.innerHTML = "";
  if (isMasterAdmin) {
    backToPortalBtn.classList.add("hidden");
    var teachersSnapshot = await getDocs(collection(db, "teachers"));
    var boardsSnapshot = await getDocs(collection(db, "boards"));
    var teacherBoards = {};
    teachersSnapshot.forEach(function(d) {
      if (d.id !== "Dimitry") { teacherBoards[d.id] = []; }
    });
    boardsSnapshot.forEach(function(d) {
      var b = d.data();
      var t = b.teacherAccount || "Unknown";
      if (!teacherBoards[t]) { teacherBoards[t] = []; }
      teacherBoards[t].push({ id: d.id, name: b.name, createdAt: b.createdAt, teacherAccount: b.teacherAccount });
    });
    var masterSection = document.createElement("div");
    masterSection.className = "master-admin-section";
    masterSection.innerHTML = "<h2>Master Admin</h2>";
    for (var teacher in teacherBoards) {
      var tc = document.createElement("div");
      tc.className = "teacher-card";
      tc.innerHTML = "<h4>Teacher: " + teacher + "</h4>";
      var bd = document.createElement("div");
      bd.className = "teacher-boards";
      teacherBoards[teacher].forEach(function(board) { bd.appendChild(createBoardCard(board, true)); });
      var dtBtn = document.createElement("button");
      dtBtn.textContent = "🗑️ Delete Teacher";
      dtBtn.className = "delete-poll teacher-control";
      dtBtn.style.marginTop = "12px";
      (function(t2, boards2) {
        dtBtn.onclick = async function() {
          if (!confirm("Delete teacher " + t2 + " and all boards?")) { return; }
          for (var bi = 0; bi < boards2.length; bi++) { await deleteBoard(boards2[bi].id); }
          await deleteDoc(doc(db, "teachers", t2));
          loadBoardsPortal();
        };
      })(teacher, teacherBoards[teacher]);
      tc.appendChild(bd);
      tc.appendChild(dtBtn);
      masterSection.appendChild(tc);
    }
    boardsList.appendChild(masterSection);
  } else {
    backToPortalBtn.classList.add("hidden");
    var q = query(collection(db, "boards"), where("teacherAccount", "==", teacherAccount));
    onSnapshot(q, function(snapshot) {
      boardsList.innerHTML = "";
      if (snapshot.empty) {
        boardsList.innerHTML = "<p style='text-align:center;margin-top:40px;'>No boards yet.</p>";
        return;
      }
      snapshot.forEach(function(d) {
        boardsList.appendChild(createBoardCard({ id: d.id, name: d.data().name, createdAt: d.data().createdAt }, false));
      });
    });
  }
}

function createBoardCard(board, isMasterView) {
  var card = document.createElement("div");
  card.className = "board-card";
  var info = document.createElement("div");
  info.className = "board-card-info";
  info.innerHTML = "<h3>" + board.name + "</h3><p>Created " + (board.createdAt ? new Date(board.createdAt.seconds * 1000).toLocaleDateString() : "recently") + "</p>";
  var actions = document.createElement("div");
  actions.className = "board-card-actions";
  var enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter";
  (function(bid) {
    enterBtn.onclick = function(e) { e.stopPropagation(); enterBoard(bid); };
  })(board.id);
  actions.appendChild(enterBtn);
  var resetBtn = document.createElement("button");
  resetBtn.textContent = "🔄 Reset";
  resetBtn.className = "teacher-control";
  (function(bid, bname) {
    resetBtn.onclick = async function(e) {
      e.stopPropagation();
      if (!confirm("Reset " + bname + "?")) { return; }
      await resetBoard(bid);
    };
  })(board.id, board.name);
  actions.appendChild(resetBtn);
  var deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️ Delete";
  deleteBtn.className = "delete-poll teacher-control";
  (function(bid, bname) {
    deleteBtn.onclick = async function(e) {
      e.stopPropagation();
      if (!confirm("Delete " + bname + "?")) { return; }
      await deleteBoard(bid);
      if (isMasterView) { loadBoardsPortal(); }
    };
  })(board.id, board.name);
  actions.appendChild(deleteBtn);
  card.appendChild(info);
  card.appendChild(actions);
  (function(bid) { card.onclick = function() { enterBoard(bid); }; })(board.id);
  return card;
}

async function resetBoard(boardId) {
  var cols = ["posts", "replies", "polls", "leaderboard"];
  for (var i = 0; i < cols.length; i++) {
    var snap = await getDocs(collection(db, "boards", boardId, cols[i]));
    for (var j = 0; j < snap.docs.length; j++) { await deleteDoc(snap.docs[j].ref); }
  }
}

async function deleteBoard(boardId) {
  var cols = ["posts", "replies", "polls", "leaderboard"];
  for (var i = 0; i < cols.length; i++) {
    var snap = await getDocs(collection(db, "boards", boardId, cols[i]));
    for (var j = 0; j < snap.docs.length; j++) { await deleteDoc(snap.docs[j].ref); }
  }
  var studentsSnap = await getDocs(collection(db, "boards", boardId, "students"));
  for (var k = 0; k < studentsSnap.docs.length; k++) { await deleteDoc(studentsSnap.docs[k].ref); }
  await deleteDoc(doc(db, "boards", boardId));
}

function enterBoard(boardId) {
  teardownBoardListeners();
  currentBoardId = boardId;
  boardsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  teacherBtn.classList.remove("hidden");
  backToPortalBtn.classList.remove("hidden");
  studentsBtn.classList.remove("hidden");
  leaderboardToggleContainer.classList.remove("hidden");
  dailyDashboard.classList.remove("hidden");
  emojiPickerContainer.classList.add("hidden");
  startBoard();
}

async function startBoard() {
  pollSection.innerHTML = "";
  postsDiv.innerHTML = "";
  leaderboardSection.innerHTML = "";
  listenBoardSettings();
  initLeaderboard();
  loadPosts();
  await loadPolls();
  if (isTeacher) { updateDailyDashboard(); }
  if (!isTeacher) { setupEmojiPicker(); }
}

createBoardBtn.onclick = async function() {
  var boardName = newBoardNameInput.value.trim();
  if (!boardName) { alert("Enter a board name."); return; }
  var q = query(collection(db, "boards"), where("name", "==", boardName));
  var snapshot = await getDocs(q);
  if (!snapshot.empty) { alert("PopBoard name is already taken. Pick a fresh kernel!"); return; }
  await addDoc(collection(db, "boards"), { name: boardName, teacherAccount: teacherAccount, createdAt: serverTimestamp() });
  newBoardNameInput.value = "";
};

function listenBoardSettings() {
  if (unsubBoardSettings) { unsubBoardSettings(); unsubBoardSettings = null; }
  if (!currentBoardId) { return; }
  unsubBoardSettings = onSnapshot(doc(db, "boards", currentBoardId), function(d) {
    if (!d.exists()) { return; }
    leaderboardVisible = d.data().leaderboardVisible !== false;
    applyLeaderboardVisibility();
  });
}

function applyLeaderboardVisibility() {
  if (isTeacher) {
    leaderboardSection.style.display = "";
    leaderboardVisibilityBtn.textContent = leaderboardVisible ? "👁️ Leaderboard Shown" : "👁️‍🗨️ Leaderboard Hidden";
    return;
  }
  var nicknameContainer = document.getElementById("nicknameInputContainer");
  if (leaderboardVisible) {
    leaderboardSection.style.display = "";
    emojiPickerContainer.classList.remove("hidden");
    if (nicknameContainer) { nicknameContainer.style.display = "inline-flex"; }
  } else {
    leaderboardSection.style.display = "none";
    emojiPickerContainer.classList.add("hidden");
    if (nicknameContainer) { nicknameContainer.style.display = "none"; }
  }
}

leaderboardVisibilityBtn.onclick = async function() {
  if (!currentBoardId) { return; }
  leaderboardVisible = !leaderboardVisible;
  await updateDoc(doc(db, "boards", currentBoardId), { leaderboardVisible: leaderboardVisible });
};

function initLeaderboard() {
  if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
  if (!currentBoardId) { return; }
  getDoc(doc(db, "boards", currentBoardId)).then(function(d) {
    leaderboardVisible = d.exists() ? (d.data().leaderboardVisible !== false) : true;
    applyLeaderboardVisibility();
  });
  unsubLeaderboard = onSnapshot(collection(db, "boards", currentBoardId, "leaderboard"), async function(snapshot) {
    var scores = [];
    for (var i = 0; i < snapshot.docs.length; i++) {
      var d = snapshot.docs[i];
      var data = d.data();
      var emoji = data.emoji || "";
      var nickname = data.nickname || "";
      if (!emoji || !nickname) {
        var studentQuery = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", d.id));
        var studentSnap = await getDocs(studentQuery);
        if (!studentSnap.empty) {
          var sData = studentSnap.docs[0].data();
          if (!emoji) { emoji = sData.emoji || ""; }
          if (!nickname) { nickname = sData.nickname || ""; }
        }
      }
      scores.push({ name: d.id, displayName: nickname || d.id, score: data.score || 0, emoji: emoji });
    }
    scores.sort(function(a, b) { return b.score - a.score; });
    if (!isTeacher) {
      var myRank = -1;
      for (var ri = 0; ri < scores.length; ri++) {
        if (scores[ri].name === username) { myRank = ri + 1; break; }
      }
      var rankLabel = document.getElementById("myRankLabel");
      if (!rankLabel) {
        rankLabel = document.createElement("span");
        rankLabel.id = "myRankLabel";
        rankLabel.style.cssText = "font-size:0.85rem;opacity:0.6;white-space:nowrap;";
        var group = document.querySelector(".leaderboard-identity-group");
        if (group) { group.appendChild(rankLabel); }
      }
      if (myRank > 0) {
        var medal = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "";
        rankLabel.textContent = medal ? medal + " #" + myRank : "#" + myRank;
      } else {
        rankLabel.textContent = "";
      }
    }
    renderLeaderboardUI(scores.slice(0, 6));
    renderLeaderboardUI(scores.slice(0, 6));
  });
}

function renderLeaderboardUI(top6) {
  leaderboardSection.innerHTML = "";
  if (!isTeacher && !leaderboardVisible) { return; }
  var card = document.createElement("div");
  card.className = "leaderboard-card";
  card.innerHTML = "<h3>🏆 Leaderboard</h3>";
  if (top6.length === 0) {
    var empty = document.createElement("p");
    empty.textContent = "No scores yet. Answer polls to earn points!";
    card.appendChild(empty);
    leaderboardSection.appendChild(card);
    return;
  }

  var maxScore = 0.1;
  for (var i = 0; i < top6.length; i++) { if (top6[i].score > maxScore) { maxScore = top6[i].score; } }
  var medals = ["🥇", "🥈", "🥉"];
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var place456Color = isDark ? "#1a1a1a" : "#ffffff";
  var barGradients = [
    "linear-gradient(90deg, #f7d700, #fff176, #f9a825, #ffd700)",
    "linear-gradient(90deg, #9e9e9e, #e0e0e0, #bdbdbd, #c0c0c0)",
    "linear-gradient(90deg, #cd7f32, #e8a96a, #b5651d, #cd7f32)",
    place456Color,
    place456Color,
    place456Color
  ];

  // Container for animated rows — position:relative lets children animate with translateY
  var rowContainer = document.createElement("div");
  rowContainer.style.cssText = "position:relative;";
  var ROW_HEIGHT = 48; // px — must match approximate lb-row height including margin
  rowContainer.style.height = (top6.length * ROW_HEIGHT) + "px";

  for (var i = 0; i < top6.length; i++) {
    var entry = top6[i];
    var row = document.createElement("div");
    row.className = "lb-row";
    row.dataset.lbName = entry.name;

    // Position each row absolutely so we can animate it
    row.style.cssText = "position:absolute;width:100%;top:" + (i * ROW_HEIGHT) + "px;transition:top 0.5s cubic-bezier(0.4,0,0.2,1);";

    var nameDiv = document.createElement("div");
    nameDiv.className = "lb-name";
    var nameSpan = document.createElement("span");
    nameSpan.textContent = entry.displayName || entry.name;
    nameDiv.appendChild(nameSpan);
    if (entry.emoji) {
      var eSpan = document.createElement("span");
      eSpan.className = "lb-emoji emoji-animate";
      eSpan.textContent = entry.emoji;
      nameDiv.insertBefore(eSpan, nameSpan);
    }

    var track = document.createElement("div");
    track.className = "lb-bar-track";
    var fill = document.createElement("div");
    fill.className = "lb-bar-fill";
    var targetWidth = Math.max(4, (entry.score / maxScore) * 100);
    // Start at 0 width, then animate to target after paint
    fill.style.width = "0%";
    fill.style.background = barGradients[i];
    fill.style.transition = "width 0.7s cubic-bezier(0.4,0,0.2,1)";
    var scoreSpan = document.createElement("span");
    scoreSpan.className = "lb-score";
    scoreSpan.style.color = i < 3 ? "#1d1d1f" : (isDark ? "white" : "#1d1d1f");
    scoreSpan.textContent = parseFloat(entry.score.toFixed(1)) + " pt";
    fill.appendChild(scoreSpan);
    track.appendChild(fill);

    var medalSpan = document.createElement("span");
    medalSpan.className = "lb-medal";
    if (i < 3) {
      medalSpan.textContent = medals[i];
    } else {
      medalSpan.textContent = "";
      medalSpan.style.width = "1.5rem";
      medalSpan.style.display = "inline-block";
    }

    row.appendChild(nameDiv);
    row.appendChild(track);
    row.appendChild(medalSpan);
    rowContainer.appendChild(row);

    // Animate bar width on next frame so CSS transition fires
    (function(fillEl, width) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          fillEl.style.width = width + "%";
        });
      });
    })(fill, targetWidth);
  }

  card.appendChild(rowContainer);
  leaderboardSection.appendChild(card);
}

async function awardLeaderboardPoints(pollId, correctIndices) {
  var pollSnap = await getDoc(doc(db, "boards", currentBoardId, "polls", pollId));
  if (!pollSnap.exists()) { return; }
  var poll = pollSnap.data();
  var options = poll.options || [];
  var voterData = {};
  var history = poll.history || [];
  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (!entry.username) { continue; }
    var n = entry.username;
    var optText = entry.response || "";
    if (optText.indexOf("Voted: ") === 0) { optText = optText.slice(7); }
    else if (optText.indexOf("Removed vote: ") === 0) { optText = optText.slice(14); }
    var idx = options.indexOf(optText);
    if (idx === -1) { continue; }
    if (!voterData[n]) {
      voterData[n] = { lastIndex: idx, firstTs: entry.timestamp || Date.now() };
    } else {
      voterData[n].lastIndex = idx;
      if (entry.timestamp && entry.timestamp < voterData[n].firstTs) { voterData[n].firstTs = entry.timestamp; }
    }
  }
  var correctStudents = [];
  for (var voterName in voterData) {
    if (correctIndices.indexOf(voterData[voterName].lastIndex) !== -1) {
      correctStudents.push({ name: voterName, ts: voterData[voterName].firstTs });
    }
  }
  if (correctStudents.length === 0) { return; }
  var minTs = correctStudents[0].ts;
  var maxTs = correctStudents[0].ts;
  for (var i = 0; i < correctStudents.length; i++) {
    if (correctStudents[i].ts < minTs) { minTs = correctStudents[i].ts; }
    if (correctStudents[i].ts > maxTs) { maxTs = correctStudents[i].ts; }
  }
  var range = maxTs - minTs || 1;
  var sorted = correctStudents.slice().sort(function(a, b) { return a.ts - b.ts; });
  for (var i = 0; i < correctStudents.length; i++) {
    var student = correctStudents[i];
    var norm = (student.ts - minTs) / range;
    var points = parseFloat((1.0 - norm * 0.8).toFixed(3));
    var rank = -1;
    for (var ri = 0; ri < sorted.length; ri++) { if (sorted[ri].name === student.name) { rank = ri; break; } }

    // ── Save score to leaderboard doc (resets with board) ──────────────────
    var lbRef = doc(db, "boards", currentBoardId, "leaderboard", student.name);
    var lbSnap = await getDoc(lbRef);
    var prevLb = lbSnap.exists() ? lbSnap.data() : { score: 0 };
    await setDoc(lbRef, {
      score: parseFloat(((prevLb.score || 0) + points).toFixed(3))
    }, { merge: true });

    // ── Confetti for the student who just earned a medal ───────────────────
    if (student.name === username && !isTeacher) {
      if (rank === 0 || rank === 1 || rank === 2) {
        var prevScores = [];
        var allLbSnap = await getDocs(collection(db, "boards", currentBoardId, "leaderboard"));
        allLbSnap.forEach(function(d) { prevScores.push({ name: d.id, score: d.data().score || 0 }); });
        prevScores.sort(function(a, b) { return b.score - a.score; });
        var prevRank = -1;
        for (var pri = 0; pri < prevScores.length; pri++) {
          if (prevScores[pri].name === student.name) { prevRank = pri; break; }
        }
        var isImprovement = prevRank === -1 || rank < prevRank;
        if (isImprovement) {
          var medals = ["🥇", "🥈", "🥉"];
          var centerEl = document.getElementById("leaderboardSection");
          if (centerEl) {
            for (var ci = 0; ci < 18; ci++) {
              var p = document.createElement("span");
              p.textContent = medals[rank];
              var rect = centerEl.getBoundingClientRect();
              var startX = rect.left + rect.width / 2;
              var startY = rect.top + rect.height / 2;
              p.style.cssText = "position:fixed;left:" + startX + "px;top:" + startY + "px;font-size:22px;opacity:1;transition:all 1s ease-out;pointer-events:none;z-index:9999;";
              document.body.appendChild(p);
              var x = (Math.random() - 0.5) * 220;
              var y = -Math.random() * 180 - 40;
              (function(el, xv, yv) {
                requestAnimationFrame(function() {
                  el.style.transform = "translate(" + xv + "px," + yv + "px) rotate(" + Math.round(Math.random() * 360) + "deg)";
                  el.style.opacity = "0";
                });
                setTimeout(function() { el.remove(); }, 1000);
              })(p, x, y);
            }
          }
        }
      }
    }

    // ── Save medal counts to student doc (persists across resets) ──────────
    var studentQuery = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", student.name));
    var studentSnap = await getDocs(studentQuery);
    if (studentSnap.empty) { continue; }
    var studentRef = studentSnap.docs[0].ref;
    var studentData = studentSnap.docs[0].data();
    var medalUpdates = {};
    if (rank === 0) { medalUpdates.goldMedals = (studentData.goldMedals || 0) + 1; }
    else if (rank === 1) { medalUpdates.silverMedals = (studentData.silverMedals || 0) + 1; }
    else if (rank === 2) { medalUpdates.bronzeMedals = (studentData.bronzeMedals || 0) + 1; }
    if (Object.keys(medalUpdates).length > 0) { await updateDoc(studentRef, medalUpdates); }
  }
}

function setupEmojiPicker() {
  renderEmojiCircle();
  renderNicknameInput();

  emojiCircle.onclick = function() {
    emojiInput.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;font-size:2rem;text-align:center;z-index:9999;border-radius:50%;opacity:1;pointer-events:all;border:2px solid #0071e3;outline:none;";
    emojiInput.value = "";
    emojiInput.focus();
  };
  emojiInput.oninput = function() {
    var val = emojiInput.value;
    var matches = val.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu);
    if (matches && matches.length > 0) {
      studentEmoji = matches[0];
      emojiInput.style.cssText = "width:0;height:0;opacity:0;position:absolute;pointer-events:none;";
      saveStudentEmoji();
      renderEmojiCircle();
    } else if (val.length > 0) {
      emojiInput.value = "";
    }
  };
  emojiInput.onblur = function() {
    emojiInput.style.cssText = "width:0;height:0;opacity:0;position:absolute;pointer-events:none;";
  };
}

function renderEmojiCircle() {
  emojiDisplay.innerHTML = "";
  if (studentEmoji) {
    var span = document.createElement("span");
    span.className = "emoji-animate";
    span.style.fontSize = "1.6rem";
    span.textContent = studentEmoji;
    emojiDisplay.appendChild(span);
  } else {
    emojiDisplay.textContent = "Choose Emoji";
  }
}

function renderNicknameInput() {
  var container = document.getElementById("nicknameInputContainer");
  if (!container) { return; }
  container.innerHTML = "";
  var input = document.createElement("input");
  input.type = "text";
  input.maxLength = 20;
  input.placeholder = "Leaderboard name (optional)";
  input.value = studentNickname || "";
  input.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 32px);background:transparent;border:none;outline:none;font-size:1rem;color:inherit;text-align:center;letter-spacing:0.02em;";
  input.onblur = async function() {
    var newVal = input.value.trim();
    if (newVal !== studentNickname) {
      studentNickname = newVal;
      await saveStudentNickname();
    }
  };
  input.onkeydown = function(e) { if (e.key === "Enter") { input.blur(); } };
  container.style.position = "relative";
  container.appendChild(input);
}

async function saveStudentNickname() {
  if (!currentStudentId || !currentBoardId) { return; }
  await updateDoc(doc(db, "boards", currentBoardId, "students", currentStudentId), { nickname: studentNickname });
  var lbRef = doc(db, "boards", currentBoardId, "leaderboard", username);
  var lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await updateDoc(lbRef, { nickname: studentNickname });
  }
}

async function saveStudentEmoji() {
  if (!currentStudentId || !currentBoardId) { return; }
  await updateDoc(doc(db, "boards", currentBoardId, "students", currentStudentId), { emoji: studentEmoji });
  var lbRef = doc(db, "boards", currentBoardId, "leaderboard", username);
  var lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await updateDoc(lbRef, { emoji: studentEmoji });
  }
  // Do NOT recreate the leaderboard doc if it doesn't exist —
  // it should only be created when points are awarded
}

async function loadStudentsPortal() {
  studentsList.innerHTML = "";
  var studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var pollsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var totalPolls = pollsSnapshot.size;
  if (studentsSnapshot.empty) {
    studentsList.innerHTML = "<p style='text-align:center;margin-top:40px;'>No students yet.</p>";
    return;
  }
  var allStudentDocs = studentsSnapshot.docs;
  studentsList.appendChild(await buildClassAggregateCard(allStudentDocs, totalPolls, pollsSnapshot));
  for (var i = 0; i < allStudentDocs.length; i++) {
    var studentDoc = allStudentDocs[i];
    var student = studentDoc.data();
    var studentId = studentDoc.id;
    var stats = await calculateStudentStats(studentId, totalPolls, pollsSnapshot);
    var card = document.createElement("div");
    card.className = "board-card";
    var info = document.createElement("div");
    info.className = "board-card-info";
    var pollPct = totalPolls > 0 ? Math.round((stats.pollsVoted / totalPolls) * 100) : 0;
    var engagementData = await computeMonthlyEngagement(studentId, student);
    var currentMonthKey = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0");
    var currentEngagement = 0;
    for (var ei = 0; ei < engagementData.length; ei++) {
      if (engagementData[ei].key === currentMonthKey) { currentEngagement = Math.round(engagementData[ei].value); break; }
    }
    info.innerHTML = "<h3>" + student.username + "</h3><p class='student-stats'>📊 Engagement: " + currentEngagement + "% | Polls: " + stats.pollsVoted + " (" + pollPct + "%) | Comments: " + stats.comments + " | Upvotes Given: " + stats.upvotesGiven + " | Upvotes Received: " + stats.upvotesReceived + " | 🥷🏼 Anonymous: " + stats.anonymousPercentage + "%</p>";
    var actions = document.createElement("div");
    actions.className = "board-card-actions";
    var enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    (function(sid) { enterBtn.onclick = function(e) { e.stopPropagation(); viewStudentDashboard(sid); }; })(studentId);
    var deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️ Delete";
    deleteBtn.className = "delete-poll teacher-control";
    (function(sid, sname) {
      deleteBtn.onclick = async function(e) {
        e.stopPropagation();
        if (!confirm("Delete student " + sname + "?")) { return; }
        await deleteDoc(doc(db, "boards", currentBoardId, "students", sid));
        loadStudentsPortal();
      };
    })(studentId, student.username);
    actions.appendChild(enterBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(info);
    card.appendChild(actions);
    (function(sid) { card.onclick = function() { viewStudentDashboard(sid); }; })(studentId);
    studentsList.appendChild(card);
  }
}

async function buildClassAggregateCard(allStudentDocs, totalPolls, pollsSnapshot) {
  var card = document.createElement("div");
  card.className = "board-card class-aggregate-card";
  var info = document.createElement("div");
  info.className = "board-card-info";
  info.innerHTML = "<h3>📊 Class Aggregate</h3><p>Average across all students</p>";
  var actions = document.createElement("div");
  actions.className = "board-card-actions";
  var enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter";
  enterBtn.onclick = async function(e) { e.stopPropagation(); await viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot); };
  actions.appendChild(enterBtn);
  card.appendChild(info);
  card.appendChild(actions);
  card.onclick = async function() { await viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot); };
  return card;
}

async function viewStudentDashboard(studentId) {
  currentStudentId = studentId;
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.remove("hidden");
  var studentDoc = await getDoc(doc(db, "boards", currentBoardId, "students", studentId));
  var student = studentDoc.data();
  var lbData = { gold: studentDoc.data().goldMedals || 0, silver: studentDoc.data().silverMedals || 0, bronze: studentDoc.data().bronzeMedals || 0 };
  var monthlyEngagement = await computeMonthlyEngagement(studentId, student);
  var monthlyPollsCastPct = await computeMonthlyPollsCastPct(studentId, student);
  var monthlyAnonPct = await computeMonthlyAnonPct(studentId, student);
  var monthlyPollAccuracy = await computeMonthlyPollAccuracy(studentId, student);
  dashboardContent.innerHTML = "<div class='dashboard-header'><h2>" + student.username + "</h2><p>" + (student.password ? "Password: " + student.password : "No password set") + "</p><button id='mergeStudentBtn' class='teacher-control' style='margin-top:16px;'>Merge Student</button></div><div class='metrics-grid' id='metricsGrid'></div>";
  var grid = document.getElementById("metricsGrid");
  var lbCard = document.createElement("div");
  lbCard.className = "metric-card";
  lbCard.innerHTML = "<h3>🏆 Medals</h3><div style='font-size:1.4rem;padding:8px 0;'>🥇 " + (lbData.gold || 0) + " &nbsp; 🥈 " + (lbData.silver || 0) + " &nbsp; 🥉 " + (lbData.bronze || 0) + "</div>";
  grid.appendChild(lbCard);
  addPercentageMetricCard(grid, "📊 Engagement %", monthlyEngagement, "engagementChart");
  addPercentageMetricCard(grid, "🗳️ Polls Cast %", monthlyPollsCastPct, "pollsCastPctChart");
  addPercentageMetricCard(grid, "🥷🏼 Anonymous %", monthlyAnonPct, "anonPctChart");
  addPercentageMetricCard(grid, "🎯 Poll Accuracy %", monthlyPollAccuracy, "pollAccuracyChart");
  addHistoricMetricCard(grid, "Comments Made: " + (student.historicalComments || 0), student.monthlyStats || {}, "comments", "commentsChart");
  addHistoricMetricCard(grid, "Upvotes Given: " + (student.historicalUpvotesGiven || 0), student.monthlyStats || {}, "upvotesGiven", "upvotesGivenChart");
  addHistoricMetricCard(grid, "Upvotes Received: " + (student.historicalUpvotesReceived || 0), student.monthlyStats || {}, "upvotesReceived", "upvotesReceivedChart");
  document.getElementById("mergeStudentBtn").onclick = async function() { await showMergeDialog(studentId); };
}

function addHistoricMetricCard(grid, title, monthlyStats, metric, canvasId) {
  var card = document.createElement("div");
  card.className = "metric-card";
  card.innerHTML = "<h3>" + title + "</h3><canvas id='" + canvasId + "' width='400' height='200'></canvas>";
  grid.appendChild(card);
  drawChart(canvasId, monthlyStats, metric);
}

function addPercentageMetricCard(grid, title, monthlyData, canvasId) {
  var card = document.createElement("div");
  card.className = "metric-card";
  card.innerHTML = "<h3>" + title + "</h3><canvas id='" + canvasId + "' width='400' height='200'></canvas>";
  grid.appendChild(card);
  drawPercentageChart(canvasId, monthlyData);
}

async function viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot) {
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.remove("hidden");
  var months = getLastTwelveMonthKeys();
  var n = allStudentDocs.length || 1;
  var totComments = 0;
  var totUpvGiven = 0;
  var totUpvReceived = 0;
  var avgMonthlyStats = {};
  for (var mi = 0; mi < months.length; mi++) {
    avgMonthlyStats[months[mi]] = { comments: 0, upvotesGiven: 0, upvotesReceived: 0, pollsCast: 0 };
  }
  for (var i = 0; i < allStudentDocs.length; i++) {
    var s = allStudentDocs[i].data();
    totComments += s.historicalComments || 0;
    totUpvGiven += s.historicalUpvotesGiven || 0;
    totUpvReceived += s.historicalUpvotesReceived || 0;
    for (var mi = 0; mi < months.length; mi++) {
      var m = months[mi];
      if (s.monthlyStats && s.monthlyStats[m]) {
        avgMonthlyStats[m].comments += (s.monthlyStats[m].comments || 0) / n;
        avgMonthlyStats[m].upvotesGiven += (s.monthlyStats[m].upvotesGiven || 0) / n;
        avgMonthlyStats[m].upvotesReceived += (s.monthlyStats[m].upvotesReceived || 0) / n;
        avgMonthlyStats[m].pollsCast += (s.monthlyStats[m].pollsCast || 0) / n;
      }
    }
  }
  var lbSnap = await getDocs(collection(db, "boards", currentBoardId, "leaderboard"));
  var lbScores = [];
  lbSnap.forEach(function(d) {
    var data = d.data();
    lbScores.push({ name: d.id, pts: (data.gold || 0) * 3 + (data.silver || 0) * 2 + (data.bronze || 0) });
  });
  lbScores.sort(function(a, b) { return b.pts - a.pts; });
  var top3 = lbScores.slice(0, 3);
  dashboardContent.innerHTML = "<div class='dashboard-header'><h2>📊 Class Aggregate</h2><p>Mean across all " + n + " students</p></div><div class='metrics-grid' id='metricsGridAgg'></div>";
  var grid = document.getElementById("metricsGridAgg");
  var medals = ["🥇", "🥈", "🥉"];
  var top3Html = top3.length > 0 ? top3.map(function(s, i) { return medals[i] + " " + s.name; }).join("<br>") : "No data yet";
  var lbCard = document.createElement("div");
  lbCard.className = "metric-card";
  lbCard.innerHTML = "<h3>🏆 Top Students</h3><div class='leaderboard-summary-box'>" + top3Html + "</div>";
  grid.appendChild(lbCard);
  addPercentageMetricCard(grid, "📊 Engagement %", await computeClassAggregatePercent(allStudentDocs, "engagement"), "aggEngagementChart");
  addPercentageMetricCard(grid, "🗳️ Polls Cast %", await computeClassAggregatePercent(allStudentDocs, "pollsCast"), "aggPollsChart");
  addPercentageMetricCard(grid, "🥷🏼 Anonymous %", await computeClassAggregatePercent(allStudentDocs, "anon"), "aggAnonChart");
  addPercentageMetricCard(grid, "🎯 Poll Accuracy %", await computeClassAggregatePercent(allStudentDocs, "accuracy"), "aggAccuracyChart");
  addHistoricMetricCard(grid, "Comments (avg): " + Math.round(totComments / n), avgMonthlyStats, "comments", "aggCommentsChart");
  addHistoricMetricCard(grid, "Upvotes Given (avg): " + Math.round(totUpvGiven / n), avgMonthlyStats, "upvotesGiven", "aggUpvGivenChart");
  addHistoricMetricCard(grid, "Upvotes Received (avg): " + Math.round(totUpvReceived / n), avgMonthlyStats, "upvotesReceived", "aggUpvRecChart");
}

async function computeClassAggregatePercent(allStudentDocs, type) {
  var months = getLastTwelveMonthKeys();
  var sumByMonth = {};
  for (var mi = 0; mi < months.length; mi++) { sumByMonth[months[mi]] = 0; }
  var count = 0;
  for (var i = 0; i < allStudentDocs.length; i++) {
    var s = allStudentDocs[i].data();
    var data;
    if (type === "engagement") { data = await computeMonthlyEngagement(allStudentDocs[i].id, s); }
    else if (type === "pollsCast") { data = await computeMonthlyPollsCastPct(allStudentDocs[i].id, s); }
    else if (type === "anon") { data = await computeMonthlyAnonPct(allStudentDocs[i].id, s); }
    else if (type === "accuracy") { data = await computeMonthlyPollAccuracy(allStudentDocs[i].id, s); }
    if (data) {
      for (var di = 0; di < data.length; di++) { sumByMonth[data[di].key] = (sumByMonth[data[di].key] || 0) + data[di].value; }
      count++;
    }
  }
  var nCount = count || 1;
  var result = [];
  for (var mi = 0; mi < months.length; mi++) {
    var key = months[mi];
    var d = new Date();
    d.setMonth(d.getMonth() - (11 - mi));
    result.push({ key: key, label: d.toLocaleString("en", { month: "short" }).toUpperCase(), value: sumByMonth[key] / nCount });
  }
  return result;
}

function getLastTwelveMonthKeys() {
  var keys = [];
  var now = new Date();
  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return keys;
}

async function computeMonthlyEngagement(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var joinedAt = student.joinedAt && student.joinedAt.toDate ? student.joinedAt.toDate() : new Date(0);
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var parts = monthKey.split("-");
    var yr = parseInt(parts[0]);
    var mo = parseInt(parts[1]);
    var monthEnd = new Date(yr, mo, 0, 23, 59, 59);
    if (monthEnd < joinedAt) { results.push({ key: monthKey, label: getMonthLabel(monthKey), value: 0 }); continue; }
    var totalOpp = 0;
    var participated = 0;
    var primaryCommentCount = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
      if (!hasInteraction) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      totalOpp++;
      var voted = poll.type === "mc" ? (poll.voters || []).indexOf(student.username) !== -1 : (poll.history || []).some(function(h) { return h.username === student.username; });
      if (voted) { participated++; }
    });
    postsSnap.forEach(function(pd) {
      var post = pd.data();
      var postTime = post.timestamp && post.timestamp.toDate ? post.timestamp.toDate() : null;
      if (!postTime || postTime < joinedAt) { return; }
      var pk = postTime.getFullYear() + "-" + String(postTime.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      if (post.author === student.username) { primaryCommentCount++; return; }
      totalOpp++;
      var upvoted = (post.upvoters || []).indexOf(student.username) !== -1;
      var replied = repliesSnap.docs.some(function(rd) { return rd.data().postId === pd.id && rd.data().author === student.username; });
      if (upvoted || replied) { participated++; }
    });
    var pct = totalOpp > 0 ? (participated / totalOpp) * 100 : 0;
    pct = Math.min(pct + Math.min(primaryCommentCount * 2, 50), 100);
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: pct });
  }
  return results;
}

async function computeMonthlyPollsCastPct(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var joinedAt = student.joinedAt && student.joinedAt.toDate ? student.joinedAt.toDate() : new Date(0);
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var parts = monthKey.split("-");
    var yr = parseInt(parts[0]);
    var mo = parseInt(parts[1]);
    var monthEnd = new Date(yr, mo, 0, 23, 59, 59);
    if (monthEnd < joinedAt) { results.push({ key: monthKey, label: getMonthLabel(monthKey), value: 0 }); continue; }
    var total = 0;
    var voted = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
      if (!hasInteraction) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      total++;
      var v = poll.type === "mc" ? (poll.voters || []).indexOf(student.username) !== -1 : (poll.history || []).some(function(h) { return h.username === student.username; });
      if (v) { voted++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: total > 0 ? (voted / total) * 100 : 0 });
  }
  return results;
}

async function computeMonthlyAnonPct(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var total = 0;
    var anon = 0;
    postsSnap.forEach(function(pd) {
      var p = pd.data();
      if (p.author !== student.username) { return; }
      var t = p.timestamp && p.timestamp.toDate ? p.timestamp.toDate() : null;
      if (!t) { return; }
      var pk = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      total++;
      if (p.anonymous) { anon++; }
    });
    repliesSnap.forEach(function(rd) {
      var r = rd.data();
      if (r.author !== student.username) { return; }
      var t = r.timestamp && r.timestamp.toDate ? r.timestamp.toDate() : null;
      if (!t) { return; }
      var pk = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      total++;
      if (r.anonymous) { anon++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: total > 0 ? (anon / total) * 100 : 0 });
  }
  return results;
}

async function computeMonthlyPollAccuracy(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var participated = 0;
    var correct = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      if (poll.type !== "mc") { return; }
      if ((poll.voters || []).indexOf(student.username) === -1) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      participated++;
      if (!poll.correctIndices || poll.correctIndices.length === 0) { return; }
      var voterEntries = (poll.history || []).filter(function(e) { return e.username === student.username; });
      if (!voterEntries.length) { return; }
      var last = voterEntries[voterEntries.length - 1];
      var optText = last.response || "";
      if (optText.indexOf("Voted: ") === 0) { optText = optText.slice(7); }
      else if (optText.indexOf("Removed vote: ") === 0) { optText = optText.slice(14); }
      if (poll.correctIndices.indexOf((poll.options || []).indexOf(optText)) !== -1) { correct++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: participated > 0 ? (correct / participated) * 100 : 0 });
  }
  return results;
}

function getMonthLabel(monthKey) {
  var parts = monthKey.split("-");
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleString("en", { month: "short" }).toUpperCase();
}

function drawChart(canvasId, monthlyStats, metric) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var months = getLastTwelveMonthKeys();
  var data = [];
  for (var i = 0; i < months.length; i++) {
    var key = months[i];
    data.push({ key: key, label: getMonthLabel(key), value: monthlyStats[key] && monthlyStats[key][metric] ? monthlyStats[key][metric] : 0 });
  }
  var maxValue = 1;
  for (var i = 0; i < data.length; i++) { if (data[i].value > maxValue) { maxValue = data[i].value; } }
  var padding = 40;
  var chartWidth = canvas.width - padding * 2;
  var chartHeight = canvas.height - padding * 2;
  var pointSpacing = chartWidth / (data.length - 1);
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var x = padding + i * pointSpacing;
    var y = padding + chartHeight - (data[i].value / maxValue) * chartHeight;
    if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
  }
  ctx.stroke();
  ctx.fillStyle = "#d4a373";
  for (var i = 0; i < data.length; i++) {
    var x = padding + i * pointSpacing;
    var y = padding + chartHeight - (data[i].value / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1d1d1f";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  for (var i = 0; i < data.length; i++) {
    if (i % 2 === 0 || i === data.length - 1) {
      ctx.fillText(data[i].label, padding + i * pointSpacing, canvas.height - 10);
    }
  }
}

function drawPercentageChart(canvasId, monthlyData) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!monthlyData || monthlyData.length === 0) { return; }
  var padding = 40;
  var chartWidth = canvas.width - padding * 2;
  var chartHeight = canvas.height - padding * 2;
  var pointSpacing = chartWidth / (monthlyData.length - 1);
  var rollingAvg = [];
  for (var i = 0; i < monthlyData.length; i++) {
    var sum = 0;
    for (var j = 0; j <= i; j++) { sum += monthlyData[j].value; }
    rollingAvg.push({ key: monthlyData[i].key, label: monthlyData[i].label, value: sum / (i + 1) });
  }
  drawColoredLine(ctx, monthlyData, padding, chartWidth, chartHeight, pointSpacing, 100, false);
  drawColoredLine(ctx, rollingAvg, padding, chartWidth, chartHeight, pointSpacing, 100, true);
  ctx.fillStyle = "#1d1d1f";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  for (var i = 0; i < monthlyData.length; i++) {
    if (i % 2 === 0 || i === monthlyData.length - 1) {
      ctx.fillText(monthlyData[i].label, padding + i * pointSpacing, canvas.height - 10);
    }
  }
}

function getEngagementColor(pct) {
  var p = Math.max(0, Math.min(100, pct));
  if (p <= 33.333) { var t = p / 33.333; return "rgb(" + Math.round(128 + t * 127) + ",0,0)"; }
  if (p <= 66.666) { var t = (p - 33.333) / 33.333; return "rgb(255," + Math.round(t * 204) + ",0)"; }
  var t = (p - 66.666) / 33.334;
  return "rgb(" + Math.round(255 * (1 - t)) + "," + Math.round(180 + t * 75) + ",0)";
}

function drawColoredLine(ctx, data, padding, chartWidth, chartHeight, pointSpacing, maxVal, dotted) {
  if (data.length < 2) { return; }
  ctx.save();
  ctx.lineWidth = dotted ? 2 : 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dotted) { ctx.setLineDash([6, 4]); } else { ctx.setLineDash([]); }
  for (var i = 1; i < data.length; i++) {
    var x0 = padding + (i - 1) * pointSpacing;
    var y0 = padding + chartHeight - (data[i - 1].value / maxVal) * chartHeight;
    var x1 = padding + i * pointSpacing;
    var y1 = padding + chartHeight - (data[i].value / maxVal) * chartHeight;
    ctx.strokeStyle = getEngagementColor((data[i - 1].value + data[i].value) / 2);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  if (!dotted) {
    for (var i = 0; i < data.length; i++) {
      var x = padding + i * pointSpacing;
      var y = padding + chartHeight - (data[i].value / maxVal) * chartHeight;
      ctx.fillStyle = getEngagementColor(data[i].value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

async function showMergeDialog(sid) {
  var snap = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var students = [];
  snap.forEach(function(d) { if (d.id !== sid) { students.push({ id: d.id, username: d.data().username }); } });
  if (!students.length) { alert("No other students to merge with."); return; }
  var promptText = "Select student to merge with:\n\n";
  for (var i = 0; i < students.length; i++) { promptText += (i + 1) + ". " + students[i].username + "\n"; }
  promptText += "\nEnter number:";
  var sel = prompt(promptText);
  var idx = parseInt(sel) - 1;
  if (isNaN(idx) || idx < 0 || idx >= students.length) { alert("Invalid selection."); return; }
  if (!confirm("Merge " + students[idx].username + " into current student?")) { return; }
  await mergeStudents(sid, students[idx].id);
}

async function mergeStudents(keepId, mergeId) {
  var keepRef = doc(db, "boards", currentBoardId, "students", keepId);
  var mergeRef = doc(db, "boards", currentBoardId, "students", mergeId);
  var keepData = (await getDoc(keepRef)).data();
  var mergeData = (await getDoc(mergeRef)).data();
  var mergedH = {
    historicalComments: (keepData.historicalComments || 0) + (mergeData.historicalComments || 0),
    historicalUpvotesGiven: (keepData.historicalUpvotesGiven || 0) + (mergeData.historicalUpvotesGiven || 0),
    historicalUpvotesReceived: (keepData.historicalUpvotesReceived || 0) + (mergeData.historicalUpvotesReceived || 0),
    historicalPollsCast: (keepData.historicalPollsCast || 0) + (mergeData.historicalPollsCast || 0),
    goldMedals: (keepData.goldMedals || 0) + (mergeData.goldMedals || 0),
    silverMedals: (keepData.silverMedals || 0) + (mergeData.silverMedals || 0),
    bronzeMedals: (keepData.bronzeMedals || 0) + (mergeData.bronzeMedals || 0)
  };
  var mergedM = Object.assign({}, keepData.monthlyStats || {});
  var mergeStats = mergeData.monthlyStats || {};
  for (var m in mergeStats) {
    if (!mergedM[m]) { mergedM[m] = mergeStats[m]; }
    else {
      mergedM[m] = {
        comments: (mergedM[m].comments || 0) + (mergeStats[m].comments || 0),
        upvotesGiven: (mergedM[m].upvotesGiven || 0) + (mergeStats[m].upvotesGiven || 0),
        upvotesReceived: (mergedM[m].upvotesReceived || 0) + (mergeStats[m].upvotesReceived || 0),
        pollsCast: (mergedM[m].pollsCast || 0) + (mergeStats[m].pollsCast || 0)
      };
    }
  }
  var updateData = { monthlyStats: mergedM };
  for (var key in mergedH) { updateData[key] = mergedH[key]; }
  await updateDoc(keepRef, updateData);

  // ── Merge leaderboard docs ─────────────────────────────────────────────
  var keepLbRef = doc(db, "boards", currentBoardId, "leaderboard", keepData.username);
  var mergeLbRef = doc(db, "boards", currentBoardId, "leaderboard", mergeData.username);
  var keepLbSnap = await getDoc(keepLbRef);
  var mergeLbSnap = await getDoc(mergeLbRef);
  if (mergeLbSnap.exists()) {
    var mergedScore = (keepLbSnap.exists() ? keepLbSnap.data().score || 0 : 0) + (mergeLbSnap.data().score || 0);
    var mergedEmoji = (keepLbSnap.exists() && keepLbSnap.data().emoji) ? keepLbSnap.data().emoji : (mergeLbSnap.data().emoji || "");
    var mergedNickname = (keepLbSnap.exists() && keepLbSnap.data().nickname) ? keepLbSnap.data().nickname : (mergeLbSnap.data().nickname || "");
    await setDoc(keepLbRef, { score: parseFloat(mergedScore.toFixed(3)), emoji: mergedEmoji, nickname: mergedNickname }, { merge: true });
    await deleteDoc(mergeLbRef);
  }

  await deleteDoc(mergeRef);
  alert("Students merged successfully.");
  viewStudentDashboard(keepId);
}

async function calculateStudentStats(studentId, totalPolls, pollsSnapshot) {
  var student = (await getDoc(doc(db, "boards", currentBoardId, "students", studentId))).data();
  var pollsVoted = 0;
  pollsSnapshot.forEach(function(pd) {
    var poll = pd.data();
    if (poll.type === "mc" && (poll.voters || []).indexOf(student.username) !== -1) { pollsVoted++; }
    else if (poll.type === "free" && (poll.history || []).some(function(h) { return h.username === student.username; })) { pollsVoted++; }
  });
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var comments = 0;
  var anonComments = 0;
  var upvotesGiven = 0;
  var upvotesReceived = 0;
  postsSnap.forEach(function(pd) {
    var p = pd.data();
    if (p.author !== student.username) { return; }
    comments++;
    if (p.anonymous) { anonComments++; }
  });
  repliesSnap.forEach(function(rd) {
    var r = rd.data();
    if (r.author !== student.username) { return; }
    comments++;
    if (r.anonymous) { anonComments++; }
  });
  postsSnap.forEach(function(pd) {
    var p = pd.data();
    if ((p.upvoters || []).indexOf(student.username) !== -1) { upvotesGiven++; }
    if (p.author === student.username) { upvotesReceived += p.upvotes || 0; }
  });
  return {
    pollsVoted: pollsVoted,
    comments: comments,
    upvotesGiven: upvotesGiven,
    upvotesReceived: upvotesReceived,
    anonymousPercentage: comments > 0 ? Math.round((anonComments / comments) * 100) : 0
  };
}

async function incrementStudentStat(studentId, metric, amount) {
  if (amount === undefined) { amount = 1; }
  if (!studentId) { return; }
  var studentRef = doc(db, "boards", currentBoardId, "students", studentId);
  var studentDoc = await getDoc(studentRef);
  if (!studentDoc.exists()) { return; }
  var student = studentDoc.data();
  var monthlyStats = student.monthlyStats || {};
  var now = new Date();
  var monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  if (!monthlyStats[monthKey]) { monthlyStats[monthKey] = { comments: 0, upvotesGiven: 0, upvotesReceived: 0, pollsCast: 0 }; }
  monthlyStats[monthKey][metric] = (monthlyStats[monthKey][metric] || 0) + amount;
  var updates = { monthlyStats: monthlyStats };
  var hKey = "historical" + metric.charAt(0).toUpperCase() + metric.slice(1);
  updates[hKey] = (student[hKey] || 0) + amount;
  await updateDoc(studentRef, updates);
}

async function uploadImage(file, folder) {
  var storageRef = ref(storage, folder + "/" + Date.now() + "-" + file.name);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function showImagePreview(file, previewElement, removeCallback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    previewElement.innerHTML = "<img src='" + e.target.result + "' /><button class='remove-image'>x</button>";
    previewElement.querySelector(".remove-image").onclick = removeCallback;
  };
  reader.readAsDataURL(file);
}

function showImageLightbox(imageUrl) {
  var lb = document.createElement("div");
  lb.className = "image-lightbox";
  lb.innerHTML = "<img src='" + imageUrl + "' />";
  lb.onclick = function() { lb.remove(); };
  document.body.appendChild(lb);
}

postImageBtn.onclick = function() { postImageInput.click(); };
postImageInput.onchange = function(e) {
  var file = e.target.files[0];
  if (!file) { return; }
  if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
  postImageFile = file;
  showImagePreview(file, postImagePreview, function() { postImageFile = null; postImagePreview.innerHTML = ""; postImageInput.value = ""; });
};

postBtn.onclick = async function() {
  var text = postInput.value.trim();
  if (!text && !postImageFile) { alert("Please enter text or attach an image."); return; }
  var anonymous = document.getElementById("anonymousToggle") ? document.getElementById("anonymousToggle").checked : false;
  var imageUrl = null;
  if (postImageFile) { imageUrl = await uploadImage(postImageFile, "boards/" + currentBoardId + "/posts"); }
  await addDoc(collection(db, "boards", currentBoardId, "posts"), {
    author: username, text: text, anonymous: anonymous, imageUrl: imageUrl,
    upvotes: 0, upvoters: [], upvoteHistory: [], timestamp: serverTimestamp()
  });
  if (currentStudentId) { await incrementStudentStat(currentStudentId, "comments"); }
  postInput.value = "";
  postImageFile = null;
  postImagePreview.innerHTML = "";
  postImageInput.value = "";
  if (document.getElementById("anonymousToggle")) { document.getElementById("anonymousToggle").checked = false; }
};

sortSelect.onchange = function() { sortMode = sortSelect.value; loadPosts(); };

function createPopcornConfetti(el) {
  for (var i = 0; i < 6; i++) {
    var p = document.createElement("span");
    p.textContent = "🍿";
    var rect = el.getBoundingClientRect();
    p.style.cssText = "position:fixed;left:" + rect.left + "px;top:" + rect.top + "px;font-size:16px;opacity:1;transition:all 0.8s ease-out;pointer-events:none;z-index:9999;";
    document.body.appendChild(p);
    var x = (Math.random() - 0.5) * 60;
    var y = -Math.random() * 60 - 20;
    (function(el2, xv, yv) {
      requestAnimationFrame(function() {
        el2.style.transform = "translate(" + xv + "px," + yv + "px) rotate(" + Math.round(Math.random() * 360) + "deg)";
        el2.style.opacity = 0;
      });
      setTimeout(function() { el2.remove(); }, 800);
    })(p, x, y);
  }
}

async function addReply(postId, text, anonymous, imageUrl) {
  if (!anonymous) { anonymous = false; }
  if (!imageUrl) { imageUrl = null; }
  if (!text && !imageUrl) { return; }
  await addDoc(collection(db, "boards", currentBoardId, "replies"), {
    postId: postId, author: username, text: text, anonymous: anonymous, imageUrl: imageUrl, timestamp: serverTimestamp()
  });
  if (currentStudentId) { await incrementStudentStat(currentStudentId, "comments"); }
}

function loadReplies(postId, container, parentVisible) {
  if (parentVisible === undefined) { parentVisible = true; }
  var q = query(collection(db, "boards", currentBoardId, "replies"), orderBy("timestamp", "asc"));
  onSnapshot(q, function(snap) {
    container.innerHTML = "";
    snap.forEach(function(d) {
      var r = d.data();
      if (r.postId !== postId) { return; }
      if (r.visible === undefined) { r.visible = true; }
      if (!r.visible && !isTeacher) { return; }
      if (!parentVisible && !isTeacher) { return; }
      var div = document.createElement("div");
      div.className = "reply";
      if (!r.visible) { div.classList.add("hidden-comment"); }
      div.innerHTML = "<strong>" + (r.anonymous && !isTeacher ? "🥷🏼 Anonymous" : r.author) + "</strong> " + r.text;
      if (r.imageUrl) {
        var img = document.createElement("img");
        img.src = r.imageUrl;
        img.className = "comment-image";
        (function(url) { img.onclick = function() { showImageLightbox(url); }; })(r.imageUrl);
        div.appendChild(img);
      }
      if (isTeacher) {
        var hBtn = document.createElement("button");
        hBtn.textContent = r.visible ? "👁️ Shown" : "👁️‍🗨️ Hidden";
        hBtn.className = "hide-toggle teacher-control";
        (function(docId, vis) {
          hBtn.onclick = async function() { await updateDoc(doc(db, "boards", currentBoardId, "replies", docId), { visible: !vis }); };
        })(d.id, r.visible);
        div.appendChild(hBtn);
        var delBtn = document.createElement("button");
        delBtn.textContent = "🗑️ Delete";
        delBtn.className = "delete-btn teacher-control";
        (function(docId) {
          delBtn.onclick = async function() { await deleteDoc(doc(db, "boards", currentBoardId, "replies", docId)); };
        })(d.id);
        div.appendChild(delBtn);
      }
      container.appendChild(div);
    });
  });
}

function loadPosts() {
  if (!currentBoardId) { return; }
  if (unsubPosts) { unsubPosts(); unsubPosts = null; }
  var orderField = sortMode === "new" ? "timestamp" : "upvotes";
  var q = query(collection(db, "boards", currentBoardId, "posts"), orderBy(orderField, "desc"));
  unsubPosts = onSnapshot(q, function(snapshot) {
    postsDiv.innerHTML = "";
    snapshot.forEach(function(docSnap) {
      var post = docSnap.data();
      var postId = docSnap.id;
      if (post.visible === undefined) { post.visible = true; }
      if (!post.visible && !isTeacher) { return; }
      if (post.upvoters && post.upvoters.indexOf(username) !== -1) { myUpvotedPostIds.add(postId); } else { myUpvotedPostIds.delete(postId); }
      var div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postId)) { div.classList.add("upvoted-by-me"); }
      if (!post.visible) { div.classList.add("hidden-comment"); }
      var displayName = post.anonymous && !isTeacher ? "🥷🏼 Anonymous" : post.author;
      div.innerHTML = "<strong>" + displayName + "</strong><br>" + post.text + "<br><span class='upvote'>🍿 " + (post.upvotes || 0) + "</span><button class='reply-btn teacher-control'>Reply</button>";
      if (post.imageUrl) {
        var img = document.createElement("img");
        img.src = post.imageUrl;
        img.className = "comment-image";
        (function(url) { img.onclick = function() { showImageLightbox(url); }; })(post.imageUrl);
        div.appendChild(img);
      }
      if (isTeacher) {
        var hBtn = document.createElement("button");
        hBtn.textContent = post.visible ? "👁️ Shown" : "👁️‍🗨️ Hidden";
        hBtn.className = "hide-toggle teacher-control";
        (function(pid, vis) {
          hBtn.onclick = async function(e) {
            e.stopPropagation();
            var newV = !vis;
            await updateDoc(doc(db, "boards", currentBoardId, "posts", pid), { visible: newV });
            var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
            rSnap.forEach(function(rd) {
              if (rd.data().postId === pid) { updateDoc(doc(db, "boards", currentBoardId, "replies", rd.id), { visible: newV }); }
            });
          };
        })(postId, post.visible);
        div.appendChild(hBtn);
        var delBtn = document.createElement("button");
        delBtn.textContent = "🗑️ Delete";
        delBtn.className = "delete teacher-control";
        (function(pid) {
          delBtn.onclick = async function(e) {
            e.stopPropagation();
            var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
            rSnap.forEach(function(rd) { if (rd.data().postId === pid) { deleteDoc(doc(db, "boards", currentBoardId, "replies", rd.id)); } });
            await deleteDoc(doc(db, "boards", currentBoardId, "posts", pid));
          };
        })(postId);
        div.appendChild(delBtn);
      }
      var upvoteSpan = div.querySelector(".upvote");
      (function(pid, postData) {
        upvoteSpan.onclick = async function(e) {
          e.stopPropagation();
          createPopcornConfetti(upvoteSpan);
          if (navigator.vibrate) { navigator.vibrate(25); }
          var postRef = doc(db, "boards", currentBoardId, "posts", pid);
          var already = postData.upvoters && postData.upvoters.indexOf(username) !== -1;
          if (already) {
            await updateDoc(postRef, { upvoters: arrayRemove(username), upvotes: increment(-1), upvoteHistory: arrayUnion(username + ": Removed Upvote") });
            if (currentStudentId) { await incrementStudentStat(currentStudentId, "upvotesGiven", -1); }
          } else {
            await updateDoc(postRef, { upvoters: arrayUnion(username), upvotes: increment(1), upvoteHistory: arrayUnion(username + ": Upvoted") });
            if (currentStudentId) { await incrementStudentStat(currentStudentId, "upvotesGiven", 1); }
            if (postData.author !== username) {
              var aq = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", postData.author));
              var aSnap = await getDocs(aq);
              if (!aSnap.empty) { await incrementStudentStat(aSnap.docs[0].id, "upvotesReceived", 1); }
            }
          }
        };
      })(postId, post);
      if (isTeacher && post.upvoteHistory && post.upvoteHistory.length > 0) {
        var hDiv = document.createElement("div");
        hDiv.className = "comment-upvote-history";
        hDiv.innerHTML = "<strong>Upvote Log:</strong>";
        post.upvoteHistory.forEach(function(entry) {
          var d = document.createElement("div");
          d.textContent = entry;
          hDiv.appendChild(d);
        });
        div.appendChild(hDiv);
      }
      var repliesDiv = document.createElement("div");
      loadReplies(postId, repliesDiv, post.visible);
      var replyBtn = div.querySelector(".reply-btn");
      (function(pid) {
        replyBtn.onclick = function(e) {
          e.stopPropagation();
          var input = document.createElement("textarea");
          input.className = "reply-input";
          input.placeholder = "Reply...";
          var anonWrapper = document.createElement("div");
          anonWrapper.className = "post-options";
          var anonCheck = document.createElement("input");
          anonCheck.type = "checkbox";
          anonCheck.id = "rA-" + pid;
          var label = document.createElement("label");
          label.htmlFor = "rA-" + pid;
          label.textContent = "🥷🏼 Anonymous";
          var riInput = document.createElement("input");
          riInput.type = "file";
          riInput.accept = "image/*";
          riInput.style.display = "none";
          var riBtn = document.createElement("button");
          riBtn.textContent = "📷 Add Image";
          riBtn.className = "secondary-btn teacher-control";
          riBtn.onclick = function() { riInput.click(); };
          var riPreview = document.createElement("div");
          riPreview.className = "image-preview";
          var replyImageFile = null;
          riInput.onchange = function(ev) {
            var f = ev.target.files[0];
            if (!f || !f.type.startsWith("image/")) { return; }
            replyImageFile = f;
            showImagePreview(f, riPreview, function() { replyImageFile = null; riPreview.innerHTML = ""; riInput.value = ""; });
          };
          anonWrapper.appendChild(anonCheck);
          anonWrapper.appendChild(label);
          anonWrapper.appendChild(riBtn);
          var send = document.createElement("button");
          send.textContent = "Send";
          send.className = "teacher-control";
          send.onclick = async function(ev) {
            ev.stopPropagation();
            var iUrl = null;
            if (replyImageFile) { iUrl = await uploadImage(replyImageFile, "boards/" + currentBoardId + "/replies"); }
            await addReply(pid, input.value, anonCheck.checked, iUrl);
            input.remove(); anonWrapper.remove(); send.remove(); riInput.remove(); riPreview.remove();
          };
          div.appendChild(input);
          div.appendChild(anonWrapper);
          div.appendChild(riPreview);
          div.appendChild(send);
        };
      })(postId);
      div.appendChild(repliesDiv);
      postsDiv.appendChild(div);
    });
  });
}

teacherBtn.addEventListener("click", function() {
  if (!pollCreation.classList.contains("hidden")) {
    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    return;
  }
  pollCreation.innerHTML = "<h3>Create Poll</h3><div class='poll-type-buttons' id='pollTypeBtns'><button type='button' id='mcBtn' class='teacher-control'>Multiple Choice</button><button type='button' id='freeBtn' class='teacher-control'>Free Response</button></div><input type='text' id='pollQuestionInput' placeholder='Poll question' style='display:none;' /><div id='mcOptionsContainer' style='display:none;'><div class='mc-options-list' id='mcOptionsList'></div><button type='button' class='add-option-btn teacher-control' id='addOptionBtn'>+</button><div class='require-all-row' style='margin-top:10px;'><input type='checkbox' id='requireAllCorrect' /><label for='requireAllCorrect'>Require All Correct</label></div></div><input type='file' id='pollImageInput' accept='image/*' style='display:none;' /><button type='button' id='pollImageBtn' class='secondary-btn teacher-control' style='display:none;'>📷 Add Image</button><div id='pollImagePreviewInner' class='image-preview'></div><button type='button' id='createPollBtn' class='teacher-control' style='display:none;'>Create Poll</button><button type='button' id='cancelPollBtn' class='teacher-control' style='display:none;margin-left:8px;'>Cancel</button>";
  pollCreation.classList.remove("hidden");

  var currentPollType = "";
  var pollImageFile = null;
  var pImgInput = document.getElementById("pollImageInput");
  var pImgPreview = document.getElementById("pollImagePreviewInner");

  document.getElementById("pollImageBtn").addEventListener("click", function(e) { e.stopPropagation(); pImgInput.click(); });
  pImgInput.addEventListener("change", function(e) {
    var f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) { return; }
    pollImageFile = f;
    showImagePreview(f, pImgPreview, function() { pollImageFile = null; pImgPreview.innerHTML = ""; pImgInput.value = ""; });
  });

  function addMCOptionRow() {
    var list = document.getElementById("mcOptionsList");
    var row = document.createElement("div");
    row.className = "mc-option-row";
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "correct-toggle teacher-control";
    toggle.textContent = "ㄨ";
    toggle.dataset.correct = "false";
    toggle.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isCorrect = toggle.dataset.correct === "true";
      toggle.dataset.correct = String(!isCorrect);
      toggle.textContent = !isCorrect ? "✓" : "ㄨ";
      toggle.classList.toggle("is-correct", !isCorrect);
    });
    var inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Option text";
    inp.style.marginBottom = "0";
    row.appendChild(toggle);
    row.appendChild(inp);
    list.appendChild(row);
  }

  addMCOptionRow();
  addMCOptionRow();

  document.getElementById("addOptionBtn").addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); addMCOptionRow(); });

  document.getElementById("mcBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    currentPollType = "mc";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("mcOptionsContainer").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.getElementById("pollTypeBtns").style.display = "none";
  });

  document.getElementById("freeBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    currentPollType = "free";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.getElementById("pollTypeBtns").style.display = "none";
  });

  document.getElementById("cancelPollBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    pollImageFile = null;
  });

  document.getElementById("createPollBtn").addEventListener("click", async function(e) {
    e.stopPropagation();
    var createBtn = document.getElementById("createPollBtn");
    if (!createBtn || createBtn.disabled) { return; }
    if (!currentPollType) { alert("Please select Multiple Choice or Free Response first."); return; }
    var questionEl = document.getElementById("pollQuestionInput");
    var question = questionEl ? questionEl.value.trim() : "";
    if (!question) { alert("Please enter a poll question."); return; }
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";
    var imageUrl = null;
    try {
      if (pollImageFile) { imageUrl = await uploadImage(pollImageFile, "boards/" + currentBoardId + "/polls"); }
      if (currentPollType === "mc") {
        var rows = document.querySelectorAll("#mcOptionsList .mc-option-row");
        var options = [];
        var correctIndices = [];
        rows.forEach(function(row) {
          var text = row.querySelector("input[type='text']").value.trim();
          var isCorrect = row.querySelector(".correct-toggle").dataset.correct === "true";
          if (text) {
            if (isCorrect) { correctIndices.push(options.length); }
            options.push(text);
          }
        });
        if (options.length < 2) { alert("Please add at least 2 options."); createBtn.disabled = false; createBtn.textContent = "Create Poll"; return; }
        if (correctIndices.length === 0) { alert("Kernel crisis! Mark a ✓ to publish."); createBtn.disabled = false; createBtn.textContent = "Create Poll"; return; }
        var requireAll = document.getElementById("requireAllCorrect").checked;
        await addDoc(collection(db, "boards", currentBoardId, "polls"), {
          question: question, type: "mc", options: options,
          votes: Array(options.length).fill(0), voters: [], visible: false,
          imageUrl: imageUrl, history: [], correctIndices: correctIndices,
          requireAllCorrect: requireAll, responsesVisible: false,
          correctVisible: false, pointsAwarded: false, createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "boards", currentBoardId, "polls"), {
          question: question, type: "free", responses: {}, visible: false,
          responsesVisible: false, imageUrl: imageUrl, history: [], createdAt: serverTimestamp()
        });
      }
      pollCreation.classList.add("hidden");
      pollCreation.innerHTML = "";
      pollImageFile = null;
    } catch (err) {
      console.error("Error creating poll:", err);
      alert("Something went wrong. Please try again.");
      if (createBtn) { createBtn.disabled = false; createBtn.textContent = "Create Poll"; }
    }
  });
});

var cachedTotalStudents = 0;

// Normalise Firestore votes field — created as array but becomes a map
// object {0: n, 1: n} after any ["votes.N"] increment operations.

// ─── POLLS ─────────────────────────────────────────────────────────────────

function getVotesArray(poll) {
  var options = poll.options || [];
  var raw = poll.votes;
  if (!raw) { return Array(options.length).fill(0); }
  if (Array.isArray(raw)) { return raw; }
  var arr = [];
  for (var i = 0; i < options.length; i++) {
    arr.push(raw[String(i)] !== undefined ? raw[String(i)] : (raw[i] !== undefined ? raw[i] : 0));
  }
  return arr;
}

// Using 1.6's proven pattern: await student count FIRST, then set up listener.
// This guarantees currentBoardId is valid and the listener fires correctly for students.

async function loadPolls() {
  if (!currentBoardId) { return; }
  if (unsubPolls) { unsubPolls(); unsubPolls = null; }

  var studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var totalStudents = studentsSnapshot.size;

  unsubPolls = onSnapshot(
    collection(db, "boards", currentBoardId, "polls"),
    function(snapshot) {
      pollSection.innerHTML = "";
      var archivedSection = document.getElementById("archivedPolls");
      if (archivedSection) { archivedSection.innerHTML = ""; }

      var pollDocs = [];
      snapshot.forEach(function(docSnap) { pollDocs.push(docSnap); });

      pollDocs.sort(function(a, b) {
        function getPollPriority(docSnap) {
          var p = docSnap.data();
          var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
          if (p.visible) { return 0; }
          if (!hasInteraction) { return 1; }
          return 2;
        }
        return getPollPriority(a) - getPollPriority(b);
      });

      var activePollDocs = pollDocs.filter(function(d) {
        var p = d.data();
        var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
        return p.visible || !hasInteraction;
      });
      var archivedPollDocs = pollDocs.filter(function(d) {
        var p = d.data();
        var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
        return !p.visible && hasInteraction;
      });

      activePollDocs.forEach(function(docSnap) {
        var poll = docSnap.data();
        var pollId = docSnap.id;
        var pollVisible = poll.visible !== undefined ? poll.visible : false;

        if (!isTeacher && !pollVisible) { return; }

        // Restore vote state from history on reload
        if (!isTeacher && currentStudentId) {
          if (poll.requireAllCorrect) {
            var multiSet = new Set();
            (poll.history || []).forEach(function(h) {
              if (h.username !== username) { return; }
              var resp = h.response || "";
              if (resp.indexOf("Voted: ") === 0) {
                var optText = resp.slice(7);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { multiSet.add(idx); }
              } else if (resp.indexOf("Removed vote: ") === 0) {
                var optText = resp.slice(14);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { multiSet.delete(idx); }
              }
            });
            if (multiSet.size > 0) { myPollVotes.set(pollId + "_multi", multiSet); }
          } else {
            var lastVote = null;
            (poll.history || []).forEach(function(h) {
              if (h.username !== username) { return; }
              var resp = h.response || "";
              if (resp.indexOf("Voted: ") === 0) {
                var optText = resp.slice(7);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { lastVote = idx; }
              } else if (resp.indexOf("Removed vote: ") === 0) {
                lastVote = null;
              }
            });
            if (lastVote !== null) { myPollVotes.set(pollId, lastVote); }
          }
        }

        var div = document.createElement("div");
        div.className = "poll";
        var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
        if (isTeacher && !pollVisible && !hasInteraction) { div.style.opacity = "0.4"; div.style.filter = "grayscale(30%)"; }
        var questionEl = document.createElement("strong");
        questionEl.textContent = poll.question;
        div.appendChild(questionEl);

        if (poll.imageUrl) {
          var img = document.createElement("img");
          img.src = poll.imageUrl;
          img.className = "poll-image";
          (function(url) { img.onclick = function() { showImageLightbox(url); }; })(poll.imageUrl);
          div.appendChild(img);
        }

        if (poll.type === "free") { renderFreePoll(div, poll, pollId, totalStudents); }
        else if (poll.type === "mc") { renderMCPoll(div, poll, pollId, totalStudents); }

        if (isTeacher) {
          var controlsDiv = document.createElement("div");
          controlsDiv.style.cssText = "margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";

          var toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.textContent = pollVisible ? "👁️ Shown" : "👁️‍🗨️ Hidden";
          toggleBtn.className = "hide-toggle teacher-control";
          (function(pid, vis) {
            toggleBtn.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { visible: !vis });
            };
          })(pollId, pollVisible);
          controlsDiv.appendChild(toggleBtn);

          var rToggle = document.createElement("button");
          rToggle.type = "button";
          rToggle.textContent = poll.responsesVisible ? "👁️ Responses Shown" : "👁️‍🗨️ Responses Hidden";
          rToggle.className = "hide-toggle teacher-control";
          (function(pid, rv) {
            rToggle.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { responsesVisible: !rv });
            };
          })(pollId, poll.responsesVisible);
          controlsDiv.appendChild(rToggle);

          if (poll.type === "mc" && poll.responsesVisible) {
            var cToggle = document.createElement("button");
            cToggle.type = "button";
            cToggle.textContent = poll.correctVisible ? "👁️ Correct Shown" : "👁️‍🗨️ Correct Hidden";
            cToggle.className = "hide-toggle teacher-control";
            (function(pid, cv, ci, pa) {
              cToggle.onclick = async function(e) {
                e.stopPropagation();
                var newCV = !cv;
                await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { correctVisible: newCV });
                if (newCV && ci && ci.length > 0 && !pa) {
                  await awardLeaderboardPoints(pid, ci);
                  await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { pointsAwarded: true });
                }
              };
            })(pollId, poll.correctVisible, poll.correctIndices, poll.pointsAwarded);
            controlsDiv.appendChild(cToggle);
          }

          var resetBtn = document.createElement("button");
          resetBtn.type = "button";
          resetBtn.textContent = "🔄 Reset";
          resetBtn.className = "teacher-control";
          (function(pid, pdata) {
            resetBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Reset this poll?")) { return; }
              var updates = { history: [], pointsAwarded: false };
              if (pdata.type === "mc") {
                updates.votes = Array(pdata.options.length).fill(0);
                updates.voters = [];
                updates.responsesVisible = false;
                updates.correctVisible = false;
              } else {
                updates.responses = {};
                updates.responsesVisible = false;
              }
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), updates);
            };
          })(pollId, poll);
          controlsDiv.appendChild(resetBtn);

          var delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.textContent = "🗑️ Delete";
          delBtn.className = "delete-poll teacher-control";
          (function(pid) {
            delBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Delete this poll?")) { return; }
              await deleteDoc(doc(db, "boards", currentBoardId, "polls", pid));
            };
          })(pollId);
          controlsDiv.appendChild(delBtn);
          div.appendChild(controlsDiv);
        }

        pollSection.appendChild(div);
      });

      if (isTeacher && archivedSection && archivedPollDocs.length > 0) {
        var header = document.createElement("div");
        header.style.cssText = "text-align:center;color:var(--text-secondary,#888);font-size:0.85rem;margin:24px 0 8px;letter-spacing:0.05em;";
        header.textContent = "── Archived Polls ──";
        archivedSection.appendChild(header);
        archivedPollDocs.forEach(function(docSnap) {
          var poll = docSnap.data();
          var pollId = docSnap.id;
          var div = document.createElement("div");
          div.className = "poll";
          div.style.opacity = "0.6";
          var questionEl = document.createElement("strong");
          questionEl.textContent = poll.question;
          div.appendChild(questionEl);
          if (poll.imageUrl) {
            var img = document.createElement("img");
            img.src = poll.imageUrl;
            img.className = "poll-image";
            (function(url) { img.onclick = function() { showImageLightbox(url); }; })(poll.imageUrl);
            div.appendChild(img);
          }
          if (poll.type === "free") { renderFreePoll(div, poll, pollId, totalStudents); }
          else if (poll.type === "mc") { renderMCPoll(div, poll, pollId, totalStudents); }
          var controlsDiv = document.createElement("div");
          controlsDiv.style.cssText = "margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";
          var toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.textContent = "👁️‍🗨️ Hidden";
          toggleBtn.className = "hide-toggle teacher-control";
          (function(pid) {
            toggleBtn.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { visible: true });
            };
          })(pollId);
          controlsDiv.appendChild(toggleBtn);
          var delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.textContent = "🗑️ Delete";
          delBtn.className = "delete-poll teacher-control";
          (function(pid) {
            delBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Delete this poll?")) { return; }
              await deleteDoc(doc(db, "boards", currentBoardId, "polls", pid));
            };
          })(pollId);
          controlsDiv.appendChild(delBtn);
          div.appendChild(controlsDiv);
          archivedSection.appendChild(div);
        });
      }
    },
    function(error) { console.error("Poll listener error:", error); }
  );
}

function renderFreePoll(div, poll, pollId, totalStudents) {
  var uniqueResponders = new Set();
  (poll.history || []).forEach(function(h) { uniqueResponders.add(h.username); });
  var pct = totalStudents > 0 ? Math.round((uniqueResponders.size / totalStudents) * 100) : 0;

  if (isTeacher) {
    var pDiv = document.createElement("div");
    pDiv.className = "poll-stat";
    pDiv.innerHTML = "<strong>🗳️ Responded: " + pct + "%</strong>";
    div.appendChild(pDiv);
  }

  if (isTeacher || poll.responsesVisible) {
    var logDiv = document.createElement("div");
    logDiv.className = "poll-log";
    logDiv.innerHTML = "<strong>Poll Log:</strong>";
    (poll.history || []).forEach(function(e) {
      var p = document.createElement("div");
      p.textContent = e.username + ": " + e.response;
      logDiv.appendChild(p);
    });
    div.appendChild(logDiv);
  }

  if (!isTeacher) {
    var hasSubmitted = (poll.history || []).some(function(h) { return h.username === username; });
    var textarea = document.createElement("textarea");
    textarea.placeholder = hasSubmitted ? "✓ Your response popped in!" : "Enter your response...";
    if (hasSubmitted) { textarea.disabled = true; }

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Submit";
    // No teacher-control class — this is a student-facing button, styled as a normal poll button
    if (hasSubmitted) { submitBtn.disabled = true; }

    (function(pid, ta, sb) {
      sb.onclick = async function(e) {
        e.stopPropagation();
        var responseText = ta.value.trim();
        if (!responseText) { return; }
        await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), {
          history: arrayUnion({ username: username, response: responseText, timestamp: Date.now() })
        });
        if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast"); }
        ta.value = "";
        ta.placeholder = "✓ Your response popped in!";
        ta.disabled = true;
        sb.disabled = true;
      };
    })(pollId, textarea, submitBtn);

    div.appendChild(textarea);
    div.appendChild(submitBtn);
  }
}

function renderMCPoll(div, poll, pollId, totalStudents) {
  var responsesShown = poll.responsesVisible === true;
  var correctShown = poll.correctVisible === true;
  var voters = poll.voters || [];
  var votes = getVotesArray(poll);
  var options = poll.options || [];
  var correctIndices = poll.correctIndices || [];
  var pct = totalStudents > 0 ? Math.round((voters.length / totalStudents) * 100) : 0;

  if (isTeacher) {
    var pDiv = document.createElement("div");
    pDiv.className = "poll-stat";
    pDiv.innerHTML = "<strong>🗳️ Responded: " + pct + "%</strong>";
    div.appendChild(pDiv);

    var chart = document.createElement("div");
    chart.className = "mc-bar-chart";
    var maxVotes = 1;
    for (var vi = 0; vi < votes.length; vi++) {
      if ((votes[vi] || 0) > maxVotes) { maxVotes = votes[vi] || 0; }
    }
    for (var oi = 0; oi < options.length; oi++) {
      var voteCount = Number(votes[oi]) || 0;
      var row = document.createElement("div");
      row.className = "mc-bar-row";
      var barLabel = document.createElement("div");
      barLabel.className = "mc-bar-label";
      barLabel.textContent = options[oi];
      var track = document.createElement("div");
      track.className = "mc-bar-track";
      var fill = document.createElement("div");
      fill.className = "mc-bar-fill";
      fill.style.background = correctIndices.indexOf(oi) !== -1 ? "#34c759" : "#ff453a";
      fill.style.width = (voteCount === 0 ? 0 : Math.max(4, (voteCount / maxVotes) * 100)) + "%";
      var countSpan = document.createElement("span");
      countSpan.className = "mc-bar-count";
      countSpan.textContent = voteCount;
      track.appendChild(fill);
      track.appendChild(countSpan);
      row.appendChild(barLabel);
      row.appendChild(track);
      chart.appendChild(row);
    }
    div.appendChild(chart);

    var logDiv = document.createElement("div");
    logDiv.className = "poll-log";
    logDiv.innerHTML = "<strong>Poll Log:</strong>";
    (poll.history || []).forEach(function(e) {
      var p = document.createElement("div");
      p.textContent = e.username + ": " + e.response;
      logDiv.appendChild(p);
    });
    div.appendChild(logDiv);

  } else {
    // Student view
    if (responsesShown) {
      var maxVotes = 1;
      for (var vi = 0; vi < votes.length; vi++) { if ((votes[vi] || 0) > maxVotes) { maxVotes = votes[vi] || 0; } }
      var chart = document.createElement("div");
      chart.className = "mc-bar-chart";
      for (var oi = 0; oi < options.length; oi++) {
        var voteCount = Number(votes[oi]) || 0;
        var row = document.createElement("div");
        row.className = "mc-bar-row";
        var barLabel = document.createElement("div");
        barLabel.className = "mc-bar-label";
        barLabel.textContent = options[oi];
        var track = document.createElement("div");
        track.className = "mc-bar-track";
        var fill = document.createElement("div");
        fill.className = "mc-bar-fill";
        if (correctShown) {
        fill.style.background = correctIndices.indexOf(oi) !== -1 ? "#34c759" : "#ff453a";
        if (myPollVotes.get(pollId) === oi) { row.style.cssText += "outline:2px solid #0071e3;border-radius:999px;"; }
        } else {
        fill.style.background = "#0071e3";
        if (myPollVotes.get(pollId) === oi) { row.style.cssText += "outline:2px solid #0071e3;border-radius:999px;box-shadow:0 0 0 3px rgba(0,113,227,0.25);"; }
        }
        fill.style.width = (voteCount === 0 ? 0 : Math.max(4, (voteCount / maxVotes) * 100)) + "%";
        var countSpan = document.createElement("span");
        countSpan.className = "mc-bar-count";
        countSpan.textContent = voteCount;
        track.appendChild(fill);
        track.appendChild(countSpan);
        row.appendChild(barLabel);
        row.appendChild(track);
        chart.appendChild(row);
      }
      div.appendChild(chart);
    } else {
      for (var oi = 0; oi < options.length; oi++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = options[oi];
        if (myPollVotes.get(pollId) === oi) { btn.classList.add("voted-by-me"); }
        (function(optIndex, optText, pollData) {
          btn.onclick = async function(e) {
            e.stopPropagation();
            var pollRef = doc(db, "boards", currentBoardId, "polls", pollId);
            if (pollData.requireAllCorrect) {
              var currentSet = myPollVotes.get(pollId + "_multi") || new Set();
              if (currentSet.has(optIndex)) {
                currentSet.delete(optIndex);
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(-1),
                  voters: currentSet.size === 0 ? arrayRemove(username) : pollData.voters,
                  history: arrayUnion({ username: username, response: "Removed vote: " + optText, timestamp: Date.now() })
                });
              } else {
                currentSet.add(optIndex);
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(1),
                  voters: arrayUnion(username),
                  history: arrayUnion({ username: username, response: "Voted: " + optText, timestamp: Date.now() })
                });
              }
              myPollVotes.set(pollId + "_multi", currentSet);
            } else {
              var prevChoice = myPollVotes.get(pollId);
              if (prevChoice === optIndex) {
                myPollVotes.delete(pollId);
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(-1),
                  voters: arrayRemove(username),
                  history: arrayUnion({ username: username, response: "Removed vote: " + optText, timestamp: Date.now() })
                });
                if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast", -1); }
              } else {
                myPollVotes.set(pollId, optIndex);
                var updates = {
                  ["votes." + optIndex]: increment(1),
                  history: arrayUnion({ username: username, response: "Voted: " + optText, timestamp: Date.now() })
                };
                if (prevChoice === undefined || prevChoice === null) {
                  updates.voters = arrayUnion(username);
                  if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast", 1); }
                } else {
                  updates["votes." + prevChoice] = increment(-1);
                }
                await updateDoc(pollRef, updates);
              }
            }
          };
        })(oi, options[oi], poll);
        div.appendChild(btn);
      }
    }
  }
}

async function updateDailyDashboard() {
  if (!isTeacher || !currentBoardId) { return; }
  try {
    var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
    var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
    var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
    var studentsSnap = await getDocs(collection(db, "boards", currentBoardId, "students"));
    var activeStudents = new Set();
    postsSnap.forEach(function(d) { activeStudents.add(d.data().author); });
    repliesSnap.forEach(function(d) { activeStudents.add(d.data().author); });
    pollsSnap.forEach(function(pd) {
      var p = pd.data();
      (p.voters || []).forEach(function(v) { activeStudents.add(v); });
      (p.history || []).forEach(function(h) { activeStudents.add(h.username); });
    });
    var attendance = activeStudents.size;
    var totalStudents = studentsSnap.size;
    var totalComments = 0;
    var totalUpvotes = 0;
    var anonCount = 0;
    var totalCommentCount = 0;
    var pollParticipationSum = 0;
    var pollCount = 0;
    postsSnap.forEach(function(d) {
      var p = d.data();
      totalComments++;
      totalUpvotes += p.upvotes || 0;
      if (p.anonymous) { anonCount++; }
      totalCommentCount++;
    });
    repliesSnap.forEach(function(d) {
      var r = d.data();
      if (r.anonymous) { anonCount++; }
      totalCommentCount++;
    });
    pollsSnap.forEach(function(pd) {
      var p = pd.data();
      var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
      if (!hasInteraction) { return; }
      pollCount++;
      var resp = new Set();
      if (p.type === "mc") { (p.voters || []).forEach(function(v) { resp.add(v); }); }
      else { (p.history || []).forEach(function(h) { resp.add(h.username); }); }
      if (attendance > 0) { pollParticipationSum += resp.size / attendance; }
    });
    var engagementPct = pollCount > 0 ? Math.round((pollParticipationSum / pollCount) * 100) : 0;
    var anonPct = totalCommentCount > 0 ? Math.round((anonCount / totalCommentCount) * 100) : 0;
    var engDisplay = document.getElementById("dailyEngagementDisplay");
    var metricsText = document.getElementById("dailyMetricsText");
    if (engDisplay) { engDisplay.textContent = engagementPct + "% Engagement"; }
    if (metricsText) {
      metricsText.innerHTML = "Attendance: " + attendance + "/" + totalStudents + " &nbsp;|&nbsp; Upvotes: " + totalUpvotes + " &nbsp;|&nbsp; Comments: " + totalComments + " &nbsp;|&nbsp; Poll Participation: " + engagementPct + "% &nbsp;|&nbsp; 🥷🏼 Anonymity: " + anonPct + "%";
    }
  } catch (err) {
    console.error("Daily dashboard error:", err);
  }
  setTimeout(function() { updateDailyDashboard(); }, 60000);
}

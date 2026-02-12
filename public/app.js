// Firebase JS SDK v12.9.0 (latest stable as of Feb 2026)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy,
  doc, updateDoc, deleteDoc, getDocs, increment, getDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// Config (your project)
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

// State
let username = "";
let isTeacher = false;
let currentBoardId = null;
let sortMode = "new";
let myUpvotedPosts = new Set(JSON.parse(localStorage.getItem("pb_upvoted") || "[]"));
let myPollVotes = new Map(JSON.parse(localStorage.getItem("pb_pollvotes") || "[]"));
let topSortCache = [];
let topSortTimer = null;
let knownUsers = new Set();

// DOM elements
const loginDiv        = document.getElementById("login");
const popboardsDiv    = document.getElementById("popboards");
const appDiv          = document.getElementById("app");
const boardSelect     = document.getElementById("boardSelect");
const boardSelection  = document.getElementById("boardSelection");
const boardsList      = document.getElementById("boardsList");
const newBoardName    = document.getElementById("newBoardName");
const createBoardBtn  = document.getElementById("createBoardBtn");
const usernameInput   = document.getElementById("usernameInput");
const joinBtn         = document.getElementById("joinBtn");
const postInput       = document.getElementById("postInput");
const anonPostToggle  = document.getElementById("anonPostToggle");
const postBtn         = document.getElementById("postBtn");
const sortSelect      = document.getElementById("sortSelect");
const postsDiv        = document.getElementById("posts");
const pollSection     = document.getElementById("pollSection");
const themeToggle     = document.getElementById("themeToggle");
const teacherBtn      = document.getElementById("teacherBtn");
const backBtns        = document.querySelectorAll("#backToBoards");
const userList        = document.getElementById("userList");
const userListSection = document.getElementById("userListSection");

// Theme handling (unchanged)
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}
function loadTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark ? "dark" : "light"));
}
themeToggle.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
};
loadTheme();

// Join logic
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return alert("Enter a display name");

  isTeacher = username.toLowerCase() === "dagpopboard";
  teacherBtn.classList.toggle("hidden", !isTeacher);

  loginDiv.classList.add("hidden");

  if (isTeacher) {
    showPopboards();
  } else {
    boardSelection.classList.remove("hidden");
    loadAvailableBoards();
  }
};

function loadAvailableBoards() {
  getDocs(collection(db, "boards")).then(snap => {
    boardSelect.innerHTML = '<option value="">Choose a PopBoard...</option>';
    snap.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.data().name || "Unnamed";
      boardSelect.appendChild(opt);
    });
  });
}

boardSelect.onchange = () => {
  if (boardSelect.value) {
    currentBoardId = boardSelect.value;
    appDiv.classList.remove("hidden");
    loadPosts();
    loadPolls();
    trackUserPresence();
  }
};

// PopBoards (teacher)
function showPopboards() {
  popboardsDiv.classList.remove("hidden");
  appDiv.classList.add("hidden");
  loadBoardsForTeacher();
  loadUserList(); // Show participants
}

function loadBoardsForTeacher() {
  getDocs(collection(db, "boards")).then(snap => {
    boardsList.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.style.margin = "12px 0";
      div.innerHTML = `
        <strong>${data.name || "Unnamed Board"}</strong>
        <button onclick="enterBoard('${docSnap.id}')">Enter</button>
        <button onclick="deleteBoard('${docSnap.id}')">Delete</button>
      `;
      boardsList.appendChild(div);
    });
  });
}

window.enterBoard = id => {
  currentBoardId = id;
  popboardsDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  loadPosts();
  loadPolls();
  trackUserPresence();
};

window.deleteBoard = async id => {
  if (!confirm("Delete entire PopBoard?")) return;
  await deleteDoc(doc(db, "boards", id));
  loadBoardsForTeacher();
};

createBoardBtn.onclick = async () => {
  const name = newBoardName.value.trim();
  if (!name) return alert("Enter name");
  const ref = await addDoc(collection(db, "boards"), { name, createdAt: serverTimestamp() });
  enterBoard(ref.id);
};

// Back buttons
backBtns.forEach(btn => btn.onclick = () => {
  if (isTeacher) showPopboards();
  else location.reload();
});

// Track users (from posts & polls authors)
function trackUserPresence() {
  knownUsers.clear();
  onSnapshot(collection(db, `boards/${currentBoardId}/posts`), snap => {
    snap.forEach(d => {
      const a = d.data().author;
      if (a && a !== "Anonymous") knownUsers.add(a);
      if (d.data().realAuthor) knownUsers.add(d.data().realAuthor);
    });
    updateUserList();
  });
  onSnapshot(collection(db, `boards/${currentBoardId}/polls`), snap => {
    snap.forEach(d => {
      const responses = d.data().responses || {};
      Object.keys(responses).forEach(u => knownUsers.add(u));
    });
    updateUserList();
  });
}

function updateUserList() {
  if (!isTeacher || !userList) return;
  userList.innerHTML = "";
  knownUsers.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    userList.appendChild(li);
  });
  userListSection.classList.toggle("hidden", knownUsers.size === 0);
}

// Posting
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text || !currentBoardId) return;

  const isAnon = anonPostToggle.checked;
  const displayAuthor = isAnon ? "Anonymous" : (isTeacher ? "Dimitry" : username);

  await addDoc(collection(db, `boards/${currentBoardId}/posts`), {
    author: displayAuthor,
    realAuthor: isAnon ? null : username,
    text,
    upvotes: 0,
    timestamp: serverTimestamp(),
    hidden: false
  });
  postInput.value = "";
  anonPostToggle.checked = false;
};

// Load posts
function loadPosts() {
  if (topSortTimer) clearInterval(topSortTimer);

  const col = collection(db, `boards/${currentBoardId}/posts`);

  if (sortMode === "top") {
    const refresh = async () => {
      const q = query(col, orderBy("upvotes", "desc"));
      const snap = await getDocs(q);
      topSortCache = snap.docs;
      renderPosts(topSortCache);
    };
    refresh();
    topSortTimer = setInterval(refresh, 120000);
  } else {
    const q = query(col, orderBy("timestamp", "desc"));
    onSnapshot(q, snap => renderPosts(snap.docs));
  }
}

function renderPosts(docs) {
  postsDiv.innerHTML = "";
  docs.forEach(docSnap => {
    const post = docSnap.data();
    if (post.hidden && !isTeacher) return;

    const div = document.createElement("div");
    div.className = "post";
    if (myUpvotedPosts.has(docSnap.id)) div.classList.add("upvoted-by-me");

    const popcorn = getPopcornLevel(post.upvotes || 0);
    const countDisplay = isTeacher ? ` (${post.upvotes || 0})` : "";

    let authorDisplay = post.author;
    if (isTeacher && post.realAuthor) {
      authorDisplay = post.author === "Anonymous" ? `🥷🏼 ${post.realAuthor}` : post.author;
    }

    div.innerHTML = `
      <strong>${authorDisplay}</strong><br>
      ${post.text}<br>
      <span class="upvote">${popcorn}${countDisplay}</span>
      ${isTeacher ? getModerationBtns("post", docSnap.id, post.hidden) : ""}
      <div class="replies" id="replies-${docSnap.id}"></div>
      <div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
        <input type="text" placeholder="Reply..." class="replyInput" data-postid="${docSnap.id}" />
        <label style="white-space:nowrap;"><input type="checkbox" class="anonReplyToggle"> 🥷🏼 Anon</label>
        <button class="replySend" data-postid="${docSnap.id}">Reply</button>
      </div>
    `;

    div.querySelector(".upvote").onclick = () => toggleUpvote(docSnap.id, post.upvotes || 0);

    if (isTeacher) {
      div.querySelectorAll(".mod-btn").forEach(btn => {
        btn.onclick = () => {
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          if (action === "hide") toggleHide("posts", id, post.hidden);
          if (action === "delete") deleteItem("posts", id);
        };
      });
    }

    // Load replies
    const repliesCol = collection(db, `boards/${currentBoardId}/posts/${docSnap.id}/replies`);
    onSnapshot(query(repliesCol, orderBy("timestamp")), snap => {
      const container = document.getElementById(`replies-${docSnap.id}`);
      container.innerHTML = "";
      snap.forEach(rSnap => {
        const r = rSnap.data();
        if (r.hidden && !isTeacher) return;
        let rAuthor = r.author;
        if (isTeacher && r.realAuthor) rAuthor = r.author === "Anonymous" ? `🥷🏼 ${r.realAuthor}` : r.author;
        const rDiv = document.createElement("div");
        rDiv.className = "reply";
        rDiv.innerHTML = `<strong>${rAuthor}</strong>: ${r.text}
          ${isTeacher ? getModerationBtns("reply", rSnap.id, r.hidden, docSnap.id) : ""}`;
        container.appendChild(rDiv);
      });
    });

    // Reply send
    div.querySelector(".replySend").onclick = async () => {
      const input = div.querySelector(".replyInput");
      const text = input.value.trim();
      if (!text) return;
      const anon = div.querySelector(".anonReplyToggle").checked;
      const display = anon ? "Anonymous" : (isTeacher ? "Dimitry" : username);
      await addDoc(repliesCol, {
        author: display,
        realAuthor: anon ? null : username,
        text,
        timestamp: serverTimestamp(),
        hidden: false
      });
      input.value = "";
    };

    postsDiv.appendChild(div);
  });
}

function getPopcornLevel(count) {
  if (count >= 10) return '<span class="popcorn-mega">🍿</span>';
  if (count >= 5) return '<span class="popcorn-medium">🍿</span>';
  if (count >= 2) return '<span class="popcorn-small">🍿</span>';
  return "";
}

async function toggleUpvote(postId, current) {
  const key = `pb_upvoted_${currentBoardId}`;
  let voted = myUpvotedPosts.has(postId);

  if (voted) {
    myUpvotedPosts.delete(postId);
    await updateDoc(doc(db, `boards/${currentBoardId}/posts`, postId), { upvotes: increment(-1) });
  } else {
    myUpvotedPosts.add(postId);
    await updateDoc(doc(db, `boards/${currentBoardId}/posts`, postId), { upvotes: increment(1) });
    triggerConfetti();
    if ("vibrate" in navigator && /Mobi|Android/i.test(navigator.userAgent)) navigator.vibrate(60);
  }

  localStorage.setItem("pb_upvoted", JSON.stringify([...myUpvotedPosts]));
  // Snapshot will update UI
}

function triggerConfetti() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const c = document.createElement("div");
      c.className = "confetti";
      c.textContent = "🍿";
      c.style.left = Math.random() * 100 + "vw";
      c.style.top = "-10vh";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1400);
    }, i * 120);
  }
}

// Polls
function loadPolls() {
  onSnapshot(collection(db, `boards/${currentBoardId}/polls`), snap => {
    pollSection.innerHTML = "";
    snap.forEach(dSnap => {
      const p = dSnap.data();
      if (!p.active || (p.hidden && !isTeacher)) return;

      const div = document.createElement("div");
      div.className = "poll";
      let html = `<strong>${p.question}</strong>`;
      if (p.imageUrl) html += `<br><img src="${p.imageUrl}" alt="poll image" style="max-width:100%; margin:10px 0; border-radius:8px;">`;
      html += "<br>";

      const myVote = myPollVotes.get(dSnap.id);

      if (p.type === "mc") {
        p.options.forEach((opt, idx) => {
          const votedHere = myVote === idx;
          const count = p.closed ? ` (${p.votes?.[idx] || 0})` : "";
          html += `<button ${votedHere ? 'class="voted-by-me"' : ""} data-idx="${idx}">${opt}${count}</button>`;
        });
      } else {
        const val = myVote || "";
        html += `<input type="text" placeholder="Your answer..." value="${val}" class="freeResponse" data-pollid="${dSnap.id}">
                 <button class="submitFree"> ${val ? "Update" : "Submit"} </button>`;
      }

      if (isTeacher) {
        html += `<div style="margin-top:16px;">
          <button data-action="close" data-id="${dSnap.id}">${p.closed ? "Reopen" : "Close & Show Results"}</button>
          <button data-action="hide" data-id="${dSnap.id}">${p.hidden ? "Unhide" : "Hide"}</button>
          <button data-action="delete" data-id="${dSnap.id}">Delete Poll</button>
        </div>`;
        if (p.closed) {
          if (p.type === "mc") {
            const chart = document.createElement("div");
            chart.className = "bar-chart";
            let max = Math.max(...(p.votes || []), 1);
            p.options.forEach((opt, i) => {
              const cnt = p.votes?.[i] || 0;
              chart.innerHTML += `<div class="bar" style="width:${(cnt / max)*100}%"><span class="bar-label">${opt}: ${cnt}</span></div>`;
            });
            div.appendChild(chart);
          } else {
            const list = document.createElement("ul");
            Object.entries(p.responses || {}).forEach(([user, ans]) => {
              list.innerHTML += `<li>${user}: ${ans}</li>`;
            });
            div.appendChild(list);
          }
        }
      }

      div.innerHTML = html;
      pollSection.appendChild(div);

      // Event delegation for poll buttons
      div.onclick = async e => {
        if (!e.target.matches("button[data-idx]")) return;
        const idx = +e.target.dataset.idx;
        const prev = myPollVotes.get(dSnap.id);
        let newVal = idx;

        if (prev === idx) newVal = null; // unvote

        await updatePollVote(dSnap.id, p, prev, newVal);
        myPollVotes.set(dSnap.id, newVal);
        localStorage.setItem("pb_pollvotes", JSON.stringify([...myPollVotes]));
        loadPolls(); // refresh UI
      };

      if (isTeacher) {
        div.querySelectorAll("button[data-action]").forEach(b => {
          b.onclick = () => {
            const act = b.dataset.action;
            const pid = b.dataset.id;
            if (act === "close") toggleClosePoll(pid, p.closed);
            if (act === "hide") toggleHide("polls", pid, p.hidden);
            if (act === "delete") deleteItem("polls", pid);
          };
        });
      }

      // Free response submit
      div.querySelector(".submitFree")?.onclick = async () => {
        const input = div.querySelector(".freeResponse");
        const val = input.value.trim();
        if (!val) return;
        await updateDoc(doc(db, `boards/${currentBoardId}/polls`, dSnap.id), {
          [`responses.${username}`]: val
        });
        myPollVotes.set(dSnap.id, val);
        localStorage.setItem("pb_pollvotes", JSON.stringify([...myPollVotes]));
        loadPolls();
      };
    });
  });
}

async function updatePollVote(pollId, poll, prev, next) {
  const ref = doc(db, `boards/${currentBoardId}/polls`, pollId);
  if (poll.type === "mc") {
    await runTransaction(db, async t => {
      const s = await t.get(ref);
      if (!s.exists()) return;
      const v = s.data().votes || Array(poll.options.length).fill(0);
      if (prev != null) v[prev] = Math.max(0, v[prev] - 1);
      if (next != null) v[next] = (v[next] || 0) + 1;
      t.update(ref, { votes: v });
    });
  }
  // Free response handled separately on submit
}

async function toggleClosePoll(id, isClosed) {
  await updateDoc(doc(db, `boards/${currentBoardId}/polls`, id), { closed: !isClosed });
}

teacherBtn.onclick = () => {
  if (!currentBoardId) return alert("Enter a PopBoard first");

  const type = prompt("Poll type: mc (multiple choice) or free (free response)")?.trim().toLowerCase();
  if (!["mc", "free"].includes(type)) return alert("Invalid type");

  const question = prompt("Poll question:")?.trim();
  if (!question) return;

  let imageUrl = null;
  const fileIn = document.createElement("input");
  fileIn.type = "file";
  fileIn.accept = "image/*";
  fileIn.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return createThePoll();
    const r = ref(storage, `polls/${Date.now()}_${file.name}`);
    await uploadBytes(r, file);
    imageUrl = await getDownloadURL(r);
    createThePoll();
  };
  fileIn.click();
  if (!fileIn.files?.length) setTimeout(createThePoll, 300); // no file chosen

  async function createThePoll() {
    const hidden = confirm("Create as hidden (draft)?");
    await addDoc(collection(db, `boards/${currentBoardId}/polls`), {
      question,
      type,
      options: type === "mc" ? prompt("Options, comma separated:")?.split(",").map(s=>s.trim()).filter(Boolean) || [] : [],
      imageUrl,
      votes: type === "mc" ? [] : 0,
      responses: {},
      active: true,
      hidden,
      closed: false,
      timestamp: serverTimestamp()
    });
    alert("Poll created" + (hidden ? " (hidden)" : ""));
  }
};

// Moderation helpers
function getModerationBtns(type, id, hidden, parentId = "") {
  return `
    <button class="mod-btn" data-action="hide" data-id="${id}"> ${hidden ? "Unhide" : "Hide"} </button>
    <button class="mod-btn" data-action="delete" data-id="${id}">Delete</button>
  `;
}

async function toggleHide(collectionName, id, currentHidden) {
  await updateDoc(doc(db, `boards/${currentBoardId}/${collectionName}`, id), { hidden: !currentHidden });
  if (collectionName === "posts") {
    // Cascade to replies
    const replies = await getDocs(collection(db, `boards/${currentBoardId}/posts/${id}/replies`));
    replies.forEach(r => updateDoc(r.ref, { hidden: !currentHidden }));
  }
}

async function deleteItem(collectionName, id) {
  if (!confirm("Delete?")) return;
  if (collectionName === "posts") {
    const replies = await getDocs(collection(db, `boards/${currentBoardId}/posts/${id}/replies`));
    replies.forEach(r => deleteDoc(r.ref));
  }
  await deleteDoc(doc(db, `boards/${currentBoardId}/${collectionName}`, id));
}

// Sort change
sortSelect.onchange = e => {
  sortMode = e.target.value;
  loadPosts();
};

// Init
sortSelect.value = "new";

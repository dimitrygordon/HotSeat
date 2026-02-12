// 🔥 Firebase imports (ES module via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyClkHjUnQ96VNRj1FxyY-ca-AcDWYoX_m8",
  authDomain: "hotseat-4f661.firebaseapp.com",
  projectId: "hotseat-4f661",
  storageBucket: "hotseat-4f661.firebasestorage.app",
  messagingSenderId: "1052089495081",
  appId: "1:1052089495081:web:15293be177ad3a6f577638"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🌟 App state
let username = "";
let isTeacher = false;
let sortMode = "new";

// Track user interactions (client-side only)
let myUpvotedPostIds = new Set();    // post IDs this user has upvoted
let myPollVotes = new Map();         // pollId → chosen option index

// DOM elements
const loginDiv      = document.getElementById("login");
const appDiv        = document.getElementById("app");
const joinBtn       = document.getElementById("joinBtn");
const usernameInput = document.getElementById("usernameInput");
const postInput     = document.getElementById("postInput");
const postBtn       = document.getElementById("postBtn");
const postsDiv      = document.getElementById("posts");
const sortSelect    = document.getElementById("sortSelect");
const teacherBtn    = document.getElementById("teacherBtn");
const pollSection   = document.getElementById("pollSection");
const themeToggle   = document.getElementById("themeToggle");
const htmlElement   = document.documentElement;

// ────────────────────────────────────────────────
// Theme handling
// ────────────────────────────────────────────────
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  
  if (theme === "dark") {
    themeToggle.textContent = "☀️ Light Mode";
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) {
    setTheme(e.matches ? "dark" : "light");
  }
});

themeToggle.addEventListener("click", () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

loadTheme();

// ────────────────────────────────────────────────
// App logic
// ────────────────────────────────────────────────

// Join session
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  isTeacher = username === "Dimitry";
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// Post a new message
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    author: username,
    text,
    upvotes: 0,
    timestamp: serverTimestamp()
  });

  postInput.value = "";
};

// Sort mode change
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// Load posts with upvote tracking
function loadPosts() {
  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";
    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(docSnap.id)) {
        div.classList.add("upvoted-by-me");
      }

      div.innerHTML = `
        <strong>${post.author}</strong><br/>
        ${post.text}<br/>
        <span class="upvote">🍿 ${post.upvotes || 0}</span>
        ${isTeacher ? "<button class='delete'>Delete</button>" : ""}
      `;

      const upvoteSpan = div.querySelector(".upvote");
      upvoteSpan.onclick = async () => {
        // Prevent multiple upvotes from same user
        if (myUpvotedPostIds.has(docSnap.id)) return;

        myUpvotedPostIds.add(docSnap.id);
        div.classList.add("upvoted-by-me");

        await updateDoc(doc(db, "posts", docSnap.id), {
          upvotes: (post.upvotes || 0) + 1
        });
      };

      if (isTeacher) {
        div.querySelector(".delete").onclick = async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      postsDiv.appendChild(div);
    });
  });
}

// Teacher creates poll
teacherBtn.onclick = async () => {
  const question = prompt("Poll question:");
  const optionsStr = prompt("Comma-separated options:");
  if (!question || !optionsStr) return;

  const options = optionsStr.split(",").map(o => o.trim()).filter(o => o);

  if (options.length === 0) return;

  await addDoc(collection(db, "polls"), {
    question,
    options,
    votes: Array(options.length).fill(0),
    active: true
  });
};

// Load & display active poll with vote tracking
function loadPoll() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      if (!poll.active) return;

      const div = document.createElement("div");
      div.className = "poll";
      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      const myChoice = myPollVotes.get(docSnap.id);

      poll.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.textContent = `${opt} (${poll.votes[i] || 0})`;

        if (myChoice === i) {
          btn.classList.add("voted-by-me");
        }

        btn.onclick = async () => {
          // Prevent multiple votes
          if (myPollVotes.has(docSnap.id)) return;

          myPollVotes.set(docSnap.id, i);
          btn.classList.add("voted-by-me");

          const newVotes = [...(poll.votes || Array(poll.options.length).fill(0))];
          newVotes[i] = (newVotes[i] || 0) + 1;

          await updateDoc(doc(db, "polls", docSnap.id), { votes: newVotes });
        };

        div.appendChild(btn);
      });

      if (isTeacher) {
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close Poll";
        closeBtn.onclick = async () => {
          await updateDoc(doc(db, "polls", docSnap.id), { active: false });
        };
        div.appendChild(closeBtn);
      }

      pollSection.appendChild(div);
    });
  });
}

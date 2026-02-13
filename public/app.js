// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
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

// App state
let username = "";
let isTeacher = false;
let sortMode = "new";
let myUpvotes = new Map();      // postId → boolean (true = upvoted by me)

// DOM
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
// Theme
// ────────────────────────────────────────────────
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) {
    setTheme(saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) setTheme(e.matches ? "dark" : "light");
});

themeToggle.onclick = () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
};

loadTheme();

// ────────────────────────────────────────────────
// Join
// ────────────────────────────────────────────────
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  isTeacher = username === "Dimitry"; // ← change this later to be more secure
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// ────────────────────────────────────────────────
// Post new message
// ────────────────────────────────────────────────
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

// Sort change
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// ────────────────────────────────────────────────
// Load & render posts
// ────────────────────────────────────────────────
function loadPosts() {
  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;
      const myVote = myUpvotes.get(postId) === true;
      const count = post.upvotes || 0;

      // Determine popcorn display (visible to everyone)
      let popcorn = "";
      let sizeClass = "";
      if (count >= 10) {
        popcorn = "🍿🍿🍿";
        sizeClass = "mega";
      } else if (count >= 5) {
        popcorn = "🍿🍿";
        sizeClass = "medium";
      } else if (count >= 2) {
        popcorn = "🍿";
        sizeClass = "small";
      }

      const div = document.createElement("div");
      div.className = "post";
      if (myVote) div.classList.add("upvoted-by-me");

      div.innerHTML = `
        <strong>${post.author}</strong><br/>
        ${post.text}<br/>
        <span class="upvote ${myVote ? 'active' : ''} ${sizeClass}">
          ${popcorn || "🍿"}
        </span>
        ${isTeacher ? `<span class="teacher-count">(${count})</span>
                       <button class="delete">Delete</button>` : ""}
      `;

      const upvoteEl = div.querySelector(".upvote");

      upvoteEl.onclick = async () => {
        const wasUpvoted = myUpvotes.get(postId) === true;

        // Optimistic update
        if (wasUpvoted) {
          myUpvotes.delete(postId);
          div.classList.remove("upvoted-by-me");
          upvoteEl.classList.remove("active");
        } else {
          myUpvotes.set(postId, true);
          div.classList.add("upvoted-by-me");
          upvoteEl.classList.add("active");
          triggerConfetti(upvoteEl);
          triggerHaptic();
        }

        // Server
        await updateDoc(doc(db, "posts", postId), {
          upvotes: increment(wasUpvoted ? -1 : 1)
        });
      };

      if (isTeacher) {
        div.querySelector(".delete").onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", postId));
          }
        };
      }

      postsDiv.appendChild(div);
    });
  });
}

// ────────────────────────────────────────────────
// Feedback helpers
// ────────────────────────────────────────────────
function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate([8, 25, 8]); // light & pleasant
  }
}

function triggerConfetti(element) {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2 + window.scrollX;
  const y = rect.top + window.scrollY - 10;

  for (let i = 0; i < 7; i++) {
    const k = document.createElement("div");
    k.textContent = "🍿";
    k.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      font-size: 13px;
      pointer-events: none;
      z-index: 200;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(k);

    const angle = (Math.random() - 0.5) * Math.PI * 1.8;
    const dist = 35 + Math.random() * 45;

    k.animate([
      { transform: `translate(-50%, -50%) scale(1)`, opacity: 0.95 },
      { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist - 70}px)) scale(0.3)`, opacity: 0 }
    ], {
      duration: 500 + Math.random() * 400,
      easing: "ease-out"
    }).onfinish = () => k.remove();
  }
}

// ────────────────────────────────────────────────
// Poll logic (unchanged for now)
// ────────────────────────────────────────────────
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

function loadPoll() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      if (!poll.active) return;

      const div = document.createElement("div");
      div.className = "poll";
      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      const myChoice = myPollVotes.get(docSnap.id); // assuming you still have myPollVotes Map

      poll.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.textContent = `${opt} (${poll.votes[i] || 0})`;
        if (myChoice === i) btn.classList.add("voted-by-me");

        btn.onclick = async () => {
          if (myPollVotes.has(docSnap.id)) return;
          myPollVotes.set(docSnap.id, i);
          btn.classList.add("voted-by-me");

          const newVotes = [...(poll.votes || Array(poll.options.length).fill(0))];
          newVotes[i]++;
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

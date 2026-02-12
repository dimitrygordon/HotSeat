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
let myUpvotedPostIds = new Set();
let myPollVotes = new Map();

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
const anonymousToggle = document.getElementById("anonymousToggle");

// ────────────────────────────────────────────────
// Theme handling (unchanged)
// ────────────────────────────────────────────────
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);
  else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) setTheme(e.matches ? "dark" : "light");
});

themeToggle.addEventListener("click", () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

loadTheme();

// ────────────────────────────────────────────────
// Confetti + haptic feedback
// ────────────────────────────────────────────────
function popcornConfetti(element) {
  const rect = element.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = "🍿";
    c.style.left = `${rect.left + Math.random() * rect.width}px`;
    c.style.top = `${rect.top + 20}px`;
    c.style.animationDuration = `${1.4 + Math.random() * 1}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2800);
  }
  if (navigator.vibrate) navigator.vibrate(55);
}

// ────────────────────────────────────────────────
// App logic
// ────────────────────────────────────────────────

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

// Post with anonymous support + reply capability
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text) return;

  const isAnonymous = anonymousToggle.checked;
  const authorName = isAnonymous ? "🥷🏼 Anonymous" : username;

  await addDoc(collection(db, "posts"), {
    author: authorName,
    text,
    upvotes: 0,
    timestamp: serverTimestamp(),
    parentId: null   // null = top-level comment
  });

  postInput.value = "";
  anonymousToggle.checked = false;
};

// Sort change
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// Load posts (supports replies + threshold visuals)
function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "asc"));

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    const allPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    allPosts.forEach(postData => {
      const div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postData.id)) div.classList.add("upvoted-by-me");

      const upvotes = postData.upvotes || 0;
      if (upvotes >= 10) div.classList.add("popcorn-mega");
      else if (upvotes >= 5) div.classList.add("popcorn-medium");
      else if (upvotes >= 2) div.classList.add("popcorn-small");

      const isReply = !!postData.parentId;
      if (isReply) div.classList.add("reply");

      div.innerHTML = `
        <strong>${postData.author}</strong><br/>
        ${postData.text}<br/>
        <span class="upvote">🍿</span>
        <button class="reply-btn">Reply</button>
        ${isTeacher ? "<button class='delete'>Delete</button>" : ""}
      `;

      // Upvote toggle
      const upvoteSpan = div.querySelector(".upvote");
      upvoteSpan.onclick = async () => {
        const already = myUpvotedPostIds.has(postData.id);

        if (already) {
          myUpvotedPostIds.delete(postData.id);
          div.classList.remove("upvoted-by-me");
          await updateDoc(doc(db, "posts", postData.id), {
            upvotes: Math.max(0, upvotes - 1)
          });
        } else {
          myUpvotedPostIds.add(postData.id);
          div.classList.add("upvoted-by-me");
          popcornConfetti(upvoteSpan);
          await updateDoc(doc(db, "posts", postData.id), {
            upvotes: upvotes + 1
          });
        }
      };

      // Reply button
      div.querySelector(".reply-btn").onclick = async () => {
        const replyText = prompt("Reply to this comment:");
        if (!replyText) return;

        await addDoc(collection(db, "posts"), {
          author: username,
          text: replyText,
          upvotes: 0,
          timestamp: serverTimestamp(),
          parentId: postData.id
        });
      };

      // Teacher delete
      if (isTeacher) {
        div.querySelector(".delete").onclick = async () => {
          await deleteDoc(doc(db, "posts", postData.id));
        };
      }

      postsDiv.appendChild(div);
    });
  });
}

// Teacher creates poll (unchanged for now)
teacherBtn.onclick = async () => {
  const question = prompt("Poll question:");
  const optionsStr = prompt("Comma-separated options:");
  if (!question || !optionsStr) return;

  const options = optionsStr.split(",").map(o => o.trim()).filter(Boolean);
  if (options.length === 0) return;

  await addDoc(collection(db, "polls"), {
    question,
    options,
    votes: Array(options.length).fill(0),
    active: true
  });
};

// Load poll with toggle / change vote support
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

        if (myChoice === i) btn.classList.add("voted-by-me");

        btn.onclick = async () => {
          const current = myPollVotes.get(docSnap.id);

          if (current === i) {
            // Remove vote
            myPollVotes.delete(docSnap.id);
            btn.classList.remove("voted-by-me");
            const newVotes = [...(poll.votes || [])];
            newVotes[i] = Math.max(0, (newVotes[i] || 0) - 1);
            await updateDoc(doc(db, "polls", docSnap.id), { votes: newVotes });
          } else {
            // Change or new vote
            if (current !== undefined) {
              const newVotes = [...(poll.votes || [])];
              newVotes[current] = Math.max(0, (newVotes[current] || 0) - 1);
              await updateDoc(doc(db, "polls", docSnap.id), { votes: newVotes });
            }
            myPollVotes.set(docSnap.id, i);
            btn.classList.add("voted-by-me");
            const newVotes = [...(poll.votes || [])];
            newVotes[i] = (newVotes[i] || 0) + 1;
            await updateDoc(doc(db, "polls", docSnap.id), { votes: newVotes });
          }
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

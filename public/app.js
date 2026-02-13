// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment, arrayUnion, arrayRemove
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

let myUpvotedPostIds = new Set();    // post IDs upvoted by this user
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

// Theme handling
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
  if (!localStorage.getItem("theme")) {
    setTheme(e.matches ? "dark" : "light");
  }
});

themeToggle.addEventListener("click", () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

loadTheme();

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
    upvoters: [],
    timestamp: serverTimestamp()
  });

  postInput.value = "";
};

// Sort mode change
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// Load posts with toggle upvote
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

      // Sync local upvote state from server
      if (post.upvoters?.includes(username)) {
        myUpvotedPostIds.add(postId);
      } else {
        myUpvotedPostIds.delete(postId);
      }

      const div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postId)) {
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
        const already = myUpvotedPostIds.has(postId);
        const ref = doc(db, "posts", postId);

        if (already) {
          // Remove upvote
          myUpvotedPostIds.delete(postId);
          div.classList.remove("upvoted-by-me");
          await updateDoc(ref, {
            upvoters: arrayRemove(username),
            upvotes: increment(-1)
          });
        } else {
          // Add upvote
          myUpvotedPostIds.add(postId);
          div.classList.add("upvoted-by-me");
          await updateDoc(ref, {
            upvoters: arrayUnion(username),
            upvotes: increment(1)
          });
        }
      };

      if (isTeacher) {
        div.querySelector(".delete").onclick = async () => {
          await deleteDoc(doc(db, "posts", postId));
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
    voters: [],
    active: true
  });
};

// Load & display active poll with toggle/change vote
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
        btn.textContent = `${opt} (${poll.votes?.[i] || 0})`;

        if (myChoice === i) {
          btn.classList.add("voted-by-me");
        }

        btn.onclick = async () => {
          const pollRef = doc(db, "polls", docSnap.id);
          const prevChoice = myPollVotes.get(docSnap.id);

          if (prevChoice === i) {
            // Remove vote
            myPollVotes.delete(docSnap.id);
            await updateDoc(pollRef, {
              voters: arrayRemove(username),
              [`votes.${i}`]: increment(-1)
            });
          } else {
            // Add new / change vote
            myPollVotes.set(docSnap.id, i);

            // Remove previous vote if any
            if (prevChoice !== undefined) {
              await updateDoc(pollRef, {
                voters: arrayRemove(username),
                [`votes.${prevChoice}`]: increment(-1)
              });
            }

            await updateDoc(pollRef, {
              voters: arrayUnion(username),
              [`votes.${i}`]: increment(1)
            });
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

// 🔥 Firebase imports (ES module via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Firebase config — replace YOUR_KEY etc. with your actual Firebase project values
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

// DOM elements
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");
const joinBtn = document.getElementById("joinBtn");
const usernameInput = document.getElementById("usernameInput");
const welcome = document.getElementById("welcome");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const postsDiv = document.getElementById("posts");
const sortSelect = document.getElementById("sortSelect");
const teacherBtn = document.getElementById("teacherBtn");
const pollSection = document.getElementById("pollSection");

// ✅ Join the session
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  isTeacher = username === "Dimitry";
  welcome.textContent = `Welcome, ${username}`;
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// ✅ Post a new message
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

// ✅ Sort mode change
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// ✅ Load posts from Firestore
function loadPosts() {
  postsDiv.innerHTML = "";

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

      div.innerHTML = `
        <strong>${post.author}</strong><br/>
        ${post.text}<br/>
        <span class="upvote">⬆ ${post.upvotes}</span>
        ${isTeacher ? "<button class='delete'>Delete</button>" : ""}
      `;

      div.querySelector(".upvote").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          upvotes: post.upvotes + 1
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

// ✅ Teacher: create a poll
teacherBtn.onclick = async () => {
  const question = prompt("Poll question:");
  const options = prompt("Comma-separated options:").split(",").map(o => o.trim());

  if (!question || options.length === 0) return;

  await addDoc(collection(db, "polls"), {
    question,
    options,
    votes: Array(options.length).fill(0),
    active: true
  });
};

// ✅ Load active poll
function loadPoll() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      if (!poll.active) return;

      const div = document.createElement("div");
      div.className = "poll";

      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      poll.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.textContent = `${opt} (${poll.votes[i]})`;
        btn.onclick = async () => {
          poll.votes[i]++;
          await updateDoc(doc(db, "polls", docSnap.id), { votes: poll.votes });
        };
        div.appendChild(btn);
      });

      if (isTeacher) {
        const close = document.createElement("button");
        close.textContent = "Close Poll";
        close.onclick = async () => {
          await updateDoc(doc(db, "polls", docSnap.id), { active: false });
        };
        div.appendChild(close);
      }

      pollSection.appendChild(div);
    });
  });
}

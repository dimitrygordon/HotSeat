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
let isTeacher = false;
let isMasterAdmin = false;
let teacherAccount = "";
let currentBoardId = "";
let sortMode = "new";

let myUpvotedPostIds = new Set();
let myPollVotes = new Map();
let postImageFile = null;
let pollImageFile = null;

// ---------------- DOM elements ----------------
const loginDiv = document.getElementById("login");
const boardNameEntryDiv = document.getElementById("boardNameEntry");
const boardsPortalDiv = document.getElementById("boardsPortal");
const appDiv = document.getElementById("app");

const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const teacherLoginBtn = document.getElementById("teacherLoginBtn");

const boardNameInput = document.getElementById("boardNameInput");
const enterBoardBtn = document.getElementById("enterBoardBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

const newBoardNameInput = document.getElementById("newBoardNameInput");
const createBoardBtn = document.getElementById("createBoardBtn");
const boardsList = document.getElementById("boardsList");
const logoutBtn = document.getElementById("logoutBtn");

const backToPortalBtn = document.getElementById("backToPortalBtn");
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

const themeToggle = document.getElementById("themeToggle");
const themeTogglePortal = document.getElementById("themeTogglePortal");
const htmlElement = document.documentElement;

// ---------------- Theme ----------------
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const text = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  if (themeToggle) themeToggle.textContent = text;
  if (themeTogglePortal) themeTogglePortal.textContent = text;
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

// Teacher button - checks for master admin or creates teacher account
teacherLoginBtn.onclick = async () => {
  const input = usernameInput.value.trim();
  if (!input) {
    alert("Please enter your teacher name or code");
    return;
  }

  // Master admin login
  if (input === "301718") {
    isMasterAdmin = true;
    isTeacher = true;
    teacherAccount = "MASTER_ADMIN";
    username = "Dimitry";
    loginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
    return;
  }

  // Regular teacher login/creation
  teacherAccount = input;
  username = input;
  isTeacher = true;

  // Create teacher account if doesn't exist
  const teacherRef = doc(db, "teachers", teacherAccount);
  const teacherDoc = await getDoc(teacherRef);
  
  if (!teacherDoc.exists()) {
    await setDoc(teacherRef, {
      name: teacherAccount,
      createdAt: serverTimestamp()
    });
  }

  loginDiv.classList.add("hidden");
  boardsPortalDiv.classList.remove("hidden");
  loadBoardsPortal();
};

// Back to login
backToLoginBtn.onclick = () => {
  boardNameEntryDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  boardNameInput.value = "";
};

// Enter board as student
enterBoardBtn.onclick = async () => {
  const boardName = boardNameInput.value.trim();
  if (!boardName) {
    alert("Please enter a PopBoard name");
    return;
  }

  // Check if board exists
  const boardsRef = collection(db, "boards");
  const q = query(boardsRef, where("name", "==", boardName));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert("PopBoard does not exist. Please check the name and try again.");
    return;
  }

  currentBoardId = snapshot.docs[0].id;
  boardNameEntryDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  
  loadPosts();
  loadPoll();
};

// Logout
logoutBtn.onclick = () => {
  // Reset state
  username = "";
  isTeacher = false;
  isMasterAdmin = false;
  teacherAccount = "";
  currentBoardId = "";
  myUpvotedPostIds.clear();
  myPollVotes.clear();

  // Show login
  boardsPortalDiv.classList.add("hidden");
  appDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  usernameInput.value = "";
  boardNameInput.value = "";
};

// Back to boards portal
backToPortalBtn.onclick = () => {
  currentBoardId = "";
  appDiv.classList.add("hidden");
  boardsPortalDiv.classList.remove("hidden");
  loadBoardsPortal();
};

// ---------------- Boards Portal ----------------

async function loadBoardsPortal() {
  boardsList.innerHTML = "";

  if (isMasterAdmin) {
    // Master admin sees ALL boards organized by teacher
    backToPortalBtn.classList.add("hidden");
    
    const teachersSnapshot = await getDocs(collection(db, "teachers"));
    const boardsSnapshot = await getDocs(collection(db, "boards"));

    // Group boards by teacher
    const teacherBoards = {};
    boardsSnapshot.forEach(doc => {
      const board = doc.data();
      const teacher = board.teacherAccount || "Unknown";
      if (!teacherBoards[teacher]) teacherBoards[teacher] = [];
      teacherBoards[teacher].push({ id: doc.id, ...board });
    });

    // Display master admin section
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

      // Delete teacher button
      const deleteTeacherBtn = document.createElement("button");
      deleteTeacherBtn.textContent = "🗑️ Delete Teacher Account";
      deleteTeacherBtn.className = "delete-poll teacher-control";
      deleteTeacherBtn.style.marginTop = "12px";
      deleteTeacherBtn.onclick = async () => {
        if (!confirm(`Delete teacher "${teacher}" and ALL their boards?`)) return;
        
        // Delete all boards
        for (const board of teacherBoards[teacher]) {
          await deleteBoard(board.id);
        }
        
        // Delete teacher account
        await deleteDoc(doc(db, "teachers", teacher));
        loadBoardsPortal();
      };

      teacherCard.appendChild(boardsDiv);
      teacherCard.appendChild(deleteTeacherBtn);
      masterSection.appendChild(teacherCard);
    }

    boardsList.appendChild(masterSection);

  } else {
    // Regular teacher sees only their boards
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
  if (!isMasterView) {
    const enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    enterBtn.onclick = (e) => {
      e.stopPropagation();
      enterBoard(board.id);
    };
    actions.appendChild(enterBtn);
  }

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️Delete";
  deleteBtn.className = "delete-poll teacher-control";
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${board.name}"? This will delete all posts, polls, and data.`)) return;
    await deleteBoard(board.id);
    if (isMasterView) loadBoardsPortal();
  };
  actions.appendChild(deleteBtn);

  card.appendChild(info);
  card.appendChild(actions);

  // Click card to enter (except for master admin)
  if (!isMasterView) {
    card.onclick = () => enterBoard(board.id);
  }

  return card;
}

async function deleteBoard(boardId) {
  // Delete all posts
  const postsSnapshot = await getDocs(query(collection(db, "boards", boardId, "posts")));
  for (const doc of postsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete all replies
  const repliesSnapshot = await getDocs(query(collection(db, "boards", boardId, "replies")));
  for (const doc of repliesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete all polls
  const pollsSnapshot = await getDocs(query(collection(db, "boards", boardId, "polls")));
  for (const doc of pollsSnapshot.docs) {
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
  } else {
    // CRITICAL FIX: Hide teacher button for students
    teacherBtn.classList.add("hidden");
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

  // Check if name already exists for this teacher
  const boardsRef = collection(db, "boards");
  const q = query(boardsRef, where("teacherAccount", "==", teacherAccount), where("name", "==", boardName));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    alert("You already have a board with this name");
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

// Post image upload
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
      div.innerHTML = `<strong>${displayName}</strong> ${r.text}`; // Removed colon

      // Image if exists
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

      // Image if exists
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
        } else {
          await updateDoc(ref, {
            upvoters: arrayUnion(username),
            upvotes: increment(1),
            upvoteHistory: arrayUnion(`${username}: ${action}`)
          });
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

        // Reply image upload
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

function loadPoll() {
  if (!currentBoardId) return;

  onSnapshot(collection(db, "boards", currentBoardId, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      const pollId = docSnap.id;

      if (!poll.visible && !isTeacher) return;

      const div = document.createElement("div");
      div.className = "poll";
      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      // Poll image if exists
      if (poll.imageUrl) {
        const img = document.createElement("img");
        img.src = poll.imageUrl;
        img.className = "poll-image";
        img.onclick = () => showImageLightbox(poll.imageUrl);
        div.appendChild(img);
      }

      if (poll.type === "free") {
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

            textarea.placeholder = "✓ Response Recorded";
            textarea.value = "";
            textarea.disabled = true;
            submitBtn.disabled = true;
          };

          div.appendChild(textarea);
          div.appendChild(submitBtn);
        }
      } else {
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
                history: arrayUnion({ username, response: `Removed vote: ${opt}` })
              });
            } else {
              myPollVotes.set(pollId, i);
              const updates = {
                [`votes.${i}`]: increment(1),
                history: arrayUnion({ username, response: `Voted: ${opt}` })
              };
              if (prevChoice !== undefined) updates[`votes.${prevChoice}`] = increment(-1);
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

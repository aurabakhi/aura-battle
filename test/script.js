import { db, rtdb } from "./firebase.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { 
  ref, 
  push, 
  onValue, 
  query as rtdbQuery, 
  limitToLast, 
  serverTimestamp as rtdbTimestamp,
  get,
  set,
  remove as rtdbRemove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// ==========================================
// NAVIGATION & SCREEN MANAGEMENT
// ==========================================
const screens = {
  loadingScreen: document.getElementById("loadingScreen"),
  home: document.getElementById("home"),
  register: document.getElementById("register"),
  waiting: document.getElementById("waiting"),
  schedule: document.getElementById("schedule"),
  voteScreen: document.getElementById("voteScreen"),
  rulesScreen: document.getElementById("rulesScreen"),
  chatScreen: document.getElementById("chatScreen")
};

function showScreen(name) {
  Object.values(screens).forEach((s) => {
    if (s) s.classList.remove("active");
  });
  if (screens[name]) {
    screens[name].classList.add("active");
  }
}

let userIP = "";
let unsubscribeRegistration = null;
let isUserRegistered = false; // Track registration status to avoid repeated checks

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Không xác định";
  let deviceType = "Máy tính";
  if (/Android/i.test(ua)) { os = "Android"; deviceType = "Điện thoại"; } 
  else if (/iPhone/i.test(ua)) { os = "iPhone"; deviceType = "Điện thoại"; } 
  else if (/iPad/i.test(ua)) { os = "iPad"; deviceType = "Máy tính bảng"; } 
  else if (/Windows/i.test(ua)) { os = "Windows"; deviceType = "Máy tính"; } 
  else if (/Macintosh|Mac OS X/i.test(ua)) { os = "macOS"; deviceType = "Máy tính"; }
  return `${deviceType} (${os})`;
}

function getOrCreateDeviceId() {
  let storedId = localStorage.getItem("browser_device_id");
  if (storedId) return storedId;
  const finalDeviceId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
  localStorage.setItem("browser_device_id", finalDeviceId);
  return finalDeviceId;
}

async function checkUserOnLoad() {
  showScreen("loadingScreen");
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    userIP = data.ip;

    const deviceId = getOrCreateDeviceId();
    const devQuery = query(collection(db, "registrations"), where("deviceId", "==", deviceId));
    const devSnapshot = await getDocs(devQuery);

    if (!devSnapshot.empty) {
      isUserRegistered = true;
      localStorage.setItem("user_registration_id", devSnapshot.docs[0].id);
      listenToRegistrationStatus(devSnapshot.docs[0].id);
      return;
    }

    const ipQuery = query(collection(db, "registrations"), where("ip", "==", userIP));
    const ipSnapshot = await getDocs(ipQuery);

    if (!ipSnapshot.empty) {
      isUserRegistered = true;
      localStorage.setItem("user_registration_id", ipSnapshot.docs[0].id);
      listenToRegistrationStatus(ipSnapshot.docs[0].id);
      return;
    }

    const localRegId = localStorage.getItem("user_registration_id");
    if (localRegId) {
      isUserRegistered = true;
      listenToRegistrationStatus(localRegId);
      return;
    }

    isUserRegistered = false;
    showScreen("home");
  } catch (err) {
    console.error("Lỗi kiểm tra thiết bị:", err);
    showScreen("home");
  }
}

function listenToRegistrationStatus(regId) {
  if (unsubscribeRegistration) unsubscribeRegistration();
  unsubscribeRegistration = onSnapshot(doc(db, "registrations", regId), (docSnap) => {
    if (!docSnap.exists()) {
      localStorage.removeItem("user_registration_id");
      isUserRegistered = false; // Update cached status
      showScreen("home");
      return;
    }
    const data = docSnap.data();
    showScreen("waiting");

    if (document.getElementById("waitingName")) document.getElementById("waitingName").textContent = data.name || "---";
    if (document.getElementById("waitingClass")) document.getElementById("waitingClass").textContent = data.className || "---";

    const statusIcon = document.getElementById("statusIcon");
    const waitingTitle = document.getElementById("waitingTitle");
    const waitingSubtitle = document.getElementById("waitingSubtitle");
    const waitingStatus = document.getElementById("waitingStatus");

    if (data.status === "approved" || data.status === "accepted") {
      if (statusIcon) statusIcon.textContent = "✅";
      if (waitingTitle) waitingTitle.textContent = "Đã được duyệt!";
      if (waitingSubtitle) waitingSubtitle.innerHTML = "Hồ sơ của bạn <strong>đã được chấp nhận</strong>. Chúc bạn thi đấu tốt!";
      if (waitingStatus) { waitingStatus.textContent = "Đã duyệt"; waitingStatus.className = "approved"; }
    } else if (data.status === "rejected" || data.status === "declined") {
      if (statusIcon) statusIcon.textContent = "❌";
      if (waitingTitle) waitingTitle.textContent = "Đã bị từ chối";
      if (waitingSubtitle) waitingSubtitle.innerHTML = "Rất tiếc, hồ sơ của bạn <strong>đã bị từ chối</strong> bởi Ban Tổ Chức.";
      if (waitingStatus) { waitingStatus.textContent = "Đã bị từ chối"; waitingStatus.className = "rejected"; }
    } else {
      if (statusIcon) statusIcon.textContent = "⏳";
      if (waitingTitle) waitingTitle.textContent = "Đang chờ duyệt";
      if (waitingSubtitle) waitingSubtitle.innerHTML = "Hồ sơ của bạn đã được gửi. Hiện tại đang <strong>chờ duyệt</strong>.";
      if (waitingStatus) { waitingStatus.textContent = "Đang chờ duyệt"; waitingStatus.className = "pending"; }
    }
  }, () => showScreen("home"));
}

// ==========================================
// MENU BUTTON EVENTS
// ==========================================
document.getElementById("registerBtn")?.addEventListener("click", () => {
  // Use cached registration status from loading screen - instant response
  if (isUserRegistered) {
    // If already registered, go to waiting screen
    const localRegId = localStorage.getItem("user_registration_id");
    if (localRegId) {
      listenToRegistrationStatus(localRegId);
    } else {
      // Fallback to re-check if no local ID
      checkUserOnLoad();
    }
  } else {
    // Show registration form if not registered
    showScreen("register");
  }
});
document.getElementById("scheduleBtn")?.addEventListener("click", () => {
  showScreen("schedule");
  loadScheduleData();
  loadBracketData();
});
document.getElementById("backFromRegister")?.addEventListener("click", () => showScreen("home"));
document.getElementById("backFromSchedule")?.addEventListener("click", () => showScreen("home"));
document.getElementById("backHomeAfterRegister")?.addEventListener("click", () => showScreen("home"));

document.getElementById("voteBtn")?.addEventListener("click", () => {
  showScreen("voteScreen");
  initVoteScreen();
});
document.getElementById("backFromVote")?.addEventListener("click", () => showScreen("home"));

// LUẬT THI ĐẤU EVENTS
document.getElementById("rulesBtn")?.addEventListener("click", () => showScreen("rulesScreen"));
document.getElementById("backFromRules")?.addEventListener("click", () => showScreen("home"));

// ==========================================
// REGISTER FORM SUBMISSION
// ==========================================
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const registerError = document.getElementById("registerError");
  const submitBtn = document.getElementById("submitBtn");
  if (registerError) registerError.textContent = "";

  const nameInput = document.getElementById("name")?.value.trim();
  const classInput = document.getElementById("className")?.value.trim();

  if (!nameInput || !classInput) {
    if (registerError) registerError.textContent = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const deviceId = getOrCreateDeviceId();
    const docRef = await addDoc(collection(db, "registrations"), {
      name: nameInput,
      className: classInput,
      ip: userIP || "0.0.0.0",
      deviceId: deviceId,
      deviceInfo: getDeviceInfo(),
      status: "pending",
      createdAt: serverTimestamp()
    });

    localStorage.setItem("user_registration_id", docRef.id);
    isUserRegistered = true; // Update cached status
    listenToRegistrationStatus(docRef.id);
  } catch (err) {
    if (registerError) registerError.textContent = "Lỗi kết nối. Vui lòng thử lại!";
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// ==========================================
// SCHEDULE & BRACKET
// ==========================================
function loadScheduleData() {
  const scheduleList = document.getElementById("scheduleList");
  if (!scheduleList) return;

  const matchesQuery = query(collection(db, "matches"), orderBy("dateTime", "asc"));
  onSnapshot(matchesQuery, (snapshot) => {
    scheduleList.innerHTML = "";
    if (snapshot.empty) {
      scheduleList.innerHTML = '<div class="empty">Chưa có lịch thi đấu nào được đăng.</div>';
      return;
    }
    snapshot.forEach((docSnap) => {
      const match = docSnap.data();
      const matchDate = match.dateTime?.toDate ? match.dateTime.toDate() : null;
      const formattedTime = matchDate ? matchDate.toLocaleString("vi-VN") : "Chưa xác định";
      const card = document.createElement("div");
      card.className = "card match-card";
      card.innerHTML = `
        <div class="match-time">🕒 ${formattedTime}</div>
        <div class="match-versus" style="display: flex; justify-content: space-around; align-items: center; margin-top: 8px;">
          <span class="player-name"><strong>${escapeHtml(match.player1)}</strong></span>
          <span class="vs" style="color: #3b82f6; font-weight: bold;">VS</span>
          <span class="player-name"><strong>${escapeHtml(match.player2)}</strong></span>
        </div>
      `;
      scheduleList.appendChild(card);
    });
  });
}

function loadBracketData() {
  const bracketWrapper = document.getElementById("bracketWrapper");
  if (!bracketWrapper) return;

  onSnapshot(doc(db, "tournament", "bracket16"), (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};
    const slots = data.slots || {};

    const s = (id) => {
      const playerName = slots[id];
      return playerName ? escapeHtml(playerName) : "— Trống —";
    };

    bracketWrapper.innerHTML = `
      <div class="bracket-32">
        
        <!-- NHÁNH TRÁI -->
        <div class="bracket-side left-side">
          <div class="round">
            <h3>Vòng 1/32</h3>
            <div class="matchup"><div class="bracket-select">${s(1)}</div><div class="bracket-select">${s(2)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(3)}</div><div class="bracket-select">${s(4)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(5)}</div><div class="bracket-select">${s(6)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(7)}</div><div class="bracket-select">${s(8)}</div></div>
          </div>
          <div class="round">
            <h3>Vòng 1/16</h3>
            <div class="matchup"><div class="bracket-select">${s(17)}</div><div class="bracket-select">${s(18)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(19)}</div><div class="bracket-select">${s(20)}</div></div>
          </div>
          <div class="round">
            <h3>Tứ kết</h3>
            <div class="matchup"><div class="bracket-select">${s(25)}</div><div class="bracket-select">${s(26)}</div></div>
          </div>
          <div class="round">
            <h3>Bán kết</h3>
            <div class="matchup"><div class="bracket-select">${s(29)}</div><div class="bracket-select">${s(30)}</div></div>
          </div>
        </div>

        <!-- TRẬN CHUNG KẾT -->
        <div class="bracket-center">
          <div class="round">
            <h3>Chung kết</h3>
            <div class="matchup champion-box">
              <div class="trophy">🏆 VÔ ĐỊCH</div>
              <div class="bracket-select champion-select">${s(31)}</div>
            </div>
          </div>
        </div>

        <!-- NHÁNH PHẢI -->
        <div class="bracket-side right-side">
          <div class="round">
            <h3>Bán kết</h3>
            <div class="matchup"><div class="bracket-select">${s(27)}</div><div class="bracket-select">${s(28)}</div></div>
          </div>
          <div class="round">
            <h3>Tứ kết</h3>
            <div class="matchup"><div class="bracket-select">${s(21)}</div><div class="bracket-select">${s(22)}</div></div>
          </div>
          <div class="round">
            <h3>Vòng 1/16</h3>
            <div class="matchup"><div class="bracket-select">${s(9)}</div><div class="bracket-select">${s(10)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(11)}</div><div class="bracket-select">${s(12)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(13)}</div><div class="bracket-select">${s(14)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(15)}</div><div class="bracket-select">${s(16)}</div></div>
          </div>
          <div class="round">
            <h3>Vòng 1/32</h3>
            <div class="matchup"><div class="bracket-select">${s(33)}</div><div class="bracket-select">${s(34)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(35)}</div><div class="bracket-select">${s(36)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(37)}</div><div class="bracket-select">${s(38)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(39)}</div><div class="bracket-select">${s(40)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(41)}</div><div class="bracket-select">${s(42)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(43)}</div><div class="bracket-select">${s(44)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(45)}</div><div class="bracket-select">${s(46)}</div></div>
            <div class="matchup"><div class="bracket-select">${s(47)}</div><div class="bracket-select">${s(48)}</div></div>
          </div>
        </div>

      </div>
    `;
  }, (error) => {
    console.error("Lỗi tải sơ đồ cây:", error);
    bracketWrapper.innerHTML = '<div class="empty">Chưa thể tải sơ đồ thi đấu.</div>';
  });
}

// ==========================================
// VOTE SYSTEM (GIAO DIỆN TỐI GIẢN - 1 TÔNG MÀU CHỦ ĐẠO)
// ==========================================
// Global flag to prevent multiple simultaneous votes
let isVoting = false;

// Remove existing vote listeners to prevent duplicates
function removeVoteListeners() {
  const voteBtnA = document.getElementById("voteBtnA");
  const voteBtnB = document.getElementById("voteBtnB");
  
  if (voteBtnA) {
    const newBtnA = voteBtnA.cloneNode(true);
    voteBtnA.parentNode.replaceChild(newBtnA, voteBtnA);
  }
  
  if (voteBtnB) {
    const newBtnB = voteBtnB.cloneNode(true);
    voteBtnB.parentNode.replaceChild(newBtnB, voteBtnB);
  }
}

function initVoteScreen() {
  const voteContent = document.getElementById("voteContent");
  if (!voteContent) return;

  const voteDocRef = doc(db, "settings", "voteConfig");

  onSnapshot(voteDocRef, async (docSnap) => {
    if (!docSnap.exists()) {
      await setDoc(voteDocRef, {
        active: true,
        playerA: "Người chơi A",
        playerB: "Người chơi B",
        votesA: 0,
        votesB: 0
      });
      return;
    }

    const voteData = docSnap.data();

    if (!voteData.active) {
      voteContent.innerHTML = '<div class="empty">Tính năng bình chọn hiện chưa mở.</div>';
      return;
    }

    const resetKey = voteData.resetKey || "default";
    const total = (voteData.votesA || 0) + (voteData.votesB || 0);
    const percentA = total > 0 ? Math.round(((voteData.votesA || 0) / total) * 100) : 50;
    const percentB = total > 0 ? (100 - percentA) : 50;
    
    // Check if this IP has already voted for this match
    let hasVoted = false;
    if (userIP) {
      try {
        const ipVoteQuery = query(collection(db, "vote_records"), 
          where("matchId", "==", resetKey),
          where("ip", "==", userIP));
        const ipVoteSnapshot = await getDocs(ipVoteQuery);
        hasVoted = !ipVoteSnapshot.empty;
        console.log("Vote status check - IP:", userIP, "Has voted:", hasVoted, "Match:", resetKey);
      } catch (err) {
        console.error("Error checking vote status:", err);
      }
    } else {
      console.log("Warning: userIP is not set!");
    }

    voteContent.innerHTML = `
      <div class="vote-header" style="text-align: center;">
        <h2 style="font-size: 1.3rem; margin-bottom: 4px;">
          ${escapeHtml(voteData.playerA || "A")} 
          <span style="color: #666; font-size: 0.9rem; margin: 0 6px;">VS</span> 
          ${escapeHtml(voteData.playerB || "B")}
        </h2>
        <p class="muted" style="font-size: 0.85rem;">Tổng số lượt bình chọn: <strong>${total}</strong></p>
      </div>

      <div class="vote-progress-wrapper" style="margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 6px;">
          <span style="color: #3b82f6;">${percentA}%</span>
          <span style="color: #a5a5b2;">${percentB}%</span>
        </div>
        <div class="vote-bar-container" style="display: flex; height: 12px; background: #1a1a24; border-radius: 6px; overflow: hidden; border: 1px solid #282836;">
          <div style="width: ${percentA}%; background: #3b82f6; transition: width 0.4s ease;"></div>
          <div style="width: ${percentB}%; background: #2a2a38; transition: width 0.4s ease;"></div>
        </div>
      </div>

      <div class="vote-actions" style="display: flex; gap: 12px; margin-top: 20px;">
        <button id="voteBtnA" class="primary vote-option-btn" style="flex: 1;" ${hasVoted ? 'disabled' : ''}>
          Vote ${escapeHtml(voteData.playerA || "A")}
        </button>
        <button id="voteBtnB" class="secondary vote-option-btn" style="flex: 1; margin-top: 0;" ${hasVoted ? 'disabled' : ''}>
          Vote ${escapeHtml(voteData.playerB || "B")}
        </button>
      </div>
      ${hasVoted ? '<p class="muted" style="margin-top: 14px; text-align: center; font-size: 0.85rem;">✓ Bạn đã thực hiện bình chọn cho trận đấu này.</p>' : ''}
    `;

    if (!hasVoted) {
      // Remove any existing listeners first
      removeVoteListeners();
      
      // Add fresh listeners
      document.getElementById("voteBtnA")?.addEventListener("click", () => handleVote("A", resetKey));
      document.getElementById("voteBtnB")?.addEventListener("click", () => handleVote("B", resetKey));
    }
  });
}

async function handleVote(option, resetKey) {
  console.log("Vote attempt - IP:", userIP, "Option:", option, "MatchID:", resetKey);
  
  // Prevent multiple simultaneous votes
  if (isVoting) {
    console.log("Already voting, ignoring click");
    return;
  }
  
  if (!userIP) {
    console.log("No IP detected");
    return;
  }

  isVoting = true;

  // Immediately disable buttons to prevent double-clicking
  const voteBtnA = document.getElementById("voteBtnA");
  const voteBtnB = document.getElementById("voteBtnB");
  if (voteBtnA) voteBtnA.disabled = true;
  if (voteBtnB) voteBtnB.disabled = true;

  try {
    // Check if this IP has already voted for this match
    const ipVoteQuery = query(collection(db, "vote_records"), 
      where("matchId", "==", resetKey),
      where("ip", "==", userIP));
    const ipVoteSnapshot = await getDocs(ipVoteQuery);
    
    console.log("Existing votes for this IP:", ipVoteSnapshot.size);
    
    if (!ipVoteSnapshot.empty) {
      console.log("User already voted, keeping buttons disabled");
      isVoting = false;
      return;
    }

    // Record the vote in vote_records collection
    console.log("Recording vote in vote_records...");
    await addDoc(collection(db, "vote_records"), {
      matchId: resetKey,
      ip: userIP,
      vote: option,
      timestamp: serverTimestamp()
    });

    // Update the vote count
    console.log("Updating vote count...");
    await updateDoc(doc(db, "settings", "voteConfig"), {
      [option === "A" ? "votesA" : "votesB"]: increment(1)
    });

    console.log("Vote recorded successfully");

    // Refresh the vote screen to show updated state
    setTimeout(() => {
      isVoting = false;
      initVoteScreen();
    }, 500);
  } catch (err) {
    console.error("Vote error:", err);
    isVoting = false;
    
    // Re-enable buttons on error
    if (voteBtnA) voteBtnA.disabled = false;
    if (voteBtnB) voteBtnB.disabled = false;
  }
}

// ==========================================
// CHAT PROFILE & AUTH LOGIC
// ==========================================
let currentUsername = localStorage.getItem("chat_username") || "";
let avatarBase64 = "";
let rawImageObj = null;
let settingsAvatarBase64 = "";
let settingsRawImageObj = null;

document.getElementById("closeAuthModalBtn")?.addEventListener("click", () => {
  document.getElementById("usernameModal")?.classList.remove("active");
  showScreen("home");
});

const tabRegisterBtn = document.getElementById("tabRegisterBtn");
const tabLoginBtn = document.getElementById("tabLoginBtn");
const usernameForm = document.getElementById("usernameForm");
const loginForm = document.getElementById("loginForm");

tabRegisterBtn?.addEventListener("click", () => {
  tabRegisterBtn.style.color = "#2563eb";
  tabLoginBtn.style.color = "#888";
  usernameForm.style.display = "block";
  loginForm.style.display = "none";
});

tabLoginBtn?.addEventListener("click", () => {
  tabLoginBtn.style.color = "#2563eb";
  tabRegisterBtn.style.color = "#888";
  usernameForm.style.display = "none";
  loginForm.style.display = "block";
});

document.getElementById("chatBtn")?.addEventListener("click", () => {
  if (!currentUsername) {
    document.getElementById("usernameModal")?.classList.add("active");
  } else {
    showScreen("chatScreen");
    updateChatHeaderInfo();
    initChatListener();
  }
});
document.getElementById("backFromChat")?.addEventListener("click", () => showScreen("home"));

async function updateChatHeaderInfo() {
  const currentNicknameTag = document.getElementById("currentNicknameTag");
  if (!currentNicknameTag || !currentUsername) return;

  try {
    const snap = await get(ref(rtdb, `users_profile/${currentUsername}`));
    if (snap.exists()) {
      const data = snap.val();
      const displayNameShow = data.displayName || data.username;
      currentNicknameTag.textContent = `Tài khoản: @${data.username} (${displayNameShow})`;
    } else {
      currentNicknameTag.textContent = `Tài khoản: @${currentUsername}`;
    }
  } catch (err) {
    currentNicknameTag.textContent = `Tài khoản: @${currentUsername}`;
  }
}

document.getElementById("btnSignOut")?.addEventListener("click", () => {
  if (confirm("Bạn có chắc chắn muốn đăng xuất tài khoản chat không?")) {
    localStorage.removeItem("chat_username");
    currentUsername = "";
    showScreen("home");
  }
});

// ==========================================
// AVATAR HANDLING
// ==========================================
function loadImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    rawImageObj = new Image();
    rawImageObj.onload = processAvatarZoom;
    rawImageObj.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById("avatarFileInput")?.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    loadImageFromFile(e.target.files[0]);
  }
});

// Click on drop zone to trigger file input
document.getElementById("dropZone")?.addEventListener("click", () => {
  document.getElementById("avatarFileInput")?.click();
});

const dropZone = document.getElementById("dropZone");
if (dropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = "#2563eb";
      dropZone.style.background = "#1e293b";
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = "#444";
      dropZone.style.background = "#16161e";
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) {
      loadImageFromFile(files[0]);
    }
  }, false);
}

document.addEventListener("paste", (e) => {
  const usernameModal = document.getElementById("usernameModal");
  const settingsModal = document.getElementById("settingsModal");
  
  // Check if either modal is active
  const isUsernameModalActive = usernameModal && usernameModal.classList.contains("active");
  const isSettingsModalActive = settingsModal && settingsModal.classList.contains("active");
  
  if (!isUsernameModalActive && !isSettingsModalActive) return;

  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (isUsernameModalActive) {
        loadImageFromFile(file);
      } else if (isSettingsModalActive) {
        loadSettingsAvatarFromFile(file);
      }
      break;
    }
  }
});

document.getElementById("zoomRange")?.addEventListener("input", () => {
  if (rawImageObj) processAvatarZoom();
});

function processAvatarZoom() {
  const avatarPreview = document.getElementById("avatarPreview");
  const zoomRange = document.getElementById("zoomRange");
  if (!rawImageObj || !avatarPreview) return;
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const size = 150; 
  canvas.width = size; canvas.height = size;

  const zoom = parseFloat(zoomRange ? zoomRange.value : 1);
  const scale = Math.max(size / rawImageObj.width, size / rawImageObj.height) * zoom;
  const width = rawImageObj.width * scale;
  const height = rawImageObj.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(rawImageObj, x, y, width, height);

  avatarBase64 = canvas.toDataURL("image/jpeg", 0.8);
  avatarPreview.src = avatarBase64;
  avatarPreview.style.display = "block";
}

// FORM ĐĂNG KÝ CHAT
document.getElementById("usernameForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usernameError = document.getElementById("usernameError");
  const enteredUsername = document.getElementById("modalUsernameInput").value.trim().toLowerCase();
  const enteredPassword = document.getElementById("modalPasswordInput").value.trim();
  const enteredBio = document.getElementById("modalBioInput")?.value.trim() || "";

  if (!/^[a-z0-9]+$/.test(enteredUsername)) {
    if (usernameError) usernameError.textContent = "Username KHÔNG được chứa chữ viết hoa, ký hiệu đặc biệt hoặc khoảng trắng!";
    return;
  }
  if (enteredUsername.includes("admin") || enteredUsername.includes("btc")) {
    if (usernameError) usernameError.textContent = "Username này chứa từ khóa hạn chế!";
    return;
  }
  if (enteredPassword.length < 4) {
    if (usernameError) usernameError.textContent = "Mật khẩu phải tối thiểu 4 ký tự!";
    return;
  }

  try {
    const nameRef = ref(rtdb, `users_profile/${enteredUsername}`);
    const snapshot = await get(nameRef);
    if (snapshot.exists()) {
      if (usernameError) usernameError.textContent = "Username này đã được sử dụng!";
      return;
    }
    
    const finalAvatar = avatarBase64 || `https://ui-avatars.com/api/?name=${encodeURIComponent(enteredUsername)}&background=2563eb&color=fff`;

    await set(nameRef, {
      username: enteredUsername,
      password: enteredPassword,
      displayName: enteredUsername,
      avatar: finalAvatar,
      bio: enteredBio,
      createdAt: rtdbTimestamp()
    });

    localStorage.setItem("chat_username", enteredUsername);
    currentUsername = enteredUsername;
    document.getElementById("usernameModal")?.classList.remove("active");
    showScreen("chatScreen");
    updateChatHeaderInfo();
    initChatListener();
  } catch (err) {
    if (usernameError) usernameError.textContent = "Lỗi kết nối Server. Vui lòng thử lại!";
  }
});

// FORM ĐĂNG NHẬP CHAT
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const loginError = document.getElementById("loginError");
  const enteredUsername = document.getElementById("loginUsernameInput").value.trim().toLowerCase();
  const enteredPassword = document.getElementById("loginPasswordInput").value.trim();

  if (!enteredUsername || !enteredPassword) {
    if (loginError) loginError.textContent = "Vui lòng nhập đầy đủ thông tin!";
    return;
  }

  try {
    const userRef = ref(rtdb, `users_profile/${enteredUsername}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      if (loginError) loginError.textContent = "Tài khoản không tồn tại!";
      return;
    }

    const userData = snapshot.val();
    if (userData.password !== enteredPassword) {
      if (loginError) loginError.textContent = "Sai mật khẩu!";
      return;
    }

    localStorage.setItem("chat_username", enteredUsername);
    currentUsername = enteredUsername;
    document.getElementById("usernameModal")?.classList.remove("active");
    showScreen("chatScreen");
    updateChatHeaderInfo();
    initChatListener();
  } catch (err) {
    if (loginError) loginError.textContent = "Lỗi kết nối Server. Vui lòng thử lại!";
  }
});

// ==========================================
// CHAT MESSAGES REALTIME
// ==========================================
let isChatInitialized = false;

function initChatListener() {
  if (isChatInitialized) return;
  isChatInitialized = true;

  const chatMessages = document.getElementById("chatMessages");

  onValue(rtdbQuery(ref(rtdb, "chat_messages"), limitToLast(60)), (snapshot) => {
    if (!chatMessages) return;

    chatMessages.innerHTML = "";
    if (!snapshot.exists()) {
      chatMessages.innerHTML = '<div class="empty">Chưa có tin nhắn nào.</div>';
      return;
    }

    snapshot.forEach((childSnap) => {
      appendMessengerBubble(chatMessages, childSnap.val(), childSnap.key);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// SỰ KIỆN GỬI TIN NHẮN
document.getElementById("chatForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const chatInput = document.getElementById("chatInput");
  const text = chatInput.value.trim();
  if (!text || !currentUsername) return;

  chatInput.value = "";

  let userAvatar = `https://ui-avatars.com/api/?name=${currentUsername}`;
  let userDisplayName = currentUsername;

  try {
    const userSnap = await get(ref(rtdb, `users_profile/${currentUsername}`));
    if (userSnap.exists()) {
      const uData = userSnap.val();
      if (uData.avatar) userAvatar = uData.avatar;
      if (uData.displayName) userDisplayName = uData.displayName;
    }
  } catch (err) {}

  try {
    await push(ref(rtdb, "chat_messages"), {
      username: currentUsername,
      displayName: userDisplayName,
      avatar: userAvatar,
      text: text,
      isAdmin: false,
      timestamp: rtdbTimestamp()
    });
  } catch (err) {
    console.error("Lỗi gửi tin nhắn:", err);
  }
});

function appendMessengerBubble(container, msg, msgKey = null) {
  const item = document.createElement("div");
  const isMe = msg.username === currentUsername;
  item.className = `chat-bubble-row ${isMe ? "msg-right" : "msg-left"}`;
  
  const currentDisplayName = msg.displayName || msg.username;

  item.innerHTML = `
    <div class="chat-user-header" style="display:flex; align-items:center; gap:6px; cursor:pointer;">
      <img src="${escapeHtml(msg.avatar)}" class="chat-avatar-thumb" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />
      <span class="chat-sender-name">${escapeHtml(currentDisplayName)} ${msg.isAdmin ? '<span class="admin-badge">[ ADMIN ]</span>' : ''}</span>
      ${isMe ? '<button class="delete-msg-btn" data-key="' + (msgKey || '') + '" style="margin-left:auto; background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:0.8rem;">🗑️</button>' : ''}
    </div>
    <div class="chat-bubble">${escapeHtml(msg.text)}</div>
  `;

  item.querySelector(".chat-user-header")?.addEventListener("click", () => openUserProfile(msg.username));
  
  // Add delete functionality for own messages
  const deleteBtn = item.querySelector(".delete-msg-btn");
  if (deleteBtn && msgKey) {
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("Bạn có chắc muốn xóa tin nhắn này không?")) {
        try {
          await rtdbRemove(ref(rtdb, `chat_messages/${msgKey}`));
        } catch (err) {
          console.error("Error deleting message:", err);
        }
      }
    });
  }
  
  container.appendChild(item);
}

// ==========================================
// USER PROFILE MODAL
// ==========================================
async function openUserProfile(targetUsername) {
  const userProfileModal = document.getElementById("userProfileModal");
  if (!targetUsername || !userProfileModal) return;
  try {
    const targetSnap = await get(ref(rtdb, `users_profile/${targetUsername}`));
    if (targetSnap.exists()) {
      const data = targetSnap.val();
      document.getElementById("profileAvatar").src = data.avatar || `https://ui-avatars.com/api/?name=${data.displayName}`;
      document.getElementById("profileDisplayName").textContent = data.displayName || data.username;
      document.getElementById("profileUsername").textContent = `@${data.username}`;
      document.getElementById("profileBio").textContent = data.bio || "Người dùng này chưa viết lời giới thiệu nào.";
    } else {
      document.getElementById("profileDisplayName").textContent = targetUsername;
      document.getElementById("profileUsername").textContent = `@${targetUsername}`;
      document.getElementById("profileBio").textContent = "Không tìm thấy hồ sơ.";
    }
    userProfileModal.classList.add("active");
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("closeProfileBtn")?.addEventListener("click", () => {
  document.getElementById("userProfileModal")?.classList.remove("active");
});

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

checkUserOnLoad();

// ==========================================
// SETTINGS MODAL: CHANGE NAME / USERNAME
// ==========================================
document.getElementById("settingsBtn")?.addEventListener("click", async () => {
  if (!currentUsername) return;
  const settingsModal = document.getElementById("settingsModal");
  
  const snap = await get(ref(rtdb, `users_profile/${currentUsername}`));
  if (snap.exists()) {
    const data = snap.val();
    document.getElementById("settingDisplayName").value = data.displayName || "";
    document.getElementById("settingUsername").value = data.username || "";
    document.getElementById("settingBioInput").value = data.bio || "";
    
    // Show current avatar
    const avatarPreview = document.getElementById("settingAvatarPreview");
    if (avatarPreview && data.avatar) {
      avatarPreview.src = data.avatar;
      avatarPreview.style.display = "block";
    }
    
    document.getElementById("settingsError").textContent = "";
    document.getElementById("settingsSuccess").textContent = "";
    settingsModal?.classList.add("active");
  }
});

document.getElementById("closeSettingsBtn")?.addEventListener("click", () => {
  document.getElementById("settingsModal")?.classList.remove("active");
  // Reset settings avatar
  settingsAvatarBase64 = "";
  settingsRawImageObj = null;
  const avatarPreview = document.getElementById("settingAvatarPreview");
  if (avatarPreview) {
    avatarPreview.style.display = "none";
    avatarPreview.src = "";
  }
  document.getElementById("settingAvatarInput").value = "";
});

// Settings avatar file input handler
document.getElementById("settingAvatarInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadSettingsAvatarFromFile(file);
});

// Click on settings drop zone to trigger file input
document.getElementById("settingsDropZone")?.addEventListener("click", () => {
  document.getElementById("settingAvatarInput")?.click();
});

// Settings drag and drop functionality
const settingsDropZone = document.getElementById("settingsDropZone");
if (settingsDropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    settingsDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    settingsDropZone.addEventListener(eventName, () => {
      settingsDropZone.style.borderColor = "#2563eb";
      settingsDropZone.style.background = "#1e293b";
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    settingsDropZone.addEventListener(eventName, () => {
      settingsDropZone.style.borderColor = "#444";
      settingsDropZone.style.background = "#16161e";
    }, false);
  });

  settingsDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) {
      loadSettingsAvatarFromFile(files[0]);
    }
  }, false);
}

function loadSettingsAvatarFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    settingsRawImageObj = new Image();
    settingsRawImageObj.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 150; 
      canvas.width = size; canvas.height = size;

      const scale = Math.max(size / settingsRawImageObj.width, size / settingsRawImageObj.height);
      const width = settingsRawImageObj.width * scale;
      const height = settingsRawImageObj.height * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(settingsRawImageObj, x, y, width, height);

      settingsAvatarBase64 = canvas.toDataURL("image/jpeg", 0.8);
      
      const avatarPreview = document.getElementById("settingAvatarPreview");
      if (avatarPreview) {
        avatarPreview.src = settingsAvatarBase64;
        avatarPreview.style.display = "block";
      }
    };
    settingsRawImageObj.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById("settingsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("settingsError");
  const succEl = document.getElementById("settingsSuccess");
  errEl.textContent = ""; succEl.textContent = "";
  
  const newDisplayName = document.getElementById("settingDisplayName").value.trim();
  const newUsername = document.getElementById("settingUsername").value.trim().toLowerCase();
  const newBio = document.getElementById("settingBioInput").value.trim();
  
  if (!newUsername || !newDisplayName) {
    errEl.textContent = "Không được để trống thông tin!"; return;
  }
  if (!/^[a-z0-9]+$/.test(newUsername)) {
    errEl.textContent = "Username chỉ chứa chữ cái thường và số!"; return;
  }
  if (newUsername.includes("admin") || newUsername.includes("btc")) {
    errEl.textContent = "Username chứa từ khóa bị cấm!"; return;
  }

  try {
    const oldUsername = currentUsername;
    const oldRef = ref(rtdb, `users_profile/${oldUsername}`);
    const snap = await get(oldRef);
    if (!snap.exists()) return;
    
    const userData = snap.val();
    const now = Date.now();
    const ONE_DAY_MS = 86400000;
    const TWO_DAYS_MS = 172800000;
    
    let newData = { ...userData };
    let isChanged = false;

    if (newDisplayName !== userData.displayName) {
      const lastDispTime = userData.lastDisplayNameChange || 0;
      if (now - lastDispTime < ONE_DAY_MS) {
        const timeLeft = Math.ceil((ONE_DAY_MS - (now - lastDispTime)) / 3600000);
        errEl.textContent = `Vui lòng đợi ${timeLeft} giờ nữa để đổi Tên hiển thị.`; return;
      }
      newData.displayName = newDisplayName;
      newData.lastDisplayNameChange = now;
      isChanged = true;
    }

    if (newUsername !== oldUsername) {
      const lastUserTime = userData.lastUsernameChange || 0;
      if (now - lastUserTime < TWO_DAYS_MS) {
        const timeLeft = Math.ceil((TWO_DAYS_MS - (now - lastUserTime)) / 3600000);
        errEl.textContent = `Vui lòng đợi ${timeLeft} giờ nữa để đổi Username.`; return;
      }
      
      const newRefSnap = await get(ref(rtdb, `users_profile/${newUsername}`));
      if (newRefSnap.exists()) {
        errEl.textContent = "Username này đã có người sử dụng!"; return;
      }
      
      newData.username = newUsername;
      newData.lastUsernameChange = now;
      isChanged = true;

      await rtdbRemove(oldRef);
      await set(ref(rtdb, `users_profile/${newUsername}`), newData);
      
      currentUsername = newUsername;
      localStorage.setItem("chat_username", newUsername);
    } else {
      // Update avatar if changed
      if (settingsAvatarBase64) {
        newData.avatar = settingsAvatarBase64;
        isChanged = true;
      }
      
      // Update bio if changed
      if (newBio !== userData.bio) {
        newData.bio = newBio;
        isChanged = true;
      }
      
      if (isChanged) {
        await set(oldRef, newData);
      }
    }

    if (isChanged) {
      succEl.textContent = "Cập nhật thành công!";
      updateChatHeaderInfo();
      
      // Reset settings avatar
      settingsAvatarBase64 = "";
      settingsRawImageObj = null;
      const avatarPreview = document.getElementById("settingAvatarPreview");
      if (avatarPreview) {
        avatarPreview.style.display = "none";
        avatarPreview.src = "";
      }
      document.getElementById("settingAvatarInput").value = "";
      
      setTimeout(() => document.getElementById("settingsModal")?.classList.remove("active"), 1000);
    } else {
      errEl.textContent = "Không có thông tin nào được thay đổi.";
    }

  } catch (err) {
    console.error(err);
    errEl.textContent = "Lỗi kết nối máy chủ. Vui lòng thử lại sau.";
  }
});
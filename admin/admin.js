import { db, rtdb, messaging } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { 
  ref, 
  onValue, 
  remove as rtdbRemove,
  push,
  serverTimestamp as rtdbTimestamp,
  get,
  set,
  query as rtdbQuery,
  limitToLast
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js";

// DOM Elements
const pendingList = document.getElementById("pendingList");
const approvedUsersList = document.getElementById("approvedUsersList");
const rejectedUsersList = document.getElementById("rejectedUsersList");
const player1Select = document.getElementById("player1Select");
const player2Select = document.getElementById("player2Select");
const createMatchForm = document.getElementById("createMatchForm");
const matchTimeInput = document.getElementById("matchTime");
const matchesTableBody = document.getElementById("matchesTableBody");
const matchError = document.getElementById("matchError");

// Vote Elements
const voteActiveToggle = document.getElementById("voteActiveToggle");
const votePlayerA = document.getElementById("votePlayerA");
const votePlayerB = document.getElementById("votePlayerB");
const saveVoteBtn = document.getElementById("saveVoteBtn");
const resetVoteBtn = document.getElementById("resetVoteBtn");
const voteAdminStatus = document.getElementById("voteAdminStatus");

// Chat Users Elements
const chatUsersTableBody = document.getElementById("chatUsersTableBody");

// Badge Management Elements
const badgeUserSelect = document.getElementById("badgeUserSelect");
const customBadgeName = document.getElementById("customBadgeName");
const badgeSolidColor = document.getElementById("badgeSolidColor");
const badgeGradientColor1 = document.getElementById("badgeGradientColor1");
const badgeGradientColor2 = document.getElementById("badgeGradientColor2");
const solidColorPicker = document.getElementById("solidColorPicker");
const gradientColorPickers = document.getElementById("gradientColorPickers");
const removeBadgeToggle = document.getElementById("removeBadgeToggle");
const addBadgeBtn = document.getElementById("addBadgeBtn");
const removeAllBadgesBtn = document.getElementById("removeAllBadgesBtn");
const badgeStatus = document.getElementById("badgeStatus");
const currentBadgesDisplay = document.getElementById("currentBadgesDisplay");

let approvedPlayers = [];

// Store all unsubscribe functions for cleanup
let allUnsubscribes = [];

// Helper to track unsubscribes
function trackUnsubscribe(unsubscribe) {
  allUnsubscribes.push(unsubscribe);
  return unsubscribe;
}

// Helper function to normalize badge data (convert old format to new array format)
function normalizeBadges(badges) {
  if (!badges) return [];
  
  // If it's already an array, return it
  if (Array.isArray(badges)) return badges;
  
  // If it's an object with name and color (old format), convert to array
  if (typeof badges === 'object' && badges.name) {
    return [{
      name: badges.name,
      type: badges.type || 'gradient',
      color1: badges.color1 || badges.color || '#6366f1',
      color2: badges.color2 || badges.color || '#a855f7'
    }];
  }
  
  // If it's an empty object or invalid, return empty array
  return [];
}

// Badge color type toggle handling
document.querySelectorAll('input[name="badgeColorType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'solid') {
      solidColorPicker.style.display = 'block';
      gradientColorPickers.style.display = 'none';
    } else {
      solidColorPicker.style.display = 'none';
      gradientColorPickers.style.display = 'block';
    }
  });
});

// ==========================================
// 1. TẢI VÀ QUẢN LÝ DANH SÁCH ĐƠN ĐĂNG KÝ
// ==========================================
const regQuery = query(collection(db, "registrations"), orderBy("createdAt", "desc"));

trackUnsubscribe(onSnapshot(regQuery, (snapshot) => {
  if (pendingList) pendingList.innerHTML = "";
  if (approvedUsersList) approvedUsersList.innerHTML = "";
  if (rejectedUsersList) rejectedUsersList.innerHTML = "";

  approvedPlayers = [];
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = data.name || "---";
    const className = data.className || "---";
    const userIP = data.ip || data.deviceId || "N/A";
    const status = data.status || "pending";

    // 1. DANH SÁCH ĐANG CHỜ DUYỆT
    if (status === "pending") {
      pendingCount++;
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "12px";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0 0 6px 0;">${escapeHtml(name)}</h3>
            <p class="muted" style="margin: 0;">Lớp: <strong>${escapeHtml(className)}</strong> | IP/ID: ${escapeHtml(userIP)}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="primary btn-approve" data-id="${id}" style="padding: 8px 16px;">Duyệt</button>
            <button class="btn-decline" data-id="${id}" style="padding: 8px 16px; background: #ce2c2c; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Từ chối</button>
          </div>
        </div>
      `;
      if (pendingList) pendingList.appendChild(card);

    // 2. DANH SÁCH ĐÃ DUYỆT
    } else if (status === "approved" || status === "accepted") {
      approvedCount++;
      approvedPlayers.push({ id, name, className });

      if (approvedUsersList) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${escapeHtml(name)}</strong></td>
          <td>${escapeHtml(className)}</td>
          <td><code>${escapeHtml(userIP)}</code></td>
          <td><span style="color: #22c55e; font-weight: bold;">✓ Đã duyệt</span></td>
          <td>
            <button class="btn-delete-user" data-id="${id}" style="background: #ce2c2c; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Xóa</button>
          </td>
        `;
        approvedUsersList.appendChild(row);
      }

    // 3. DANH SÁCH BỊ TỪ CHỐI
    } else if (status === "rejected" || status === "declined") {
      rejectedCount++;
      if (rejectedUsersList) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${escapeHtml(name)}</strong></td>
          <td>${escapeHtml(className)}</td>
          <td><code>${escapeHtml(userIP)}</code></td>
          <td>
            <button class="btn-delete-user" data-id="${id}" style="background: #ce2c2c; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Xóa đơn này</button>
          </td>
        `;
        rejectedUsersList.appendChild(row);
      }
    }
  });

  if (pendingCount === 0 && pendingList) {
    pendingList.innerHTML = '<div class="muted">Không có đơn nào đang chờ duyệt.</div>';
  }

  if (approvedCount === 0 && approvedUsersList) {
    approvedUsersList.innerHTML = '<tr><td colspan="5" class="muted" style="text-align: center; padding: 12px;">Chưa có người chơi nào được duyệt.</td></tr>';
  }

  if (rejectedCount === 0 && rejectedUsersList) {
    rejectedUsersList.innerHTML = '<tr><td colspan="4" class="muted" style="text-align: center; padding: 12px;">Không có đơn nào bị từ chối.</td></tr>';
  }

  // Cập nhật các dropdown chọn người chơi
  updatePlayerSelects();
  populateBracketSelects();
  populateVoteSelects();
}));

// Bắt sự kiện Click Duyệt / Từ chối / Xóa (Có TRY-CATCH)
document.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  try {
    if (e.target.classList.contains("btn-approve")) {
      await updateDoc(doc(db, "registrations", id), { status: "approved" });
    } 
    else if (e.target.classList.contains("btn-decline")) {
      await updateDoc(doc(db, "registrations", id), { status: "rejected" });
    } 
    else if (e.target.classList.contains("btn-delete-user")) {
      if (confirm("Bạn có chắc muốn xóa đơn này?")) {
        await deleteDoc(doc(db, "registrations", id));
      }
    }
  } catch (err) {
    console.error("Lỗi Firestore:", err);
    alert("Không thể cập nhật: " + err.message + "\n\nHãy kiểm tra lại Rules trong Firebase Console!");
  }
});

// Cập nhật Dropdown chọn người chơi
function updatePlayerSelects() {
  if (!player1Select || !player2Select) return;
  const val1 = player1Select.value;
  const val2 = player2Select.value;

  const optionsHtml = '<option value="">-- Chọn người chơi --</option>' +
    approvedPlayers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.className)})</option>`).join("");

  player1Select.innerHTML = optionsHtml;
  player2Select.innerHTML = optionsHtml;

  player1Select.value = val1;
  player2Select.value = val2;
}

// ==========================================
// 2. XẾP LỊCH THI ĐẤU MỚI
// ==========================================
if (createMatchForm) {
  createMatchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (matchError) matchError.textContent = "";

    const p1 = player1Select.value;
    const p2 = player2Select.value;
    const timeVal = matchTimeInput.value;

    if (p1 === p2) {
      if (matchError) matchError.textContent = "Vui lòng chọn 2 người chơi khác nhau!";
      return;
    }

    try {
      await addDoc(collection(db, "matches"), {
        player1: p1,
        player2: p2,
        dateTime: Timestamp.fromDate(new Date(timeVal)),
        createdAt: Timestamp.now()
      });

      createMatchForm.reset();
      alert("Tạo trận đấu thành công!");
    } catch (err) {
      console.error(err);
      if (matchError) matchError.textContent = "Lỗi khi tạo trận đấu: " + err.message;
    }
  });
}

// Tải danh sách các trận đấu
const matchesQuery = query(collection(db, "matches"), orderBy("dateTime", "asc"));
trackUnsubscribe(onSnapshot(matchesQuery, (snapshot) => {
  if (!matchesTableBody) return;
  matchesTableBody.innerHTML = "";

  if (snapshot.empty) {
    matchesTableBody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align: center; padding: 12px;">Chưa có trận đấu nào.</td></tr>';
    return;
  }

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const dateText = data.dateTime?.toDate ? data.dateTime.toDate().toLocaleString("vi-VN") : "N/A";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(data.player1)}</strong></td>
      <td>VS</td>
      <td><strong>${escapeHtml(data.player2)}</strong></td>
      <td>${escapeHtml(dateText)}</td>
      <td>
        <button class="btn-delete-match" data-id="${id}" style="background: #ce2c2c; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Xóa</button>
      </td>
    `;
    matchesTableBody.appendChild(row);
  });
}));

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-delete-match")) {
    const id = e.target.dataset.id;
    if (confirm("Bạn có chắc muốn xóa trận đấu này?")) {
      try {
        await deleteDoc(doc(db, "matches", id));
      } catch (err) {
        alert("Lỗi khi xóa trận đấu: " + err.message);
      }
    }
  }
});

// ==========================================
// 3. CẬP NHẬT SƠ ĐỒ CÂY THI ĐẤU (BRACKET 16)
// ==========================================
function populateBracketSelects() {
  const selects = document.querySelectorAll(".bracket-select");
  selects.forEach((sel) => {
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— Trống —</option>' +
      approvedPlayers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.className)})</option>`).join("");
    sel.value = currentVal;
  });
}

// Tải sơ đồ đã lưu từ Firestore và render HTML
trackUnsubscribe(onSnapshot(doc(db, "tournament", "bracket32"), (docSnap) => {
  const adminBracketWrapper = document.getElementById("adminBracketWrapper");
  if (!adminBracketWrapper) return;

  const data = docSnap.exists() ? docSnap.data() : {};
  const slots = data.slots || {};

  const s = (id) => {
    const playerName = slots[id];
    return playerName ? escapeHtml(playerName) : "— Trống —";
  };

  const options = '<option value="">— Trống —</option>' +
    approvedPlayers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.className)})</option>`).join("");

  adminBracketWrapper.innerHTML = `
    <div class="bracket-32">
      
      <!-- NHÁNH TRÁI -->
      <div class="bracket-side left-side">
        <div class="round">
          <h3>Vòng 1/32</h3>
          <div class="matchup"><select id="slot_1" class="bracket-select">${options}</select><select id="slot_2" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_3" class="bracket-select">${options}</select><select id="slot_4" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_5" class="bracket-select">${options}</select><select id="slot_6" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_7" class="bracket-select">${options}</select><select id="slot_8" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_9" class="bracket-select">${options}</select><select id="slot_10" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_11" class="bracket-select">${options}</select><select id="slot_12" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_13" class="bracket-select">${options}</select><select id="slot_14" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_15" class="bracket-select">${options}</select><select id="slot_16" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Vòng 1/16</h3>
          <div class="matchup"><select id="slot_17" class="bracket-select">${options}</select><select id="slot_18" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_19" class="bracket-select">${options}</select><select id="slot_20" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_21" class="bracket-select">${options}</select><select id="slot_22" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_23" class="bracket-select">${options}</select><select id="slot_24" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Tứ kết</h3>
          <div class="matchup"><select id="slot_25" class="bracket-select">${options}</select><select id="slot_26" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_27" class="bracket-select">${options}</select><select id="slot_28" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Bán kết</h3>
          <div class="matchup"><select id="slot_29" class="bracket-select">${options}</select><select id="slot_30" class="bracket-select">${options}</select></div>
        </div>
      </div>

      <!-- TRẬN CHUNG KẾT -->
      <div class="bracket-center">
        <div class="round">
          <h3>Chung kết</h3>
          <div class="matchup champion-box">
            <div class="trophy">🏆 VÔ ĐỊCH</div>
            <select id="slot_53" class="bracket-select champion-select">${options}</select>
          </div>
        </div>
      </div>

      <!-- NHÁNH PHẢI -->
      <div class="bracket-side right-side">
        <div class="round">
          <h3>Bán kết</h3>
          <div class="matchup"><select id="slot_31" class="bracket-select">${options}</select><select id="slot_32" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Tứ kết</h3>
          <div class="matchup"><select id="slot_27" class="bracket-select">${options}</select><select id="slot_28" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_29" class="bracket-select">${options}</select><select id="slot_30" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Vòng 1/16</h3>
          <div class="matchup"><select id="slot_19" class="bracket-select">${options}</select><select id="slot_20" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_21" class="bracket-select">${options}</select><select id="slot_22" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_23" class="bracket-select">${options}</select><select id="slot_24" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_25" class="bracket-select">${options}</select><select id="slot_26" class="bracket-select">${options}</select></div>
        </div>
        <div class="round">
          <h3>Vòng 1/32</h3>
          <div class="matchup"><select id="slot_33" class="bracket-select">${options}</select><select id="slot_34" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_35" class="bracket-select">${options}</select><select id="slot_36" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_37" class="bracket-select">${options}</select><select id="slot_38" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_39" class="bracket-select">${options}</select><select id="slot_40" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_41" class="bracket-select">${options}</select><select id="slot_42" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_43" class="bracket-select">${options}</select><select id="slot_44" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_45" class="bracket-select">${options}</select><select id="slot_46" class="bracket-select">${options}</select></div>
          <div class="matchup"><select id="slot_47" class="bracket-select">${options}</select><select id="slot_48" class="bracket-select">${options}</select></div>
        </div>
      </div>

    </div>
    <button id="saveBracketBtn" class="primary" style="margin-top: 24px;">Lưu Sơ Đồ Cây</button>
  `;

  // Set values after HTML is rendered
  Object.keys(slots).forEach((slotId) => {
    const sel = document.getElementById(`slot_${slotId}`);
    if (sel) sel.value = slots[slotId];
  });

  // Re-attach event listener to save button
  document.getElementById("saveBracketBtn")?.addEventListener("click", async () => {
    const slots = {};
    for (let i = 1; i <= 53; i++) {
      const sel = document.getElementById(`slot_${i}`);
      if (sel) slots[i] = sel.value;
    }

    console.log("Saving bracket data:", slots);
    console.log("Approved players count:", approvedPlayers.length);

    try {
      await setDoc(doc(db, "tournament", "bracket32"), { slots });
      alert("Đã lưu sơ đồ thi đấu thành công!");
      console.log("Bracket saved successfully");
    } catch (err) {
      console.error("Error saving bracket:", err);
      alert("Lỗi khi lưu sơ đồ: " + err.message);
    }
  });
}));

// ==========================================
// 4. QUẢN LÝ BÌNH CHỌN (VOTE)
// ==========================================
function populateVoteSelects() {
  if (!votePlayerA || !votePlayerB) return;
  const valA = votePlayerA.value;
  const valB = votePlayerB.value;

  const optionsHtml = '<option value="">-- Chọn người chơi --</option>' +
    approvedPlayers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.className)})</option>`).join("");

  votePlayerA.innerHTML = optionsHtml;
  votePlayerB.innerHTML = optionsHtml;

  votePlayerA.value = valA;
  votePlayerB.value = valB;
}

// Tải cấu hình Vote hiện tại
onSnapshot(doc(db, "settings", "voteConfig"), (docSnap) => {
  if (!docSnap.exists()) return;
  const data = docSnap.data();

  if (voteActiveToggle) voteActiveToggle.checked = !!data.active;
  if (votePlayerA) votePlayerA.value = data.playerA || "";
  if (votePlayerB) votePlayerB.value = data.playerB || "";

  if (voteAdminStatus) {
    const vA = data.votesA || 0;
    const vB = data.votesB || 0;
    const total = vA + vB;
    voteAdminStatus.innerHTML = `Trạng thái: <strong>${data.active ? "ĐANG BẬT" : "ĐANG TẮT"}</strong> | Tổng vote: <strong>${total}</strong> (A: ${vA} - B: ${vB})`;
  }
});

// Lưu cấu hình Vote
document.getElementById("saveVoteBtn")?.addEventListener("click", async () => {
  try {
    await setDoc(
      doc(db, "settings", "voteConfig"),
      {
        active: voteActiveToggle.checked,
        playerA: votePlayerA.value,
        playerB: votePlayerB.value
      },
      { merge: true }
    );
    alert("Đã lưu cấu hình Bình chọn thành công!");
  } catch (err) {
    console.error(err);
    alert("Lỗi khi lưu bình chọn: " + err.message);
  }
});

// Reset tỉ số Vote
document.getElementById("resetVoteBtn")?.addEventListener("click", async () => {
  if (confirm("Bạn có chắc muốn đặt lại tất cả lượt bình chọn về 0?")) {
    try {
      await setDoc(
        doc(db, "settings", "voteConfig"),
        {
          votesA: 0,
          votesB: 0,
          resetKey: Date.now().toString()
        },
        { merge: true }
      );

      alert("Đã reset tỉ số Vote về 0!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi reset vote: " + err.message);
    }
  }
});

// ==========================================
// 5. QUẢN LÝ TÀI KHOẢN CHAT (REALTIME DATABASE)
// ==========================================
const usersProfileRef = ref(rtdb, "users_profile");
let usersProfileUnsubscribe = onValue(usersProfileRef, (snapshot) => {
  if (!chatUsersTableBody) return;
  chatUsersTableBody.innerHTML = "";

  if (!snapshot.exists()) {
    chatUsersTableBody.innerHTML = '<tr><td colspan="4" class="muted" style="text-align: center; padding: 12px;">Chưa có tài khoản chat nào.</td></tr>';
    return;
  }

  snapshot.forEach((childSnap) => {
    const username = childSnap.key;
    const data = childSnap.val();
    const bio = data.bio || "Không có";
    const avatar = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`;
    const badges = normalizeBadges(data.badges);

    let badgeIndicator = '';
    if (badges.length > 0) {
      badgeIndicator = badges.map(badge => {
        const badgeStyle = badge.type === 'gradient' 
          ? `background: linear-gradient(135deg, ${badge.color1}, ${badge.color2});`
          : `background: ${badge.color1};`;
        return `<span class="custom-badge-indicator" style="${badgeStyle} margin-right: 4px;">[${escapeHtml(badge.name)}]</span>`;
      }).join('');
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><img src="${escapeHtml(avatar)}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" /></td>
      <td><strong>@${escapeHtml(username)}</strong><br><small class="muted">${escapeHtml(data.displayName || "")}</small></td>
      <td>${escapeHtml(bio)}</td>
      <td>
        ${badgeIndicator}
        <button class="btn-delete-chat-user" data-username="${escapeHtml(username)}" style="background: #ce2c2c; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Xóa tài khoản</button>
      </td>
    `;
    chatUsersTableBody.appendChild(row);
  });

  // Update badge user select dropdown (preserve current selection)
  const currentSelection = badgeUserSelect?.value || "";
  populateBadgeUserSelect(snapshot);
  if (badgeUserSelect && currentSelection) {
    badgeUserSelect.value = currentSelection;
  }
  
  // Update troll user dropdown
  populateTrollUserDropdown();
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-delete-chat-user")) {
    const targetUsername = e.target.dataset.username;
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản chat @${targetUsername} này không?`)) {
      try {
        await rtdbRemove(ref(rtdb, `users_profile/${targetUsername}`));
        alert(`Đã xóa thành công tài khoản chat: @${targetUsername}`);
      } catch (err) {
        console.error("Lỗi khi xóa tài khoản chat:", err);
        alert("Không thể xóa tài khoản này!");
      }
    }
  }
});

// ==========================================
// 6. QUẢN LÝ DANH HIỆU TÙY CHỈNH
// ==========================================
function populateBadgeUserSelect(snapshot) {
  if (!badgeUserSelect) return;
  const currentVal = badgeUserSelect.value;
  
  let optionsHtml = '<option value="">-- Chọn người dùng --</option>';
  snapshot.forEach((childSnap) => {
    const username = childSnap.key;
    const data = childSnap.val();
    const displayName = data.displayName || username;
    optionsHtml += `<option value="${escapeHtml(username)}">@${escapeHtml(username)} (${escapeHtml(displayName)})</option>`;
  });
  
  badgeUserSelect.innerHTML = optionsHtml;
  badgeUserSelect.value = currentVal;
}

// Load current badge status when user is selected
let currentBadgeUnsubscribe = null; // Store the unsubscribe function

badgeUserSelect?.addEventListener("change", () => {
  const selectedUsername = badgeUserSelect.value;
  
  // Remove previous listener if exists
  if (currentBadgeUnsubscribe) {
    currentBadgeUnsubscribe();
    currentBadgeUnsubscribe = null;
  }
  
  if (!selectedUsername) {
    if (customBadgeName) customBadgeName.value = "";
    if (badgeSolidColor) badgeSolidColor.value = "#6366f1";
    if (badgeGradientColor1) badgeGradientColor1.value = "#6366f1";
    if (badgeGradientColor2) badgeGradientColor2.value = "#a855f7";
    if (removeBadgeToggle) removeBadgeToggle.checked = false;
    if (currentBadgesDisplay) {
      currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Danh hiệu hiện tại sẽ hiển thị ở đây</p>';
    }
    if (badgeStatus) badgeStatus.textContent = "";
    return;
  }
  
  // Set up real-time listener for badge updates
  const userRef = ref(rtdb, `users_profile/${selectedUsername}`);
  
  currentBadgeUnsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const badges = normalizeBadges(data.badges);
      
      // Display current badges
      if (currentBadgesDisplay) {
        if (badges.length > 0) {
          const badgesHtml = badges.map((badge, index) => {
            const badgeStyle = badge.type === 'gradient' 
              ? `background: linear-gradient(135deg, ${badge.color1}, ${badge.color2});`
              : `background: ${badge.color1};`;
            return `
            <div style="display: inline-flex; align-items: center; margin: 4px; padding: 6px 12px; background: #2a2a35; border-radius: 6px;">
              <span class="custom-badge" style="${badgeStyle}">[${escapeHtml(badge.name)}]</span>
              <button class="btn-delete-single-badge" data-index="${index}" data-username="${escapeHtml(selectedUsername)}" style="margin-left: 8px; background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 1rem;">×</button>
            </div>
            `}).join('');
          currentBadgesDisplay.innerHTML = badgesHtml;
        } else {
          currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Người dùng chưa có danh hiệu nào</p>';
        }
      }
      
      if (badgeStatus) {
        badgeStatus.textContent = badges.length > 0 
          ? `Người dùng có ${badges.length} danh hiệu` 
          : "Người dùng chưa có danh hiệu";
      }
    } else {
      if (currentBadgesDisplay) {
        currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Người dùng không tồn tại</p>';
      }
      if (badgeStatus) badgeStatus.textContent = "Người dùng không tồn tại";
    }
  });
});

// Add new badge
addBadgeBtn?.addEventListener("click", async () => {
  const selectedUsername = badgeUserSelect.value;
  if (!selectedUsername) {
    if (badgeStatus) badgeStatus.textContent = "Vui lòng chọn người dùng!";
    return;
  }
  
  try {
    const userRef = ref(rtdb, `users_profile/${selectedUsername}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      if (badgeStatus) badgeStatus.textContent = "Người dùng không tồn tại!";
      return;
    }
    
    const data = snapshot.val();
    const badges = normalizeBadges(data.badges);
    
    // Get custom badge info
    const badgeName = customBadgeName?.value.trim().toUpperCase() || "";
    
    if (!badgeName) {
      if (badgeStatus) badgeStatus.textContent = "Vui lòng nhập tên danh hiệu!";
      return;
    }
    
    // Get color type and values
    const colorType = document.querySelector('input[name="badgeColorType"]:checked')?.value || 'solid';
    let badgeColorData = {};
    
    if (colorType === 'gradient') {
      badgeColorData = {
        type: 'gradient',
        color1: badgeGradientColor1?.value || '#6366f1',
        color2: badgeGradientColor2?.value || '#a855f7'
      };
    } else {
      badgeColorData = {
        type: 'solid',
        color1: badgeSolidColor?.value || '#6366f1',
        color2: badgeSolidColor?.value || '#6366f1'
      };
    }
    
    // Check if badge already exists
    if (Array.isArray(badges) && badges.some(b => b.name === badgeName)) {
      if (badgeStatus) badgeStatus.textContent = `Danh hiệu [${badgeName}] đã tồn tại!`;
      return;
    }
    
    // Add new badge to array
    badges.push({ 
      name: badgeName, 
      ...badgeColorData
    });
    
    // Update badge status
    await set(userRef, {
      ...data,
      badges: badges
    });
    
    if (badgeStatus) {
      badgeStatus.textContent = `Đã thêm danh hiệu [${badgeName}] cho @${selectedUsername}!`;
    }
    
    // Reset form
    if (customBadgeName) customBadgeName.value = "";
    
    // Force update display immediately
    const updatedSnapshot = await get(userRef);
    if (updatedSnapshot.exists()) {
      const updatedData = updatedSnapshot.val();
      const updatedBadges = normalizeBadges(updatedData.badges);
      
      if (currentBadgesDisplay) {
        if (updatedBadges.length > 0) {
          const badgesHtml = updatedBadges.map((badge, index) => {
            const badgeStyle = badge.type === 'gradient' 
              ? `background: linear-gradient(135deg, ${badge.color1}, ${badge.color2});`
              : `background: ${badge.color1};`;
            return `
            <div style="display: inline-flex; align-items: center; margin: 4px; padding: 6px 12px; background: #2a2a35; border-radius: 6px;">
              <span class="custom-badge" style="${badgeStyle}">[${escapeHtml(badge.name)}]</span>
              <button class="btn-delete-single-badge" data-index="${index}" data-username="${escapeHtml(selectedUsername)}" style="margin-left: 8px; background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 1rem;">×</button>
            </div>
            `}).join('');
          currentBadgesDisplay.innerHTML = badgesHtml;
        } else {
          currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Người dùng chưa có danh hiệu nào</p>';
        }
      }
      
      if (badgeStatus) {
        badgeStatus.textContent = `Người dùng có ${updatedBadges.length} danh hiệu`;
      }
    }
    
  } catch (err) {
    console.error("Error adding badge:", err);
    if (badgeStatus) badgeStatus.textContent = "Lỗi khi thêm danh hiệu: " + err.message;
  }
});

// Remove all badges
removeAllBadgesBtn?.addEventListener("click", async () => {
  const selectedUsername = badgeUserSelect.value;
  if (!selectedUsername) {
    if (badgeStatus) badgeStatus.textContent = "Vui lòng chọn người dùng!";
    return;
  }
  
  if (!confirm(`Bạn có chắc muốn xóa TẤT CẢ danh hiệu của @${selectedUsername}?`)) {
    return;
  }
  
  try {
    const userRef = ref(rtdb, `users_profile/${selectedUsername}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      if (badgeStatus) badgeStatus.textContent = "Người dùng không tồn tại!";
      return;
    }
    
    const data = snapshot.val();
    
    await set(userRef, {
      ...data,
      badges: []
    });
    
    if (badgeStatus) badgeStatus.textContent = `Đã xóa tất cả danh hiệu của @${selectedUsername}!`;
    
    // Force update display immediately
    if (currentBadgesDisplay) {
      currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Người dùng chưa có danh hiệu nào</p>';
    }
    if (badgeStatus) {
      badgeStatus.textContent = "Người dùng chưa có danh hiệu";
    }
    
  } catch (err) {
    console.error("Error removing badges:", err);
    if (badgeStatus) badgeStatus.textContent = "Lỗi khi xóa danh hiệu: " + err.message;
  }
});

// Delete single badge
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-delete-single-badge")) {
    const index = parseInt(e.target.dataset.index);
    const username = e.target.dataset.username;
    
    if (confirm("Bạn có chắc muốn xóa danh hiệu này?")) {
      try {
        const userRef = ref(rtdb, `users_profile/${username}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const badges = normalizeBadges(data.badges);
          
          // Remove badge at index
          badges.splice(index, 1);
          
          await set(userRef, {
            ...data,
            badges: badges
          });
          
          if (badgeStatus) badgeStatus.textContent = "Đã xóa danh hiệu!";
          
          // Force update display immediately
          const updatedSnapshot = await get(userRef);
          if (updatedSnapshot.exists()) {
            const updatedData = updatedSnapshot.val();
            const updatedBadges = normalizeBadges(updatedData.badges);
            
            if (currentBadgesDisplay) {
              if (updatedBadges.length > 0) {
                const badgesHtml = updatedBadges.map((badge, index) => {
                  const badgeStyle = badge.type === 'gradient' 
                    ? `background: linear-gradient(135deg, ${badge.color1}, ${badge.color2});`
                    : `background: ${badge.color1};`;
                  return `
                  <div style="display: inline-flex; align-items: center; margin: 4px; padding: 6px 12px; background: #2a2a35; border-radius: 6px;">
                    <span class="custom-badge" style="${badgeStyle}">[${escapeHtml(badge.name)}]</span>
                    <button class="btn-delete-single-badge" data-index="${index}" data-username="${escapeHtml(username)}" style="margin-left: 8px; background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 1rem;">×</button>
                  </div>
                  `}).join('');
                currentBadgesDisplay.innerHTML = badgesHtml;
              } else {
                currentBadgesDisplay.innerHTML = '<p class="muted" style="margin: 0;">Người dùng chưa có danh hiệu nào</p>';
              }
            }
            
            if (badgeStatus) {
              badgeStatus.textContent = `Người dùng có ${updatedBadges.length} danh hiệu`;
            }
          }
        }
      } catch (err) {
        console.error("Error deleting badge:", err);
        if (badgeStatus) badgeStatus.textContent = "Lỗi khi xóa danh hiệu: " + err.message;
      }
    }
  }
});

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==========================================
// 7. ADMIN CHAT SYSTEM
// ==========================================
const ADMIN_USERNAME = "admin_aura";
const ADMIN_DISPLAY_NAME = "Chủ Aura";
const ADMIN_BIO = "Admin của Aura Battle - Trường TH & THCS Bắc Kạn";
let ADMIN_AVATAR = "https://ui-avatars.com/api/?name=Chủ+Aura&background=e53935&color=fff";
let adminAvatarBase64 = "";
let adminRawImageObj = null;

let isAdminChatInitialized = false;
let adminUserBadgesCache = {}; // Cache user badges for admin chat
let adminChatUnsubscribe = null;

// Function to load user badge info for admin
async function loadAdminUserBadge(username) {
  if (adminUserBadgesCache[username] !== undefined) {
    return adminUserBadgesCache[username];
  }
  
  try {
    const userSnap = await get(ref(rtdb, `users_profile/${username}`));
    if (userSnap.exists()) {
      const userData = userSnap.val();
      const badges = normalizeBadges(userData.badges);
      adminUserBadgesCache[username] = badges;
      return adminUserBadgesCache[username];
    }
  } catch (err) {
    console.error("Error loading user badge:", err);
  }
  
  adminUserBadgesCache[username] = [];
  return adminUserBadgesCache[username];
}

// Listen for badge changes to update admin chat in real-time
let profileUnsubscribe = onValue(ref(rtdb, "users_profile"), (snapshot) => {
  // Clear cache for all users when any badge changes
  adminUserBadgesCache = {};
});

// Clean up listeners when page unloads
window.addEventListener('beforeunload', () => {
  if (currentBadgeUnsubscribe) currentBadgeUnsubscribe();
  if (profileUnsubscribe) profileUnsubscribe();
  if (usersProfileUnsubscribe) usersProfileUnsubscribe();
  if (adminChatUnsubscribe) adminChatUnsubscribe();
});

function initAdminChatListener() {
  if (isAdminChatInitialized) return;
  isAdminChatInitialized = true;

  const adminChatMessages = document.getElementById("adminChatMessages");
  if (!adminChatMessages) return;

  adminChatUnsubscribe = onValue(rtdbQuery(ref(rtdb, "chat_messages"), limitToLast(60)), async (snapshot) => {
    adminChatMessages.innerHTML = "";
    if (!snapshot.exists()) {
      adminChatMessages.innerHTML = '<div class="empty">Chưa có tin nhắn nào.</div>';
      return;
    }

    // Load all unique users' badge info first
    const uniqueUsers = new Set();
    snapshot.forEach((childSnap) => {
      uniqueUsers.add(childSnap.val().username);
    });

    // Load badge info for all users
    const badgePromises = Array.from(uniqueUsers).map(username => loadAdminUserBadge(username));
    await Promise.all(badgePromises);

    // Now render messages with badge info
    snapshot.forEach((childSnap) => {
      appendAdminChatBubble(adminChatMessages, childSnap.val(), childSnap.key);
    });

    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  });
}

function appendAdminChatBubble(container, msg, msgKey = null) {
  const item = document.createElement("div");
  const isAdmin = msg.username === ADMIN_USERNAME || msg.isAdmin;
  item.className = `chat-bubble-row ${isAdmin ? "msg-right" : "msg-left"}`;
  
  const currentDisplayName = msg.displayName || msg.username;
  
  // Check if user has custom badges using cache
  let customBadges = '';
  const userBadges = adminUserBadgesCache[msg.username];
  if (userBadges && userBadges.length > 0) {
    customBadges = userBadges.map(badge => {
      const badgeStyle = badge.type === 'gradient' 
        ? `background: linear-gradient(135deg, ${badge.color1}, ${badge.color2});`
        : `background: ${badge.color1};`;
      return `<span class="custom-badge" style="${badgeStyle}">[${escapeHtml(badge.name)}]</span>`;
    }).join(' ');
  }

  item.innerHTML = `
    <div class="chat-user-header" style="display:flex; align-items:center; gap:6px;">
      <img src="${escapeHtml(msg.avatar)}" class="chat-avatar-thumb" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />
      <span class="chat-sender-name">${escapeHtml(currentDisplayName)} ${customBadges} ${msg.isAdmin ? '<span class="admin-badge">[ ADMIN ]</span>' : ''}</span>
      <button class="delete-msg-btn" data-key="${msgKey || ''}" style="margin-left:auto; background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:0.8rem;">🗑️</button>
    </div>
    <div class="chat-bubble">${escapeHtml(msg.text)}</div>
  `;

  // Add delete functionality for admin (can delete any message)
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

// Admin chat form submission
document.getElementById("adminChatForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const adminChatInput = document.getElementById("adminChatInput");
  const text = adminChatInput.value.trim();
  if (!text) return;

  adminChatInput.value = "";

  try {
    await push(ref(rtdb, "chat_messages"), {
      username: ADMIN_USERNAME,
      displayName: ADMIN_DISPLAY_NAME,
      avatar: ADMIN_AVATAR,
      text: text,
      isAdmin: true,
      badges: { aura: false }, // Admin doesn't have aura badge by default
      timestamp: rtdbTimestamp()
    });
  } catch (err) {
    console.error("Lỗi gửi tin nhắn admin:", err);
  }
});

// Initialize admin chat when page loads
initAdminChatListener();

// ==========================================
// 8. ADMIN PROFILE SETTINGS
// ==========================================
// Load admin profile from Firebase
async function loadAdminProfile() {
  try {
    const adminRef = ref(rtdb, `users_profile/${ADMIN_USERNAME}`);
    const snapshot = await get(adminRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.avatar) {
        ADMIN_AVATAR = data.avatar;
        const currentAvatar = document.getElementById("adminCurrentAvatar");
        if (currentAvatar) {
          currentAvatar.src = ADMIN_AVATAR;
        }
      }
    } else {
      // Create admin profile if it doesn't exist
      await set(adminRef, {
        username: ADMIN_USERNAME,
        displayName: ADMIN_DISPLAY_NAME,
        avatar: ADMIN_AVATAR,
        bio: ADMIN_BIO,
        isAdmin: true,
        createdAt: rtdbTimestamp()
      });
    }
  } catch (err) {
    console.error("Error loading admin profile:", err);
  }
}

// Admin avatar file input handler
document.getElementById("adminAvatarInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadAdminAvatarFromFile(file);
});

// Click on admin drop zone to trigger file input
document.getElementById("adminDropZone")?.addEventListener("click", () => {
  document.getElementById("adminAvatarInput")?.click();
});

// Admin drag and drop functionality
const adminDropZone = document.getElementById("adminDropZone");
if (adminDropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    adminDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    adminDropZone.addEventListener(eventName, () => {
      adminDropZone.style.borderColor = "#2563eb";
      adminDropZone.style.background = "#1e293b";
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    adminDropZone.addEventListener(eventName, () => {
      adminDropZone.style.borderColor = "#444";
      adminDropZone.style.background = "#16161e";
    }, false);
  });

  adminDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) {
      loadAdminAvatarFromFile(files[0]);
    }
  }, false);
}

function loadAdminAvatarFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    adminRawImageObj = new Image();
    adminRawImageObj.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 150; 
      canvas.width = size; canvas.height = size;

      const scale = Math.max(size / adminRawImageObj.width, size / adminRawImageObj.height);
      const width = adminRawImageObj.width * scale;
      const height = adminRawImageObj.height * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(adminRawImageObj, x, y, width, height);

      adminAvatarBase64 = canvas.toDataURL("image/jpeg", 0.8);
      
      const avatarPreview = document.getElementById("adminAvatarPreview");
      if (avatarPreview) {
        avatarPreview.src = adminAvatarBase64;
        avatarPreview.style.display = "block";
      }
    };
    adminRawImageObj.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Admin profile form submission
document.getElementById("adminProfileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("adminProfileStatus");
  
  if (!adminAvatarBase64) {
    if (statusEl) statusEl.textContent = "Vui lòng chọn ảnh mới để cập nhật!";
    return;
  }

  try {
    const adminRef = ref(rtdb, `users_profile/${ADMIN_USERNAME}`);
    const snapshot = await get(adminRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      await set(adminRef, {
        ...data,
        avatar: adminAvatarBase64
      });
    } else {
      await set(adminRef, {
        username: ADMIN_USERNAME,
        displayName: ADMIN_DISPLAY_NAME,
        avatar: adminAvatarBase64,
        bio: ADMIN_BIO,
        isAdmin: true,
        createdAt: rtdbTimestamp()
      });
    }

    ADMIN_AVATAR = adminAvatarBase64;
    
    // Update current avatar display
    const currentAvatar = document.getElementById("adminCurrentAvatar");
    if (currentAvatar) {
      currentAvatar.src = ADMIN_AVATAR;
    }
    
    // Reset form
    adminAvatarBase64 = "";
    adminRawImageObj = null;
    const avatarPreview = document.getElementById("adminAvatarPreview");
    if (avatarPreview) {
      avatarPreview.style.display = "none";
      avatarPreview.src = "";
    }
    document.getElementById("adminAvatarInput").value = "";
    
    if (statusEl) statusEl.textContent = "Cập nhật avatar thành công!";
    
    // Re-initialize chat to use new avatar
    isAdminChatInitialized = false;
    initAdminChatListener();
    
  } catch (err) {
    console.error("Error updating admin profile:", err);
    if (statusEl) statusEl.textContent = "Lỗi khi cập nhật: " + err.message;
  }
});

// Load admin profile on page load
loadAdminProfile();

// ==========================================
// 9. CHAT SOUND NOTIFICATION SYSTEM
// ==========================================
let chatSoundEnabled = false;
let chatSoundBase64 = "";
let chatSoundVolume = 0.5;
let chatSoundAudio = null;
let lastMessageCount = 0;

// Load sound settings from Firebase
async function loadChatSoundSettings() {
  try {
    const settingsRef = ref(rtdb, "chat_sound_settings");
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      chatSoundEnabled = data.enabled || false;
      chatSoundBase64 = data.soundData || "";
      chatSoundVolume = data.volume || 0.5;
      
      // Update UI
      const enabledToggle = document.getElementById("chatSoundEnabled");
      const volumeSlider = document.getElementById("chatSoundVolume");
      const volumeValue = document.getElementById("volumeValue");
      const soundPreview = document.getElementById("currentSoundPreview");
      const soundName = document.getElementById("currentSoundName");
      
      if (enabledToggle) enabledToggle.checked = chatSoundEnabled;
      if (volumeSlider) volumeSlider.value = chatSoundVolume * 100;
      if (volumeValue) volumeValue.textContent = Math.round(chatSoundVolume * 100) + "%";
      
      if (chatSoundBase64) {
        if (soundPreview) soundPreview.style.display = "block";
        if (soundName) soundName.textContent = "File đã tải lên";
      }
    }
  } catch (err) {
    console.error("Error loading sound settings:", err);
  }
}

// Handle sound file upload
document.getElementById("chatSoundFile")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    chatSoundBase64 = event.target.result;
    
    const soundPreview = document.getElementById("currentSoundPreview");
    const soundName = document.getElementById("currentSoundName");
    
    if (soundPreview) soundPreview.style.display = "block";
    if (soundName) soundName.textContent = file.name;
  };
  reader.readAsDataURL(file);
});

// Volume slider change
document.getElementById("chatSoundVolume")?.addEventListener("input", (e) => {
  chatSoundVolume = e.target.value / 100;
  const volumeValue = document.getElementById("volumeValue");
  if (volumeValue) volumeValue.textContent = e.target.value + "%";
});

// Test sound button
document.getElementById("testSoundBtn")?.addEventListener("click", () => {
  if (!chatSoundBase64) {
    alert("Vui lòng chọn file âm thanh trước!");
    return;
  }
  playChatSound();
});

// Save sound settings
document.getElementById("saveSoundSettingsBtn")?.addEventListener("click", async () => {
  try {
    const settingsRef = ref(rtdb, "chat_sound_settings");
    await set(settingsRef, {
      enabled: chatSoundEnabled,
      soundData: chatSoundBase64,
      volume: chatSoundVolume
    });
    
    const statusEl = document.getElementById("soundSettingsStatus");
    if (statusEl) statusEl.textContent = "Đã lưu cài đặt âm thanh!";
    
    // Initialize audio with new settings
    if (chatSoundBase64) {
      initializeChatSound();
    }
  } catch (err) {
    console.error("Error saving sound settings:", err);
    const statusEl = document.getElementById("soundSettingsStatus");
    if (statusEl) statusEl.textContent = "Lỗi khi lưu: " + err.message;
  }
});

// Toggle sound enabled
document.getElementById("chatSoundEnabled")?.addEventListener("change", (e) => {
  chatSoundEnabled = e.target.checked;
});

// Initialize chat sound
function initializeChatSound() {
  if (!chatSoundBase64) return;
  
  if (chatSoundAudio) {
    chatSoundAudio.pause();
    chatSoundAudio = null;
  }
  
  chatSoundAudio = new Audio(chatSoundBase64);
  chatSoundAudio.volume = chatSoundVolume;
}

// Play chat sound (for notification)
function playChatSound() {
  if (!chatSoundEnabled || !chatSoundBase64) return;
  
  try {
    if (!chatSoundAudio) {
      initializeChatSound();
    }
    
    if (chatSoundAudio) {
      chatSoundAudio.currentTime = 0;
      chatSoundAudio.volume = chatSoundVolume;
      chatSoundAudio.play().catch(err => {
        console.error("Error playing sound:", err);
      });
    }
  } catch (err) {
    console.error("Error playing chat sound:", err);
  }
}

// ==========================================
// 9.5 TROLL SOUND SYSTEM
// ==========================================
// Play troll sound locally (for admin testing)
document.getElementById("playTrollSoundBtn")?.addEventListener("click", () => {
  if (!chatSoundBase64) {
    alert("Vui lòng chọn file âm thanh trước!");
    return;
  }
  
  try {
    if (!chatSoundAudio) {
      initializeChatSound();
    }
    
    if (chatSoundAudio) {
      chatSoundAudio.currentTime = 0;
      chatSoundAudio.volume = chatSoundVolume;
      chatSoundAudio.play().catch(err => {
        console.error("Error playing troll sound:", err);
      });
    }
  } catch (err) {
    console.error("Error playing troll sound:", err);
  }
});

// Populate troll target user dropdown
function populateTrollUserDropdown() {
  const trollTargetUser = document.getElementById("trollTargetUser");
  if (!trollTargetUser) return;
  
  const currentVal = trollTargetUser.value;
  
  let optionsHtml = '<option value="all">🌐 Tất cả mọi người</option>';
  
  // Get users from Firebase
  get(ref(rtdb, "users_profile")).then((snapshot) => {
    if (snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        const username = childSnap.key;
        optionsHtml += `<option value="${escapeHtml(username)}">@${escapeHtml(username)}</option>`;
      });
      
      trollTargetUser.innerHTML = optionsHtml;
      trollTargetUser.value = currentVal;
    }
  }).catch(err => {
    console.error("Error loading users for troll dropdown:", err);
  });
}

// Send troll sound to all users or specific user
document.getElementById("sendTrollSoundBtn")?.addEventListener("click", async () => {
  if (!chatSoundBase64) {
    alert("Vui lòng chọn file âm thanh trước!");
    return;
  }
  
  const trollTargetUser = document.getElementById("trollTargetUser");
  const targetUser = trollTargetUser ? trollTargetUser.value : "all";
  
  const targetText = targetUser === "all" ? "tất cả users" : `user @${targetUser}`;
  
  if (!confirm(`Bạn có chắc muốn phát âm thanh này cho ${targetText}?`)) {
    return;
  }
  
  try {
    if (targetUser === "all") {
      // Trigger troll sound on all users by setting a flag in Firebase
      await set(ref(rtdb, "troll_sound_trigger"), {
        triggered: true,
        timestamp: Date.now(),
        soundData: chatSoundBase64,
        volume: chatSoundVolume
      });
      
      alert("Đã gửi âm thanh troll cho tất cả! 🎵");
      
      // Clear the trigger after 2 seconds
      setTimeout(async () => {
        await set(ref(rtdb, "troll_sound_trigger"), {
          triggered: false,
          timestamp: Date.now()
        });
      }, 2000);
    } else {
      // Send troll sound to specific user
      await set(ref(rtdb, `troll_sound_target/${targetUser}`), {
        triggered: true,
        timestamp: Date.now(),
        soundData: chatSoundBase64,
        volume: chatSoundVolume
      });
      
      alert(`Đã gửi âm thanh troll cho @${targetUser}! 🎵`);
      
      // Clear the trigger after 2 seconds
      setTimeout(async () => {
        await set(ref(rtdb, `troll_sound_target/${targetUser}`), {
          triggered: false,
          timestamp: Date.now()
        });
      }, 2000);
    }
  } catch (err) {
    console.error("Error sending troll sound:", err);
    alert("Lỗi khi gửi âm thanh: " + err.message);
  }
});

// Modify admin chat listener to play sound on new messages
const originalInitAdminChatListener = initAdminChatListener;
initAdminChatListener = function() {
  if (isAdminChatInitialized) return;
  isAdminChatInitialized = true;

  const adminChatMessages = document.getElementById("adminChatMessages");
  if (!adminChatMessages) return;

  adminChatUnsubscribe = onValue(rtdbQuery(ref(rtdb, "chat_messages"), limitToLast(60)), async (snapshot) => {
    const currentMessageCount = snapshot.exists() ? snapshot.size : 0;
    
    // Play sound if new messages arrived (for admin)
    if (currentMessageCount > lastMessageCount && lastMessageCount > 0) {
      playChatSound();
    }
    
    lastMessageCount = currentMessageCount;
    
    adminChatMessages.innerHTML = "";
    if (!snapshot.exists()) {
      adminChatMessages.innerHTML = '<div class="empty">Chưa có tin nhắn nào.</div>';
      return;
    }

    // Load all unique users' badge info first
    const uniqueUsers = new Set();
    snapshot.forEach((childSnap) => {
      uniqueUsers.add(childSnap.val().username);
    });

    // Load badge info for all users
    const badgePromises = Array.from(uniqueUsers).map(username => loadAdminUserBadge(username));
    await Promise.all(badgePromises);

    // Now render messages with badge info
    snapshot.forEach((childSnap) => {
      appendAdminChatBubble(adminChatMessages, childSnap.val(), childSnap.key);
    });

    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  });
};

// Listen for admin sound settings changes to update local audio
let adminSoundSettingsUnsubscribe = onValue(ref(rtdb, "chat_sound_settings"), (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    chatSoundEnabled = data.enabled || false;
    chatSoundBase64 = data.soundData || "";
    chatSoundVolume = data.volume || 0.5;
    
    // Reinitialize audio with new settings
    if (chatSoundBase64) {
      initializeChatSound();
    }
  }
});

// Load sound settings on page load
loadChatSoundSettings();

// Populate troll user dropdown initially
populateTrollUserDropdown();

// ==========================================
// 10. PUSH NOTIFICATIONS
// ==========================================
let adminFcmToken = null;

// Request notification permission for admin
async function setupAdminPushNotifications() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Admin notification permission granted');
      
      try {
        adminFcmToken = await getToken(messaging, {
          vapidKey: "YOUR_VAPID_KEY_HERE" // Cần lấy từ Firebase Console
        });
        
        if (adminFcmToken) {
          console.log('Admin FCM Token:', adminFcmToken);
          
          // Store admin token
          await set(ref(rtdb, "push_tokens/admin_aura"), {
            token: adminFcmToken,
            deviceInfo: "Admin Panel",
            lastActive: Date.now()
          });
        }
      } catch (tokenError) {
        console.error('Error getting admin FCM token:', tokenError);
      }
    }
  } catch (err) {
    console.error('Error requesting admin notification permission:', err);
  }
}

// Listen for incoming push notifications (admin)
onMessage(messaging, (payload) => {
  console.log('Admin push notification received:', payload);
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(payload.notification?.title || 'Aura Battle Admin', {
      body: payload.notification?.body || 'Bạn có thông báo mới',
      icon: payload.notification?.icon || '/favicon.ico'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
});

// Populate push notification target dropdown
function populatePushTargetDropdown() {
  const pushTargetSelect = document.getElementById("pushNotificationTarget");
  if (!pushTargetSelect) return;
  
  get(ref(rtdb, "push_tokens")).then((snapshot) => {
    if (snapshot.exists()) {
      let optionsHtml = '<option value="all">🌐 Tất cả users có device</option>';
      
      snapshot.forEach((childSnap) => {
        const deviceId = childSnap.key;
        const data = childSnap.val();
        const username = data.username || "Unknown";
        const deviceInfo = data.deviceInfo || "Unknown device";
        
        optionsHtml += `<option value="${escapeHtml(deviceId)}">@${escapeHtml(username)} (${escapeHtml(deviceInfo)})</option>`;
      });
      
      pushTargetSelect.innerHTML = optionsHtml;
    }
  }).catch(err => {
    console.error("Error loading push targets:", err);
  });
}

// Send push notification
document.getElementById("sendPushNotificationBtn")?.addEventListener("click", async () => {
  const targetSelect = document.getElementById("pushNotificationTarget");
  const titleInput = document.getElementById("pushNotificationTitle");
  const bodyInput = document.getElementById("pushNotificationBody");
  const statusEl = document.getElementById("pushNotificationStatus");
  
  const target = targetSelect ? targetSelect.value : "all";
  const title = titleInput ? titleInput.value.trim() : "";
  const body = bodyInput ? bodyInput.value.trim() : "";
  
  if (!title || !body) {
    if (statusEl) statusEl.textContent = "Vui lòng nhập tiêu đề và nội dung!";
    return;
  }
  
  try {
    // Store notification in Firebase for devices to listen
    const notificationData = {
      title: title,
      body: body,
      timestamp: Date.now(),
      target: target
    };
    
    if (target === "all") {
      await set(ref(rtdb, "push_notifications/all"), notificationData);
    } else {
      await set(ref(rtdb, `push_notifications/${target}`), notificationData);
    }
    
    if (statusEl) statusEl.textContent = "Đã gửi push notification!";
    
    // Clear form
    if (titleInput) titleInput.value = "";
    if (bodyInput) bodyInput.value = "";
    
    // Clear notification after 10 seconds
    setTimeout(async () => {
      if (target === "all") {
        await rtdbRemove(ref(rtdb, "push_notifications/all"));
      } else {
        await rtdbRemove(ref(rtdb, `push_notifications/${target}`));
      }
    }, 10000);
    
  } catch (err) {
    console.error("Error sending push notification:", err);
    if (statusEl) statusEl.textContent = "Lỗi khi gửi: " + err.message;
  }
});

// Admin push notification toggle
document.getElementById("adminPushEnabled")?.addEventListener("change", (e) => {
  if (e.target.checked) {
    setupAdminPushNotifications();
  }
});

// Initialize push target dropdown
populatePushTargetDropdown();

// Populate troll user dropdown initially
populateTrollUserDropdown();

// Admin paste support for images
document.addEventListener("paste", (e) => {
  const adminProfileSection = document.querySelector(".admin-section:nth-of-type(10)"); // Admin profile section
  if (!adminProfileSection) return;
  
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      loadAdminAvatarFromFile(file);
      break;
    }
  }
});
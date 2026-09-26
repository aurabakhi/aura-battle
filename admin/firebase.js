// Giữ nguyên phần import app, db hiện tại của mày, và bổ sung thêm getDatabase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
// Thêm dòng này để gọi Realtime Database
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
// Import messaging cho push notifications
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js";

// Import firebase config từ file bảo mật
import firebaseConfig from "../firebase.config.js";

// Khởi tạo Firebase App & Firestore (giữ nguyên của mày)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// >>> BỔ SUNG THÊM DÒNG NÀY ĐỂ TẠO rtdb <<<
const rtdb = getDatabase(app);

// >>> BỔ SUNG THÊM MESSAGING CHO PUSH NOTIFICATIONS <<<
const messaging = getMessaging(app);

// Xuất cả db, rtdb và messaging ra để các file khác dùng chung
export { app, db, rtdb, messaging };
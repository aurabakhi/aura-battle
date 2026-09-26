import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js";

// Import firebase config từ file bảo mật
import firebaseConfig from "../firebase.config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const messaging = getMessaging(app);
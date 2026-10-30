import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQzYNswWXQNLiipZA9I3s1fXje5ZzR5tA",
  authDomain: "databest-absensi-mmd.firebaseapp.com",
  projectId: "databest-absensi-mmd",
  storageBucket: "databest-absensi-mmd.firebasestorage.app",
  messagingSenderId: "888594525537",
  appId: "1:888594525537:web:a5a6585e290c7063992920",
  measurementId: "G-2L17JT9TN9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Show / Hide Password Toggle
window.togglePasswordVisibility = () => {
  const pwdInput = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePwd");
  if (!pwdInput) return;

  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    if (toggleBtn) toggleBtn.textContent = "🙈";
  } else {
    pwdInput.type = "password";
    if (toggleBtn) toggleBtn.textContent = "👁";
  }
};

// Login Handler
window.handleLogin = async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const card = document.getElementById("loginCard");
  const email = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;

  if (!email || !pass) return;

  btn.disabled = true;
  btn.innerHTML = `<span>Memverifikasi Akun…</span>`;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) throw new Error("ROLE_MISSING");

    const role = snap.data().role;
    if (!["admin", "member"].includes(role)) throw new Error("ROLE_INVALID");

    localStorage.setItem("role", role);
    localStorage.removeItem("session");

    if (window.toast) {
      window.toast("Autentikasi berhasil! Mengalihkan ke dashboard…", "success");
    }

    setTimeout(() => {
      location.href = "dashboard-absen.html";
    }, 400);
  } catch (err) {
    console.error(err);
    await signOut(auth).catch(() => {});

    if (card) {
      card.classList.remove("shake");
      void card.offsetWidth; // Trigger reflow
      card.classList.add("shake");
    }

    const errorMsg =
      err.message === "ROLE_MISSING"
        ? "Akun Auth belum memiliki role di database users."
        : "Email atau kata sandi tidak valid. Periksa kembali.";

    if (window.toast) {
      window.toast(errorMsg, "error", 4500);
    } else {
      alert(errorMsg);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk Dashboard ↗</span>`;
  }
};
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

const IN_APP_RE = /WhatsApp|Instagram|FBAN|FBAV|\bLine\b|\bwv\b/i;
const IN_APP_MESSAGE = "Buka halaman ini langsung di Chrome atau Safari agar sesi dan perangkat tidak terkunci.";

const isInAppBrowser = () => IN_APP_RE.test(navigator.userAgent || "");
const showAuthMessage = (message, type = "error") => {
  if (window.toast) window.toast(message, type, 4500);
  else alert(message);
};

// Google Sign-In Handler
window.handleGoogleLogin = async () => {
  if (isInAppBrowser()) {
    showAuthMessage(IN_APP_MESSAGE);
    return;
  }

  const btn = document.getElementById("loginBtn");
  const card = document.getElementById("loginCard");

  btn.disabled = true;
  btn.innerHTML = `<span>Memverifikasi Akun Google…</span>`;

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const { user } = await signInWithPopup(auth, provider);

    const snap = await getDoc(doc(db, "users", user.uid));
    let role;
    if (!snap.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: "anggota",
        createdAt: serverTimestamp()
      });
      role = "anggota";
    } else {
      role = snap.data().role;
    }

    if (!["admin", "anggota", "member"].includes(role)) throw new Error("ROLE_INVALID");
    if (role === "member") role = "anggota";

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
      err.message === "ROLE_INVALID"
        ? "Role akun tidak dikenali."
        : "Google Sign-In gagal atau dibatalkan.";
    showAuthMessage(errorMsg);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk dengan Google</span>`;
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  if (isInAppBrowser()) {
    showAuthMessage(IN_APP_MESSAGE);
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    let role;
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: "anggota",
        createdAt: serverTimestamp()
      });
      role = "anggota";
    } else {
      role = snap.data().role;
    }

    if (role === "member") role = "anggota";
    if (!["admin", "anggota"].includes(role)) throw new Error("ROLE_INVALID");

    localStorage.setItem("role", role);
    location.href = "dashboard-absen.html";
  } catch (err) {
    console.error(err);
    await signOut(auth).catch(() => {});
    localStorage.removeItem("role");
  }
});
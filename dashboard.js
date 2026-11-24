import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

let role = "";
let cache = [];
let membersCache = [];
let currentStatusFilter = "semua";
let currentSelectedPeriod = "semua";
let pendingDeleteTanggal = null;
let currentUser = null;
let accountsCache = [];
let accountsLoaded = 0;
let pendingUsersCache = [];

// Logout Function
window.logoutPortal = async () => {
  window.tutupScanner?.();
  window.tutupQrSaya?.();
  await signOut(auth).catch(() => {});
  localStorage.removeItem("role");
  location.href = "index.html";
};

// Helper Utilities
const setText = (id, v) => {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
};

const safe = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const normalizeText = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
};

const getInitials = (name) => {
  if (!name) return "MM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Live Clock in Header
const startLiveClock = () => {
  const clockEl = document.getElementById("liveClock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };
    clockEl.textContent = `${now.toLocaleDateString("id-ID", options)} WIB`;
  };
  update();
  setInterval(update, 1000);
};

// Drawer Controls for Session Creator
window.bukaDrawerInput = () => {
  document.getElementById("adminDrawer")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  window.renderFormMembers();
};

window.tutupDrawerInput = () => {
  document.getElementById("adminDrawer")?.classList.remove("is-open");
  document.body.style.overflow = "";
};

window.renderFormMembers = () => {
  const container = document.getElementById("formMembersContainer");
  const countEl = document.getElementById("countFormMembers");
  if (!container) return;

  if (countEl) countEl.textContent = String(membersCache.length);

  if (membersCache.length === 0) {
    container.innerHTML = '<div class="empty-row" style="padding: 15px; font-size: 0.8rem;">Belum ada anggota di Master Data. Tambahkan dulu di menu Kelola Anggota.</div>';
    return;
  }

  container.innerHTML = "";

  membersCache.forEach((m, idx) => {
    const row = document.createElement("div");
    row.className = "form-member-row";
    row.dataset.memberName = normalizeText(m.nama);
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "8px 10px";
    row.style.background = "rgba(255,255,255,0.02)";
    row.style.borderRadius = "6px";
    row.style.border = "1px solid rgba(255,255,255,0.05)";

    const label = document.createElement("span");
    label.textContent = normalizeText(m.nama);
    label.style.fontSize = "0.82rem";
    label.style.fontWeight = "600";
    label.style.color = "var(--text)";

    const group = document.createElement("div");
    group.className = "status-options-group";
    group.style.display = "flex";
    group.style.gap = "6px";

    [
      { label: "Hadir", className: "btn-hadir", active: true, border: "rgba(16,185,129,0.4)", bg: "rgba(16,185,129,0.2)", color: "#34d399" },
      { label: "Izin", className: "btn-izin", active: false, border: "rgba(255,157,46,0.3)", bg: "transparent", color: "var(--muted)" },
      { label: "Alpha", className: "btn-alpha", active: false, border: "rgba(244,63,94,0.3)", bg: "transparent", color: "var(--muted)" }
    ].forEach(({ label: statusLabel, className, active, border, bg, color }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `status-btn ${className}${active ? " active" : ""}`;
      btn.dataset.status = statusLabel;
      btn.textContent = statusLabel;
      btn.style.padding = "3px 10px";
      btn.style.fontSize = "0.7rem";
      btn.style.borderRadius = "4px";
      btn.style.fontWeight = "700";
      btn.style.cursor = "pointer";
      btn.style.border = `1px solid ${border}`;
      btn.style.background = bg;
      btn.style.color = color;
      btn.addEventListener("click", () => window.selectFormStatus(btn, idx));
      group.appendChild(btn);
    });

    row.append(label, group);
    container.appendChild(row);
  });
};

window.selectFormStatus = (btnEl, idx) => {
  const parentGroup = btnEl.parentElement;
  parentGroup.querySelectorAll(".status-btn").forEach((b) => {
    b.classList.remove("active");
    b.style.background = "transparent";
    b.style.color = "var(--muted)";
    if (b.dataset.status === "Hadir") b.style.borderColor = "rgba(16,185,129,0.3)";
    if (b.dataset.status === "Izin") b.style.borderColor = "rgba(255,157,46,0.3)";
    if (b.dataset.status === "Alpha") b.style.borderColor = "rgba(244,63,94,0.3)";
  });

  btnEl.classList.add("active");
  const status = btnEl.dataset.status;
  if (status === "Hadir") {
    btnEl.style.background = "rgba(16,185,129,0.2)";
    btnEl.style.borderColor = "rgba(16,185,129,0.4)";
    btnEl.style.color = "#34d399";
  } else if (status === "Izin") {
    btnEl.style.background = "rgba(255,157,46,0.2)";
    btnEl.style.borderColor = "rgba(255,157,46,0.4)";
    btnEl.style.color = "var(--accent)";
  } else if (status === "Alpha") {
    btnEl.style.background = "rgba(244,63,94,0.2)";
    btnEl.style.borderColor = "rgba(244,63,94,0.4)";
    btnEl.style.color = "var(--danger)";
  }
};

window.bukaModalAnggota = () => {
  if (role !== "admin") return;
  document.getElementById("memberDrawer")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  window.renderListAnggotaModal();
  window.loadAccounts();
};

window.tutupModalAnggota = () => {
  document.getElementById("memberDrawer")?.classList.remove("is-open");
  document.body.style.overflow = "";
};

window.renderListAnggotaModal = () => {
  const container = document.getElementById("memberManageList");
  const countEl = document.getElementById("totalMembersCount");
  if (!container) return;

  if (countEl) countEl.textContent = String(membersCache.length);

  if (membersCache.length === 0) {
    container.innerHTML = '<div class="empty-row" style="padding: 20px;">Belum ada anggota terdaftar di database.</div>';
    return;
  }

  container.innerHTML = "";
  membersCache.forEach((m) => {
    const row = document.createElement("div");
    row.className = "member-item-row";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "10px 14px";
    row.style.background = "rgba(255, 255, 255, 0.03)";
    row.style.border = "1px solid var(--line)";
    row.style.borderRadius = "var(--radius-sm)";
    row.style.marginBottom = "8px";

    const name = document.createElement("span");
    name.className = "member-item-name";
    name.textContent = normalizeText(m.nama);
    name.style.fontSize = "0.85rem";
    name.style.fontWeight = "600";
    name.style.color = "var(--text)";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-delete";
    btn.style.padding = "4px 10px";
    btn.style.fontSize = "0.7rem";
    btn.textContent = "Hapus";
    btn.addEventListener("click", () => window.hapusAnggotaMaster(m.id));

    row.append(name, btn);
    container.appendChild(row);
  });
};

window.aksiTambahAnggota = async () => {
  const input = document.getElementById("inputNamaBaru");
  if (!input || !input.value.trim()) return;
  const nama = input.value.trim();
  input.value = "";
  await window.tambahAnggotaMaster(nama);
};

window.filterByStatus = (status, btnEl) => {
  currentStatusFilter = status;
  document.querySelectorAll(".status-tab").forEach((btn) => btn.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderTable();
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem("role");
    location.href = "login.html";
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      localStorage.removeItem("role");
      location.href = "login.html";
      return;
    }

    role = snap.data().role;
    if (role === "pending" || !["admin", "anggota"].includes(role)) {
      localStorage.removeItem("role");
      location.href = "login.html";
      return;
    }

    localStorage.setItem("role", role);
    document.body.dataset.role = role;
    currentUser = user;

    if (role === "anggota") {
      document.querySelector(".admin-drawer")?.remove();
      document.getElementById("scanOverlay")?.remove();
      document.querySelectorAll(".admin-only-btn").forEach((el) => el.remove());
      setText("roleLabel", "MEMBER / READ ONLY");
    } else {
      setText("roleLabel", "ADMINISTRATOR");
    }

    startLiveClock();
    boot();
  } catch (err) {
    console.error(err);
    localStorage.removeItem("role");
    location.href = "login.html";
  }
});

function boot() {
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const filterBulan = document.getElementById("filterBulan");
  if (filterBulan) filterBulan.value = month;

  if (role === "admin") {
    const pendingQuery = query(collection(db, "users"), where("role", "==", "pending"));
    onSnapshot(pendingQuery, (snap) => {
      pendingUsersCache = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      window.renderPendingApprovals?.();
    }, (err) => console.error("Gagal memuat permintaan akses:", err));
  }

  const dateInput = document.getElementById("tanggal");
  if (dateInput) dateInput.valueAsDate = new Date();

  window.onMonthChange = onMonthChange;
  window.pilihPertemuan = pilihPertemuan;
  window.tampilkanDataTabel = renderTable;

  const qMembers = query(collection(db, "members"), orderBy("nama", "asc"));
  onSnapshot(qMembers, (snap) => {
    membersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (typeof window.renderListAnggotaModal === "function") window.renderListAnggotaModal();
    if (typeof window.renderFormMembers === "function") window.renderFormMembers();
    window.renderAccountList?.();
    window.renderPendingApprovals?.();
  });

  const q = query(collection(db, "absensi"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderMeetingCards();
      window.refreshScanSessions?.();
    },
    (err) => {
      console.error(err);
      if (window.toast) window.toast("Gagal memuat data dari database Firestore.", "error");
      else alert("Gagal membaca data absensi.");
    }
  );
}

function onMonthChange() {
  currentSelectedPeriod = "semua";
  renderMeetingCards();
}

function renderMeetingCards() {
  const month = document.getElementById("filterBulan")?.value || "";
  const container = document.getElementById("meetingCardsContainer");
  const countInfo = document.getElementById("meetingCountInfo");
  const deleteActionContainer = document.getElementById("deleteSessionActionContainer");
  if (!container) return;

  const monthRows = cache.filter((x) => x.tanggal?.split("-")[1] === month);

  const dateMap = {};
  monthRows.forEach((x) => {
    if (x.tanggal && !dateMap[x.tanggal]) {
      dateMap[x.tanggal] = x.detailSesi || "Pertemuan";
    }
  });

  const dates = Object.keys(dateMap).sort();

  if (countInfo) countInfo.textContent = `${dates.length} Pertemuan Total`;

  if (deleteActionContainer) {
    if (role === "admin" && currentSelectedPeriod !== "semua" && dates.includes(currentSelectedPeriod)) {
      deleteActionContainer.innerHTML = `
        <button class="btn-delete" onclick="hapusSesiPertemuan('${currentSelectedPeriod}')" style="padding: 6px 14px; font-size: 0.75rem;">
          🗑️ Hapus Sesi Tanggal ${currentSelectedPeriod}
        </button>
      `;
    } else {
      deleteActionContainer.innerHTML = "";
    }
  }

  if (dates.length === 0) {
    container.innerHTML = '<div style="color: var(--muted); font-size: 0.82rem; padding: 10px 0;">Belum ada pertemuan/sesi di bulan ini.</div>';
    renderTable();
    return;
  }

  let html = `
    <div class="meeting-card-item ${currentSelectedPeriod === 'semua' ? 'active' : ''}" onclick="pilihPertemuan('semua')">
      <span class="meeting-card-date">Semua Sesi</span>
      <span class="meeting-card-label">Bulan Ini</span>
    </div>
  `;

  dates.forEach((d) => {
    const isActive = currentSelectedPeriod === d ? "active" : "";
    html += `
      <div class="meeting-card-item ${isActive}" onclick="pilihPertemuan('${d}')">
        <span class="meeting-card-date">${d}</span>
        <span class="meeting-card-label">${safe(dateMap[d])}</span>
      </div>
    `;
  });

  container.innerHTML = html;
  renderTable();
}

function pilihPertemuan(tanggal) {
  currentSelectedPeriod = tanggal;
  renderMeetingCards();
}

window.hapusSesiPertemuan = (tanggal) => {
  if (role !== "admin") return;
  pendingDeleteTanggal = tanggal;
  
  const labelTanggal = document.getElementById("modalTargetTanggal");
  if (labelTanggal) labelTanggal.textContent = tanggal;

  const modal = document.getElementById("passwordModal");
  if (modal) modal.style.display = "flex";
};

window.tutupModalPassword = () => {
  const modal = document.getElementById("passwordModal");
  if (modal) modal.style.display = "none";
  pendingDeleteTanggal = null;
};

window.eksekusiHapusSesi = async () => {
  const tanggal = pendingDeleteTanggal;

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Sesi login tidak valid. Silakan login ulang.");
    return;
  }

  const btnHapus = document.getElementById("btnKonfirmasiHapus");
  if (btnHapus) {
    btnHapus.disabled = true;
    btnHapus.textContent = "Memproses...";
  }

  try {
    await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());

    const targetRows = cache.filter((x) => x.tanggal === tanggal);
    if (targetRows.length === 0) {
      alert("Tidak ada data absensi pada tanggal tersebut.");
      window.tutupModalPassword();
      return;
    }

    const deletePromises = targetRows.map((row) => deleteDoc(doc(db, "absensi", row.id)));
    await Promise.all(deletePromises);

    currentSelectedPeriod = "semua";
    window.tutupModalPassword();
    if (window.toast) window.toast(`Sesi tanggal ${tanggal} berhasil dihapus permanen!`, "success");
    else alert(`Sesi tanggal ${tanggal} berhasil dihapus.`);

  } catch (err) {
    console.error("Autentikasi Google Gagal:", err);
    if (window.toast) window.toast("Verifikasi Google dibatalkan atau gagal. Penghapusan dibatalkan.", "error");
    else alert("Verifikasi Google dibatalkan atau gagal. Aksi hapus dibatalkan.");
  } finally {
    if (btnHapus) {
      btnHapus.disabled = false;
      btnHapus.textContent = "Hapus Permanen";
    }
  }
};

function renderTable() {
  const month = document.getElementById("filterBulan")?.value || "";
  const search = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const tbody = document.getElementById("absensi-table-body");
  const mobileContainer = document.getElementById("mobileCardsContainer");

  const baseRows = cache.filter(
    (x) =>
      x.tanggal?.split("-")[1] === month &&
      (currentSelectedPeriod === "semua" || x.tanggal === currentSelectedPeriod)
  );

  let hadir = 0, izin = 0, alpha = 0;
  baseRows.forEach((d) => {
    if (d.status === "Hadir") hadir++;
    if (d.status === "Izin") izin++;
    if (d.status === "Alpha") alpha++;
  });

  const total = hadir + izin + alpha;
  const attendanceRate = total > 0 ? Math.round((hadir / total) * 100) : 0;

  setText("attendance-rate", `${attendanceRate}%`);
  const rateBar = document.getElementById("rateBarFill");
  if (rateBar) rateBar.style.width = `${attendanceRate}%`;

  if (window.animateCount) {
    window.animateCount("count-hadir", hadir);
    window.animateCount("count-izin", izin);
    window.animateCount("count-alpha", alpha);
    window.animateCount("total-data", total);
  } else {
    setText("count-hadir", hadir);
    setText("count-izin", izin);
    setText("count-alpha", alpha);
    setText("total-data", total);
  }

  const displayRows = baseRows.filter((d) => {
    const statusMatch =
      currentStatusFilter === "semua" || d.status === currentStatusFilter;
    const searchMatch =
      !search ||
      (d.nama || "").toLowerCase().includes(search) ||
      (d.detailSesi || "").toLowerCase().includes(search);
    return statusMatch && searchMatch;
  });

  setText("recordCount", displayRows.length);

  if (tbody) {
    tbody.innerHTML = "";
    displayRows.forEach((d) => {
      const cls =
        d.status === "Hadir"
          ? "status-hadir"
          : d.status === "Izin"
          ? "status-izin"
          : "status-alpha";

      const row = document.createElement("tr");

      const memberCell = document.createElement("td");
      const memberWrap = document.createElement("div");
      memberWrap.className = "member-cell";
      const avatar = document.createElement("div");
      avatar.className = "member-avatar";
      avatar.textContent = getInitials(d.nama || "");
      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = normalizeText(d.nama || "");
      memberWrap.append(avatar, name);
      memberCell.appendChild(memberWrap);

      const sessionCell = document.createElement("td");
      const sessionWrap = document.createElement("div");
      sessionWrap.className = "session-cell";
      const sessionDate = document.createElement("span");
      sessionDate.className = "session-date";
      sessionDate.textContent = normalizeText(d.tanggal || "");
      const sessionTag = document.createElement("span");
      sessionTag.className = "session-tag-badge";
      sessionTag.textContent = normalizeText(d.detailSesi || "");
      sessionWrap.append(sessionDate, sessionTag);
      sessionCell.appendChild(sessionWrap);

      const statusCell = document.createElement("td");
      const statusPill = document.createElement("span");
      statusPill.className = `status-pill ${cls}`;
      statusPill.textContent = `● ${normalizeText(d.status || "")}`;
      statusPill.title = "Klik untuk ubah status";
      if (role === "admin") {
        statusPill.style.cursor = "pointer";
        statusPill.addEventListener("click", () => window.ubahStatusLangsung(d.id, d.status));
      }
      statusCell.appendChild(statusPill);

      const actionCell = document.createElement("td");
      actionCell.style.textAlign = "right";
      if (role === "admin") {
        const actionWrap = document.createElement("div");
        actionWrap.className = "action-buttons";
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn-delete";
        deleteBtn.textContent = "Hapus";
        deleteBtn.addEventListener("click", () => window.hapusBaris(d.id));
        actionWrap.appendChild(deleteBtn);
        actionCell.appendChild(actionWrap);
      } else {
        const readonly = document.createElement("span");
        readonly.textContent = "Hanya baca";
        readonly.style.color = "var(--muted)";
        readonly.style.fontSize = ".72rem";
        actionCell.appendChild(readonly);
      }

      row.append(memberCell, sessionCell, statusCell, actionCell);
      tbody.appendChild(row);
    });

    if (!displayRows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-row">Tidak ada data yang sesuai dengan pencarian atau filter.</td></tr>';
    }
  }

  if (mobileContainer) {
    mobileContainer.innerHTML = "";
    displayRows.forEach((d) => {
      const cls =
        d.status === "Hadir"
          ? "status-hadir"
          : d.status === "Izin"
          ? "status-izin"
          : "status-alpha";

      const card = document.createElement("div");
      card.className = "mobile-card-item";

      const top = document.createElement("div");
      top.className = "mobile-card-top";

      const memberWrap = document.createElement("div");
      memberWrap.className = "member-cell";
      const avatar = document.createElement("div");
      avatar.className = "member-avatar";
      avatar.textContent = getInitials(d.nama || "");
      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = normalizeText(d.nama || "");
      memberWrap.append(avatar, name);

      const pill = document.createElement("span");
      pill.className = `status-pill ${cls}`;
      pill.textContent = `● ${normalizeText(d.status || "")}`;
      if (role === "admin") {
        pill.style.cursor = "pointer";
        pill.addEventListener("click", () => window.ubahStatusLangsung(d.id, d.status));
      }

      top.append(memberWrap, pill);

      const details = document.createElement("div");
      details.className = "mobile-card-details";
      const date = document.createElement("span");
      date.className = "session-date";
      date.textContent = `📅 ${normalizeText(d.tanggal || "")}`;
      const tag = document.createElement("span");
      tag.className = "session-tag-badge";
      tag.textContent = `🏷 ${normalizeText(d.detailSesi || "")}`;
      details.append(date, tag);

      const actionWrap = document.createElement("div");
      actionWrap.className = "mobile-card-actions";
      if (role === "admin") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-delete";
        btn.textContent = "Hapus";
        btn.addEventListener("click", () => window.hapusBaris(d.id));
        actionWrap.appendChild(btn);
      }

      card.append(top, details, actionWrap);
      mobileContainer.appendChild(card);
    });

    if (!displayRows.length) {
      mobileContainer.innerHTML =
        '<div class="empty-row">Tidak ada data untuk filter ini.</div>';
    }
  }
}

window.ubahStatusLangsung = async (id, currentStatus) => {
  if (role !== "admin") return;
  let nextStatus = "Hadir";
  if (currentStatus === "Hadir") nextStatus = "Izin";
  else if (currentStatus === "Izin") nextStatus = "Alpha";
  else if (currentStatus === "Alpha") nextStatus = "Hadir";

  try {
    await updateDoc(doc(db, "absensi", id), { status: nextStatus });
    if (window.toast) window.toast(`Status diubah jadi ${nextStatus}`, "success");
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast("Gagal mengubah status.", "error");
  }
};

window.simpanDataAbsen = async (e) => {
  e.preventDefault();
  if (role !== "admin") return;

  const kategori = document.getElementById("kategori").value;
  const namaAcara = document.getElementById("namaAcara").value.trim();
  const tanggal = document.getElementById("tanggal").value;

  const rowElements = document.querySelectorAll(".form-member-row");
  if (rowElements.length === 0) {
    alert("Belum ada anggota yang dimuat di form.");
    return;
  }

  const detailSesi = namaAcara ? `${kategori}: ${namaAcara}` : kategori;
  const btn = document.getElementById("btn-submit-text");

  btn.disabled = true;
  btn.textContent = "Menyimpan Sesi & Absensi…";

  try {
    const promises = [];
    rowElements.forEach((row) => {
      const nama = row.dataset.memberName;
      const activeBtn = row.querySelector(".status-btn.active");
      const status = activeBtn ? activeBtn.dataset.status : "Hadir";

      promises.push(
        addDoc(collection(db, "absensi"), {
          nama,
          detailSesi,
          tanggal,
          status,
          createdAt: serverTimestamp()
        })
      );
    });

    await Promise.all(promises);

    if (window.toast) window.toast(`Sesi berhasil dibuat untuk ${rowElements.length} anggota!`, "success");
    else alert("Sesi dan absensi berhasil dibuat.");

    window.tutupDrawerInput();
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast("Terjadi kesalahan saat menyimpan sesi.", "error");
    else alert("Terjadi kesalahan.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Sesi & Absensi";
  }
};

window.tambahAnggotaMaster = async (namaBaru) => {
  if (role !== "admin") return;
  if (!namaBaru || !namaBaru.trim()) return;

  try {
    await addDoc(collection(db, "members"), {
      nama: namaBaru.trim(),
      createdAt: serverTimestamp()
    });
    if (window.toast) window.toast("Anggota berhasil ditambahkan ke database!", "success");
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast("Gagal menambah anggota.", "error");
  }
};

window.hapusAnggotaMaster = async (memberId) => {
  if (role !== "admin") return;
  if (!confirm("Yakin ingin menghapus anggota ini dari master data?")) return;

  try {
    await deleteDoc(doc(db, "members", memberId));
    if (window.toast) window.toast("Anggota berhasil dihapus dari master.", "info");
    window.renderListAnggotaModal();
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast("Gagal menghapus anggota.", "error");
  }
};

window.hapusBaris = async (id) => {
  if (role !== "admin") return;

  let confirmed = false;
  if (window.confirmModal) {
    confirmed = await window.confirmModal(
      "Hapus Catatan Absensi",
      "Yakin ingin menghapus catatan absensi anggota ini secara permanen?"
    );
  } else {
    confirmed = confirm("Yakin mau menghapus data absensi ini?");
  }

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "absensi", id));
    if (window.toast) window.toast("Data absensi berhasil dihapus.", "info");
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast("Gagal menghapus data absensi.", "error");
    else alert("Gagal menghapus data.");
  }
};

window.unduhRekap = async () => {
  const month = document.getElementById("filterBulan")?.value || "";
  const monthSelect = document.getElementById("filterBulan");
  const monthName = monthSelect?.selectedOptions[0]?.text || month;

  const rows = cache
    .filter((x) => {
      const monthMatch = x.tanggal?.split("-")[1] === month;
      const periodMatch = currentSelectedPeriod === "semua" || x.tanggal === currentSelectedPeriod;
      return monthMatch && periodMatch;
    })
    .sort((a, b) => {
      return (
        String(a.tanggal || "").localeCompare(String(b.tanggal || "")) ||
        String(a.nama || "").localeCompare(String(b.nama || ""))
      );
    });

  if (!rows.length) {
    if (window.toast) window.toast(`Tidak ada data absensi untuk periode ini.`, "info");
    else alert(`Tidak ada data absensi.`);
    return;
  }

  const button = document.querySelector(".btn-download");
  const originalText = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML = "Menyiapkan Excel…";
  }

  try {
    if (!window.ExcelJS) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = "Portal Absensi Multimedia SMKM4";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Rekap Absensi", {
      views: [{ showGridLines: true }]
    });

    worksheet.columns = [
      { key: "no", width: 8 },
      { key: "nama", width: 34 },
      { key: "tanggal", width: 16 },
      { key: "sesi", width: 40 },
      { key: "status", width: 16 }
    ];

    worksheet.mergeCells("A2:E2");
    worksheet.getCell("A2").value = "REKAPITULASI ABSENSI MULTIMEDIA SMKM4";
    worksheet.getCell("A2").font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0E1726" } };
    worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells("A3:E3");
    worksheet.getCell("A3").value = `Periode: ${monthName} (Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")})`;
    worksheet.getCell("A3").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF555555" } };
    worksheet.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(["NO", "NAMA LENGKAP", "TANGGAL", "SESI / ACARA", "STATUS"]);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111119" } };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FFFF9D2E" } }
      };
    });

    let hadirCount = 0, izinCount = 0, alphaCount = 0;

    rows.forEach((item, index) => {
      if (item.status === "Hadir") hadirCount++;
      if (item.status === "Izin") izinCount++;
      if (item.status === "Alpha") alphaCount++;

      const dataRow = worksheet.addRow([
        index + 1,
        item.nama || "-",
        item.tanggal || "-",
        item.detailSesi || "-",
        item.status || "-"
      ]);
      dataRow.height = 22;

      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      dataRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
      dataRow.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
      dataRow.getCell(4).alignment = { vertical: "middle", horizontal: "left" };
      dataRow.getCell(5).alignment = { vertical: "middle", horizontal: "center" };

      const statusCell = dataRow.getCell(5);
      if (item.status === "Hadir") {
        statusCell.font = { bold: true, color: { argb: "FF10B981" } };
      } else if (item.status === "Izin") {
        statusCell.font = { bold: true, color: { argb: "FFFF9D2E" } };
      } else {
        statusCell.font = { bold: true, color: { argb: "FFF43F5E" } };
      }

      dataRow.eachCell((cell) => {
        cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
      });
    });

    worksheet.addRow([]);
    const summaryHeader = worksheet.addRow(["", "RINGKASAN KEHADIRAN", "", "", ""]);
    summaryHeader.getCell(2).font = { bold: true };

    const sumHadir = worksheet.addRow(["", "Total Hadir", "", "", hadirCount]);
    sumHadir.getCell(5).font = { bold: true, color: { argb: "FF10B981" } };

    const sumIzin = worksheet.addRow(["", "Total Izin", "", "", izinCount]);
    sumIzin.getCell(5).font = { bold: true, color: { argb: "FFFF9D2E" } };

    const sumAlpha = worksheet.addRow(["", "Total Alpha", "", "", alphaCount]);
    sumAlpha.getCell(5).font = { bold: true, color: { argb: "FFF43F5E" } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_Absensi_MMD_SMKM4_${monthName.replace(/\s+/g, "_")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    if (window.toast) window.toast("File Excel berhasil diunduh!", "success");
  } catch (err) {
    console.error("Export Error:", err);
    if (window.toast) window.toast("Gagal membuat file Excel.", "error");
    else alert("Gagal mengunduh rekap: " + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText || "↓ Unduh Excel";
    }
  }
};

/* ==========================================================================
   ABSENSI QR DINAMIS 30 DETIK, KUNCI PERANGKAT, PEMINDAI + INPUT MANUAL
   ========================================================================== */
const QR_STEP_MS = 30000;
const QRGEN_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
const JSQR_SRC = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
const DEVICE_KEY = "mmd_device_id";
const IN_APP_RE = /WhatsApp|Instagram|FBAN|FBAV|\bLine\b|\bwv\b/i;

const $id = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "timeout" })), ms))]);
const qrStep = (t = Date.now()) => Math.floor(t / QR_STEP_MS);
const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
const slug = (s) =>
  String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "x";
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const clockStr = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const isInAppBrowser = () => IN_APP_RE.test(navigator.userAgent || "");

const scriptCache = new Map();
const loadScript = (src) => {
  if (!scriptCache.has(src)) {
    scriptCache.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { scriptCache.delete(src); reject(new Error("Gagal memuat pustaka pendukung.")); };
        document.head.appendChild(s);
      })
    );
  }
  return scriptCache.get(src);
};

const errText = (e) => {
  const code = String(e?.code || e?.name || "");
  if (code.includes("permission-denied")) return "Akses ditolak oleh aturan keamanan.";
  if (code.includes("unavailable") || code.includes("network")) return "Jaringan tidak tersedia.";
  if (code === "NotAllowedError") return "Izin kamera ditolak.";
  if (code === "NotFoundError" || code === "OverconstrainedError") return "Kamera tidak ditemukan.";
  return e?.message || "Terjadi kesalahan.";
};

const notify = (msg, type = "info") => {
  if (window.toast) window.toast(msg, type);
  else alert(msg);
};

const accountName = (u) => {
  const member = u.memberId ? membersCache.find((m) => m.id === u.memberId) : null;
  return normalizeText(
    member?.nama || u.nama || u.name || u.displayName || (u.email ? String(u.email).split("@")[0] : "") || u.uid || ""
  );
};

/* ---------- Akun & perangkat (Admin) ---------- */
window.renderPendingApprovals = () => {
  if (role !== "admin") return;
  const count = pendingUsersCache.length;
  const badge = $id("pendingApprovalBadge");
  if (badge) {
    badge.textContent = count > 0 ? String(count) : "";
    badge.hidden = count === 0;
  }

  const banner = $id("pendingApprovalBanner");
  if (banner) {
    banner.hidden = count === 0;
    banner.textContent = count > 0
      ? `${count} permintaan akses menunggu persetujuan.`
      : "";
  }

  const container = $id("pendingAccessSection");
  if (!container) return;
  container.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "mono";
  heading.style.cssText = "font-size:0.72rem;font-weight:800;margin-bottom:8px;";
  heading.textContent = "Permintaan Akses Masuk";
  container.appendChild(heading);

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = "Tidak ada permintaan akses baru.";
    container.appendChild(empty);
    return;
  }

  pendingUsersCache.forEach((u) => {
    const row = document.createElement("div");
    row.className = "account-row";
    row.style.flexWrap = "wrap";

    const info = document.createElement("div");
    info.className = "account-info";
    const name = document.createElement("span");
    name.className = "member-item-name";
    name.textContent = u.nama || u.name || u.email || u.uid;
    const meta = document.createElement("span");
    meta.className = "account-meta mono";
    meta.textContent = u.email || u.uid;
    info.append(name, meta);

    const link = document.createElement("select");
    link.className = "account-link";
    link.setAttribute("aria-label", `Tautkan ${name.textContent} ke anggota`);
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Tautkan ke anggota (opsional)";
    link.appendChild(none);
    membersCache.forEach((m) => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = normalizeText(m.nama);
      if (u.memberId === m.id) option.selected = true;
      link.appendChild(option);
    });

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn-primary";
    accept.textContent = "Terima";
    accept.addEventListener("click", () => window.terimaPermintaan(u.uid, link.value));

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "btn-delete";
    reject.textContent = "Tolak";
    reject.addEventListener("click", () => window.tolakPermintaan(u.uid));

    row.append(info, link, accept, reject);
    container.appendChild(row);
  });
};

window.terimaPermintaan = async (uid, memberId) => {
  if (role !== "admin") return;
  try {
    await updateDoc(doc(db, "users", uid), {
      role: "anggota",
      memberId: memberId || null
    });
    notify("Permintaan akses diterima.", "success");
  } catch (err) {
    console.error(err);
    notify(errText(err), "error");
  }
};

window.tolakPermintaan = async (uid) => {
  if (role !== "admin") return;
  if (!confirm("Tolak dan hapus permintaan akses akun ini?")) return;
  try {
    await deleteDoc(doc(db, "users", uid));
    notify("Permintaan akses ditolak.", "success");
  } catch (err) {
    console.error(err);
    notify(errText(err), "error");
  }
};

window.loadAccounts = async (force = false) => {
  if (role !== "admin") return;
  if (force || !accountsLoaded || Date.now() - accountsLoaded > 120000) {
    try {
      const snap = await getDocs(collection(db, "users"));
      accountsCache = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      accountsLoaded = Date.now();
    } catch (err) {
      console.error(err);
      notify("Gagal memuat daftar akun.", "error");
    }
  }
  window.renderAccountList();
};

window.renderAccountList = () => {
  const container = $id("accountManageList");
  if (!container) return;
  const activeAccounts = accountsCache.filter((u) => u.role !== "pending");
  setText("totalAccountsCount", String(activeAccounts.length));
  if (!activeAccounts.length) {
    container.innerHTML = '<div class="empty-row" style="padding: 20px;">Belum ada akun terdaftar.</div>';
    return;
  }
  const list = [...activeAccounts].sort((a, b) => accountName(a).localeCompare(accountName(b), "id"));
  container.innerHTML = "";
  list.forEach((u) => {
    const row = document.createElement("div");
    row.className = "account-row";

    const info = document.createElement("div");
    info.className = "account-info";
    const name = document.createElement("span");
    name.className = "member-item-name";
    name.textContent = accountName(u);
    const meta = document.createElement("span");
    meta.className = "account-meta mono";
    meta.textContent = `${u.email || u.uid} · ${u.role || "-"}`;
    const badge = document.createElement("span");
    badge.className = `device-badge mono ${u.deviceId ? "is-locked" : ""}`;
    badge.textContent = u.deviceId ? "Perangkat terkunci" : "Belum ada perangkat";
    info.append(name, meta, badge);

    const link = document.createElement("select");
    link.className = "account-link";
    link.setAttribute("aria-label", `Tautkan ${accountName(u)} ke anggota`);
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Tautkan ke anggota…";
    link.appendChild(none);
    membersCache.forEach((m) => {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = normalizeText(m.nama);
      if (u.memberId === m.id) o.selected = true;
      link.appendChild(o);
    });
    link.addEventListener("change", () => window.tautkanAnggota(u.uid, link.value));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-delete account-reset";
    btn.textContent = "Reset Perangkat";
    btn.addEventListener("click", () => window.resetPerangkat(u.uid));

    row.append(info, link, btn);
    container.appendChild(row);
  });
};

window.tautkanAnggota = async (uid, memberId) => {
  if (role !== "admin") return;
  try {
    await updateDoc(doc(db, "users", uid), { memberId: memberId || null });
    const acc = accountsCache.find((u) => u.uid === uid);
    if (acc) acc.memberId = memberId || null;
    window.renderAccountList();
    notify("Tautan anggota disimpan.", "success");
  } catch (err) {
    console.error(err);
    notify(errText(err), "error");
    window.renderAccountList();
  }
};

window.resetPerangkat = async (uid) => {
  if (role !== "admin") return;
  const acc = accountsCache.find((u) => u.uid === uid);
  if (!confirm(`Reset perangkat ${acc ? accountName(acc) : "akun ini"}? Perangkat terdaftar dilepas dan token QR diganti.`)) return;
  try {
    await updateDoc(doc(db, "users", uid), { deviceId: null, qrToken: newToken() });
    if (acc) { acc.deviceId = null; delete acc.qrToken; }
    window.renderAccountList();
    notify("Perangkat direset. Anggota dapat mendaftarkan perangkat baru lewat QR Saya.", "success");
  } catch (err) {
    console.error(err);
    notify(errText(err), "error");
  }
};

/* ---------- QR Saya (anggota) ---------- */
const QRT = { timer: null };
const stopQrTimer = () => { clearInterval(QRT.timer); QRT.timer = null; };
const qrAlert = (msg) => `<div class="qr-alert" role="alert">${safe(msg)}</div>`;

const syncQrBlur = () => {
  $id("qrWrap")?.classList.toggle("is-blurred", document.hidden || !document.hasFocus());
};
document.addEventListener("visibilitychange", syncQrBlur);
window.addEventListener("blur", syncQrBlur);
window.addEventListener("focus", syncQrBlur);

const getDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : newToken() + newToken();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

const qrDrawerOpen = () => $id("qrDrawer")?.classList.contains("is-open");

window.bukaQrSaya = () => {
  $id("qrDrawer")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  renderQrSaya();
};

window.tutupQrSaya = () => {
  stopQrTimer();
  $id("qrDrawer")?.classList.remove("is-open");
  if (!$id("scanOverlay")?.classList.contains("is-open")) document.body.style.overflow = "";
};

async function renderQrSaya() {
  const body = $id("qrBody");
  if (!body || !currentUser) return;
  stopQrTimer();

  if (isInAppBrowser()) {
    body.innerHTML = qrAlert("Buka halaman ini langsung di Chrome atau Safari agar perangkat tidak terkunci.");
    return;
  }

  body.innerHTML = '<div class="empty-row">Menyiapkan QR…</div>';
  try {
    const local = getDeviceId();
    if (!local) throw new Error("Penyimpanan peramban tidak tersedia. Nonaktifkan mode privat lalu coba lagi.");

    const ref = doc(db, "users", currentUser.uid);
    let data = (await getDoc(ref)).data() || {};
    if (!data.deviceId) {
      try {
        await updateDoc(ref, { deviceId: local });
        data.deviceId = local;
      } catch (e) {
        if (e.code !== "permission-denied") throw e;
        data = (await getDoc(ref)).data() || {};
        if (!data.deviceId) throw e;
      }
    }
    if (!qrDrawerOpen()) return;

    if (data.deviceId !== local) {
      body.innerHTML = qrAlert("Perangkat tidak cocok. Hubungi Admin untuk reset perangkat.");
      return;
    }

    let token = data.qrToken;
    if (!token) {
      token = newToken();
      await updateDoc(ref, { qrToken: token });
    }
    await loadScript(QRGEN_SRC);
    if (!qrDrawerOpen()) return;

    const name = accountName({ ...data, uid: currentUser.uid });
    body.innerHTML = `
      <div class="qr-panel">
        <div class="qr-clock mono" id="qrClock">--:--:--</div>
        <div class="qr-meta mono"><span>QR berganti dalam</span><span id="qrCount">30 dtk</span></div>
        <div class="qr-bar"><div class="qr-bar-fill" id="qrBar"></div></div>
        <div class="qr-wrap" id="qrWrap">
          <img id="qrImg" class="qr-img" alt="QR kehadiran" draggable="false">
        </div>
        <p class="qr-name">${safe(name)}</p>
        <p class="qr-note">QR berganti tiap 30 detik dan kabur saat halaman tidak aktif. Tunjukkan langsung kepada admin; tangkapan layar tidak akan diterima.</p>
      </div>`;

    let cur = null;
    const paint = () => {
      const now = Date.now();
      const st = qrStep(now);
      if (st !== cur) {
        cur = st;
        const q = window.qrcode(0, "M");
        q.addData(JSON.stringify({ uid: currentUser.uid, token, step: st }));
        q.make();
        $id("qrImg").src = q.createDataURL(8, 4);
      }
      const rem = QR_STEP_MS - (now % QR_STEP_MS);
      setText("qrClock", clockStr(new Date(now)));
      setText("qrCount", `${Math.ceil(rem / 1000)} dtk`);
      const bar = $id("qrBar");
      if (bar) bar.style.width = `${(rem / QR_STEP_MS) * 100}%`;
    };
    paint();
    syncQrBlur();
    QRT.timer = setInterval(() => {
      if (!qrDrawerOpen() || !$id("qrImg")) return stopQrTimer();
      paint();
    }, 250);
  } catch (err) {
    console.error(err);
    body.innerHTML = qrAlert(errText(err));
  }
}

/* ---------- Pemindai (admin / operator) ---------- */
const SC = {
  open: false, running: false, busy: false, stream: null, timer: null, decode: null,
  done: new Set(), count: 0, last: "", lastAt: 0
};
const TONE_CLASS = { info: "", loading: "is-loading", ok: "is-ok", warn: "is-warn", error: "is-error" };

const setScan = (tone, title, detail = "") => {
  const el = $id("scanTone");
  if (el) el.className = `scan-tone ${TONE_CLASS[tone] || ""}`;
  setText("scanTitle", title);
  setText("scanDetail", detail);
};

const setScanMeta = (m) => {
  const el = $id("scanMeta");
  if (!el) return;
  el.hidden = !m;
  if (!m) return;
  setText("scanNama", m.nama || "-");
  setText("scanTime", m.time || "-");
};

const idlePrompt = () => setScan("info", "Arahkan kamera ke QR anggota", "Atau gunakan Input Manual di bawah kamera.");
const updateScanCount = () => setText("scanCount", `Tercatat ${SC.count}`);

window.refreshScanSessions = () => {
  const sel = $id("scanSession");
  if (!sel || !SC.open) return;
  const today = localDate();
  const prev = sel.value;
  const sessions = [...new Set(cache.filter((x) => x.tanggal === today && x.detailSesi).map((x) => normalizeText(x.detailSesi)))];
  sel.innerHTML =
    sessions.map((s) => `<option value="s:${safe(s)}">${safe(s)}</option>`).join("") +
    '<option value="__new__">Sesi baru…</option>';
  sel.value = [...sel.options].some((o) => o.value === prev) ? prev : sessions.length ? sel.options[0].value : "__new__";
  $id("scanNewSession").hidden = sel.value !== "__new__";
};

window.onScanSessionChange = () => {
  $id("scanNewSession").hidden = $id("scanSession").value !== "__new__";
};

const currentSession = () => {
  const tanggal = localDate();
  const val = $id("scanSession")?.value || "__new__";
  if (val.startsWith("s:")) return { tanggal, detailSesi: val.slice(2) };
  const kategori = $id("scanKategori")?.value || "";
  const acara = ($id("scanAcara")?.value || "").trim();
  return { tanggal, detailSesi: acara ? `${kategori}: ${acara}` : kategori };
};

async function ensureQrDecoder() {
  if (SC.decode) return;
  if ("BarcodeDetector" in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
        SC.decode = async (video) => {
          const r = await det.detect(video);
          return r.length ? r[0].rawValue : null;
        };
        return;
      }
    } catch (e) {
      console.warn("BarcodeDetector tidak tersedia", e);
    }
  }
  await loadScript(JSQR_SRC);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  SC.decode = async (video) => {
    const vw = video.videoWidth;
    if (!vw) return null;
    const k = Math.min(1, 480 / vw);
    const w = Math.round(vw * k);
    const h = Math.round(video.videoHeight * k);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const r = window.jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
    return r ? r.data : null;
  };
}

async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Peramban tidak mendukung kamera.");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

const stopStream = (stream, video) => {
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
};

window.bukaScanner = async () => {
  if (role !== "admin") return;
  const overlay = $id("scanOverlay");
  if (!overlay) return;
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
  SC.open = true;
  SC.running = true;
  SC.busy = false;
  updateScanCount();
  setScanMeta(null);
  window.refreshScanSessions();
  setScan("loading", "Menyiapkan kamera");
  window.loadAccounts();

  const video = $id("scanVideo");
  const [cam, dec] = await Promise.allSettled([startCamera(video), ensureQrDecoder()]);
  if (!SC.running) {
    if (cam.status === "fulfilled") stopStream(cam.value, video);
    return;
  }
  if (cam.status === "fulfilled" && dec.status === "fulfilled") {
    SC.stream = cam.value;
    idlePrompt();
    scanTick();
    return;
  }
  if (cam.status === "fulfilled") stopStream(cam.value, video);
  const err = cam.status === "rejected" ? cam.reason : dec.reason;
  console.error(err);
  setScan("warn", "Pemindai kamera tidak aktif", `${errText(err)} Gunakan Input Manual.`);
};

function stopScanner() {
  SC.running = false;
  SC.busy = false;
  clearTimeout(SC.timer);
  stopStream(SC.stream, $id("scanVideo"));
  SC.stream = null;
}

window.tutupScanner = () => {
  stopScanner();
  SC.open = false;
  $id("scanOverlay")?.classList.remove("is-open");
  if (!qrDrawerOpen()) document.body.style.overflow = "";
};

function scanTick() {
  if (!SC.running) return;
  const run = async () => {
    if (!SC.running) return;
    if (!SC.busy && !document.hidden) {
      try {
        const raw = await SC.decode($id("scanVideo"));
        if (raw) await onQr(raw);
      } catch (e) {
        console.warn(e);
      }
    }
    SC.timer = setTimeout(run, 180);
  };
  run();
}

async function scanOutcome(tone, title, detail, meta, hold = 2400) {
  setScan(tone, title, detail);
  setScanMeta(meta || null);
  if (tone === "ok") navigator.vibrate?.(80);
  else if (tone === "error") navigator.vibrate?.([60, 60, 60]);
  await sleep(hold);
  if (!SC.running) return;
  setScanMeta(null);
  idlePrompt();
  SC.busy = false;
}

async function onQr(raw) {
  if (SC.busy) return;
  const now = Date.now();
  if (raw === SC.last && now - SC.lastAt < 4000) return;
  SC.last = raw;
  SC.lastAt = now;
  SC.busy = true;

  let p = null;
  try { p = JSON.parse(raw); } catch { /* bukan JSON */ }
  const uid = typeof p?.uid === "string" ? p.uid : "";
  const token = typeof p?.token === "string" ? p.token : "";
  const step = p?.step;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid) || !/^[a-f0-9]{32}$/.test(token) || !Number.isInteger(step)) {
    return scanOutcome("error", "QR tidak dikenali", "Format payload tidak valid.", null, 1800);
  }
  if (Math.abs(qrStep() - step) > 1) {
    return scanOutcome("error", "QR kedaluwarsa", "Minta anggota menampilkan QR Saya yang terbaru. Tangkapan layar tidak diterima.", null, 2800);
  }

  setScan("loading", "Memverifikasi QR");
  let u;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    u = snap.exists() ? { uid, ...snap.data() } : null;
  } catch (e) {
    return scanOutcome("error", "Data anggota tidak dapat dibaca", errText(e), null, 2600);
  }
  if (!u) return scanOutcome("error", "Akun tidak ditemukan", "", null, 2200);
  if (u.qrToken !== token) {
    return scanOutcome("error", "QR tidak valid", "Token tidak cocok. Minta anggota membuka ulang QR Saya.", null, 2600);
  }
  await catatHadir({ nama: accountName(u), uid }, "qr");
}

const norm = (v) => normalizeText(v).toLowerCase();

function resolvePerson(raw) {
  const q = norm(raw);
  if (!q) return { error: "Isi NIS/ID, nama, atau email." };

  const people = [];
  const linked = new Set();
  accountsCache.forEach((u) => {
    if (u.memberId) linked.add(u.memberId);
    const nama = accountName(u);
    people.push({ nama, uid: u.uid, keys: [u.nis, u.uid, u.email, nama].filter(Boolean).map(norm) });
  });
  membersCache.forEach((m) => {
    if (linked.has(m.id)) return;
    const nama = normalizeText(m.nama);
    if (people.some((x) => norm(x.nama) === norm(nama))) return;
    people.push({ nama, uid: null, keys: [m.nis, m.id, nama].filter(Boolean).map(norm) });
  });

  const exact = people.filter((x) => x.keys.includes(q));
  if (exact.length === 1) return { person: exact[0] };
  if (exact.length > 1) return { error: "Lebih dari satu hasil", detail: exact.slice(0, 4).map((x) => x.nama).join(", ") };

  if (q.length >= 3) {
    const partial = people.filter((x) => norm(x.nama).includes(q));
    if (partial.length === 1) return { person: partial[0] };
    if (partial.length > 1) return { error: "Lebih dari satu hasil", detail: partial.slice(0, 4).map((x) => x.nama).join(", ") };
  }
  return { error: "Anggota tidak ditemukan", detail: "Periksa NIS/ID, nama, atau email." };
}

window.catatManual = async (e) => {
  e.preventDefault();
  if (!SC.running || SC.busy) return;
  SC.busy = true;
  setScan("loading", "Mencari anggota");
  if (!accountsLoaded) await window.loadAccounts();
  const r = resolvePerson($id("manualQuery")?.value || "");
  if (r.error) return scanOutcome("error", r.error, r.detail || "", null, 2600);
  await catatHadir(r.person, "manual");
};

async function catatHadir(person, source) {
  const { tanggal, detailSesi } = currentSession();
  const nama = normalizeText(person.nama);
  const clearInput = () => { if (source === "manual" && $id("manualQuery")) $id("manualQuery").value = ""; };
  if (!detailSesi) return scanOutcome("error", "Sesi belum dipilih", "Pilih sesi atau isi kategori sesi baru.", null, 2400);

  const key = `${tanggal}|${norm(detailSesi)}|${norm(nama)}`;
  const existing = cache.find(
    (x) => x.tanggal === tanggal && norm(x.detailSesi) === norm(detailSesi) && norm(x.nama) === norm(nama)
  );
  if (existing || SC.done.has(key)) {
    SC.done.add(key);
    clearInput();
    return scanOutcome("warn", `Sudah tercatat: ${nama}`, `Status ${existing?.status || "Hadir"} pada sesi ini`, { nama, time: "-" });
  }

  const id = `scan_${tanggal}_${slug(detailSesi)}_${person.uid || slug(nama)}`;
  const payload = {
    nama, detailSesi, tanggal, status: "Hadir", source,
    ...(person.uid ? { uid: person.uid } : {}),
    createdAt: serverTimestamp()
  };
  const meta = { nama, time: clockStr() };
  setScan("loading", "Menyimpan kehadiran");
  try {
    await withTimeout(setDoc(doc(db, "absensi", id), payload), 9000);
    SC.done.add(key);
    SC.count++;
    updateScanCount();
    clearInput();
    return scanOutcome("ok", `Hadir: ${nama}`, detailSesi, meta);
  } catch (e) {
    if (e.code === "timeout") {
      SC.done.add(key);
      SC.count++;
      updateScanCount();
      clearInput();
      return scanOutcome("warn", `Menunggu jaringan: ${nama}`, "Data dikirim otomatis saat tersambung. Jangan tutup halaman.", meta, 3200);
    }
    console.error(e);
    return scanOutcome("error", "Gagal menyimpan", errText(e), null, 3000);
  }
}
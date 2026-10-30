import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

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

// Logout Function
window.logoutPortal = async () => {
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
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) throw new Error("ROLE_MISSING");

    role = snap.data().role;
    if (!["admin", "member"].includes(role)) throw new Error("ROLE_INVALID");

    localStorage.setItem("role", role);
    document.body.dataset.role = role;

    if (role === "member") {
      document.querySelector(".admin-drawer")?.remove();
      document.querySelectorAll(".admin-only-btn").forEach((el) => el.remove());
      setText("roleLabel", "MEMBER / READ ONLY");
    } else {
      setText("roleLabel", "ADMINISTRATOR");
    }

    startLiveClock();
    boot();
  } catch (err) {
    console.error(err);
    await signOut(auth).catch(() => {});
    localStorage.removeItem("role");
    location.href = "login.html";
  }
});

function boot() {
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const filterBulan = document.getElementById("filterBulan");
  if (filterBulan) filterBulan.value = month;

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
  });

  const q = query(collection(db, "absensi"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderMeetingCards();
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
  const inputPass = document.getElementById("inputPasswordAdmin");
  if (labelTanggal) labelTanggal.textContent = tanggal;
  if (inputPass) inputPass.value = "";

  const modal = document.getElementById("passwordModal");
  if (modal) {
    modal.style.display = "flex";
    if (inputPass) inputPass.focus();
  }
};

window.tutupModalPassword = () => {
  const modal = document.getElementById("passwordModal");
  if (modal) modal.style.display = "none";
  pendingDeleteTanggal = null;
};

window.eksekusiHapusSesi = async () => {
  const inputPass = document.getElementById("inputPasswordAdmin");
  const passwordAdmin = inputPass ? inputPass.value.trim() : "";
  const tanggal = pendingDeleteTanggal;

  if (!passwordAdmin) {
    alert("Password tidak boleh kosong!");
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    alert("Sesi login tidak valid. Silakan login ulang.");
    return;
  }

  const btnHapus = document.getElementById("btnKonfirmasiHapus");
  if (btnHapus) {
    btnHapus.disabled = true;
    btnHapus.textContent = "Memproses...";
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, passwordAdmin);
    await reauthenticateWithCredential(currentUser, credential);

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
    console.error("Autentikasi Gagal:", err);
    if (window.toast) window.toast("Password admin salah! Penghapusan dibatalkan.", "error");
    else alert("Password admin salah. Aksi hapus dibatalkan.");
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
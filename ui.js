// ui.js — Toast system & custom confirm modal (menggantikan alert & confirm native)
(() => {
  const getStack = () => {
    let s = document.getElementById("toastStack");
    if (!s && document.body) {
      s = document.createElement("div");
      s.id = "toastStack";
      document.body.appendChild(s);
    }
    return s;
  };

  window.toast = (msg, type = "info", ms = 3800) => {
    const stack = getStack();
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const icon = type === "error" ? "⚠" : type === "success" ? "✓" : "ℹ";
    el.innerHTML = `<span class="icon">${icon}</span><span class="msg"></span>`;
    el.querySelector(".msg").textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, ms);
  };

  window.confirmModal = (title, desc) =>
    new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-overlay";
      overlay.innerHTML = `
      <div class="confirm-box">
        <h3></h3><p></p>
        <div class="confirm-actions">
          <button class="confirm-cancel" type="button">Batal</button>
          <button class="confirm-danger" type="button">Ya, Hapus</button>
        </div>
      </div>`;
      overlay.querySelector("h3").textContent = title;
      overlay.querySelector("p").textContent = desc;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("active"));

      const close = (result) => {
        overlay.classList.remove("active");
        overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
        resolve(result);
      };

      overlay.querySelector(".confirm-cancel").onclick = () => close(false);
      overlay.querySelector(".confirm-danger").onclick = () => close(true);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(false);
      });
    });

  window.animateCount = (id, target) => {
    const el = document.getElementById(id);
    if (!el) return;
    const from = Number(el.textContent) || 0;
    if (from === target) return;
    const dur = 500,
      start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
})();
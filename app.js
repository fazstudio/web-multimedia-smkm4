(() => {
  // 1. Mobile Navigation Drawer
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  const backdrop = document.getElementById("navBackdrop");

  if (toggle && links && backdrop) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      links.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-active", open);
      document.body.classList.toggle("mobile-menu-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    backdrop.addEventListener("click", () => setOpen(false));
    links.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => setOpen(false));
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    window.matchMedia("(min-width: 769px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  // 3. Showreel Theater Video Modal
  const showreelModal = document.getElementById("showreelModal");
  const showreelClose = document.getElementById("showreelClose");
  const showreelIframe = document.getElementById("showreelIframe");
  const btnHeroShowreel = document.getElementById("btnHeroShowreel");
  const defaultShowreelUrl = "https://www.youtube.com/embed/vdVxMLUVvTo?autoplay=1";

  const openShowreel = () => {
    if (!showreelModal || !showreelIframe) return;
    showreelIframe.src = defaultShowreelUrl;
    showreelModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeShowreel = () => {
    if (!showreelModal || !showreelIframe) return;
    showreelModal.classList.remove("active");
    showreelIframe.src = "";
    document.body.style.overflow = "";
  };

  if (btnHeroShowreel) {
    btnHeroShowreel.addEventListener("click", openShowreel);
  }
  if (showreelClose) {
    showreelClose.addEventListener("click", closeShowreel);
  }
  if (showreelModal) {
    showreelModal.addEventListener("click", (e) => {
      if (e.target === showreelModal) closeShowreel();
    });
  }

  // 4. Photo Lightbox Modal
  const photoModal = document.getElementById("photoModal");
  const modalClose = document.getElementById("modalClose");
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalCategory = document.getElementById("modalCategory");
  const modalLink = document.getElementById("modalLink");

  const closePhotoModal = () => {
    if (!photoModal) return;
    photoModal.classList.remove("active");
    document.body.style.overflow = "";
  };

  document.querySelectorAll(".gallery-item").forEach(item => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      const title = item.querySelector("h4");
      const desc = item.querySelector("p");
      const cat = item.querySelector(".category-badge");
      const gdrive = item.dataset.gdrive || "#";

      if (modalImg && img) modalImg.src = img.currentSrc || img.src;
      if (modalTitle && title) modalTitle.textContent = title.textContent;
      if (modalDesc && desc) modalDesc.textContent = desc.textContent;
      if (modalCategory && cat) modalCategory.textContent = cat.textContent;
      if (modalLink) modalLink.href = gdrive;

      if (photoModal) {
        photoModal.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    });
  });

  if (modalClose) modalClose.addEventListener("click", closePhotoModal);
  if (photoModal) {
    photoModal.addEventListener("click", (e) => {
      if (e.target === photoModal) closePhotoModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeShowreel();
      closePhotoModal();
    }
  });

  // 5. Gallery Category Filter
  const filterButtons = document.querySelectorAll(".filter-chip");
  const galleryItems = document.querySelectorAll(".gallery-item");

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;

      galleryItems.forEach(item => {
        const itemCat = item.dataset.category;
        if (filter === "all" || itemCat === filter) {
          item.style.display = "flex";
          requestAnimationFrame(() => {
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
          });
        } else {
          item.style.opacity = "0";
          item.style.transform = "translateY(12px)";
          setTimeout(() => {
            if (!item.classList.contains("active")) {
              item.style.display = "none";
            }
          }, 250);
        }
      });
    });
  });
})();

// Auto Playlist Background Mixed (Video & Image Crossfade)
(() => {
  const container = document.getElementById("heroBackgroundContainer");
  if (!container) return;

  const playlist = ["bg.mp4", "hero.webp", "bg2.mp4", "bg3.mp4", "bg4.mp4"];
  const desktop = matchMedia("(min-width: 992px)");
  const PHOTO_DURATION = 5000;

  let currentIndex = 0;
  let timer = null;

  const isImage = (src) => /\.(webp|jpg|jpeg|png)$/i.test(src);

  const renderMedia = (src, isActive) => {
    if (isImage(src)) {
      return `<img src="${src}" class="hero-bg-media ${isActive ? "is-active" : ""}" alt="Hero Background">`;
    } else {
      return `<video src="${src}" class="hero-bg-media ${isActive ? "is-active" : ""}" autoplay muted playsinline></video>`;
    }
  };

  const scheduleNext = (mediaEl, src) => {
    clearTimeout(timer);
    if (isImage(src)) {
      timer = setTimeout(nextSlide, PHOTO_DURATION);
    } else {
      mediaEl.addEventListener("ended", nextSlide, { once: true });
      mediaEl.addEventListener("error", nextSlide, { once: true });
    }
  };

  const nextSlide = () => {
    if (!desktop.matches) return;
    currentIndex = (currentIndex + 1) % playlist.length;

    const nextSrc = playlist[currentIndex];
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderMedia(nextSrc, false);
    const newMedia = tempDiv.firstElementChild;

    container.appendChild(newMedia);

    setTimeout(() => {
      newMedia.classList.add("is-active");
    }, 50);

    const oldMedias = container.querySelectorAll(".hero-bg-media");
    if (oldMedias.length > 2) {
      setTimeout(() => {
        oldMedias[0].remove();
      }, 1200);
    }

    scheduleNext(newMedia, nextSrc);
  };

  const startPlaylist = () => {
    if (container.children.length > 0) return;

    container.innerHTML = renderMedia(playlist[0], true);
    const firstMedia = container.firstElementChild;

    scheduleNext(firstMedia, playlist[0]);
  };

  const sync = () => {
    if (desktop.matches) {
      startPlaylist();
    } else {
      clearTimeout(timer);
      container.innerHTML = "";
    }
  };

  desktop.addEventListener("change", sync);
  sync();
})();   
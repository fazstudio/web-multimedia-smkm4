const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

  // Reveal on scroll: lightweight IntersectionObserver.
  const reveal = document.querySelectorAll("[data-reveal]");
  if (reduce) reveal.forEach(el => el.classList.add("is-revealed"));
  else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    }, {threshold:.12, rootMargin:"0px 0px -45px 0px"});
    reveal.forEach((el,i) => { el.style.setProperty("--reveal-delay", `${Math.min(i%5,4)*.07}s`); io.observe(el); });
  } else reveal.forEach(el => el.classList.add("is-revealed"));

  // Spotlight glow.
  document.querySelectorAll(".glow-surface").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX-r.left}px`);
      el.style.setProperty("--my", `${e.clientY-r.top}px`);
    }, {passive:true});
  });

  // Magnetic buttons.
  if (fine && !reduce) document.querySelectorAll("[data-magnetic]").forEach(el => {
    const strength = Number(el.dataset.magneticStrength || 10);
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mgx", `${((e.clientX-r.left)/r.width-.5)*strength}px`);
      el.style.setProperty("--mgy", `${((e.clientY-r.top)/r.height-.5)*strength}px`);
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--mgx","0px"); el.style.setProperty("--mgy","0px"); });
  });

  // Sticky nav shadow.
  const nav = document.getElementById("mainNav");
  if (nav) {
    const update = () => nav.classList.toggle("is-scrolled", scrollY > 14);
    update(); addEventListener("scroll", update, {passive:true});
  }

  // Ambient pointer parallax.
  if (!reduce) {
    const els=[...document.querySelectorAll("[data-parallax]")];
    let raf=0, px=0, py=0;
    addEventListener("pointermove",e=>{px=e.clientX;py=e.clientY;if(raf)return;raf=requestAnimationFrame(()=>{
      raf=0;const cx=innerWidth/2,cy=innerHeight/2,dx=(px-cx)/cx,dy=(py-cy)/cy;
      els.forEach(el=>{const d=Number(el.dataset.parallax)||20;el.style.transform=`translate3d(${dx*d}px,${dy*d}px,0)`});
    })},{passive:true});
  }
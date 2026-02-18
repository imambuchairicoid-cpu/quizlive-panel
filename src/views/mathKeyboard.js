/**
 * mathKeyboard.js
 * Keyboard simbol matematika untuk panel guru QuizLive.
 *
 * Export:
 *   initMathKeyboard()  → panggil sekali setelah dashboard di-render
 *   attachKeyboard(el)  → attach manual ke satu textarea/input tertentu
 */

// ─── Kategori & Simbol ───────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Fungsi",
    icon: "f(x)",
    symbols: [
      { disp: "f(x)",    val: "f(x)" },
      { disp: "f(n)",    val: "f(n)" },
      { disp: "g(x)",    val: "g(x)" },
      { disp: "f:A→B",   val: "f : A → B" },
      { disp: "→",       val: " → " },
      { disp: "↦",       val: " ↦ " },
      { disp: "∘",       val: " ∘ " },
      { disp: "f⁻¹",     val: "f⁻¹" },
      { disp: "f(a)=b",  val: "f(a) = b" },
      { disp: "y=f(x)",  val: "y = f(x)" },
    ],
  },
  {
    label: "Himpunan",
    icon: "∈",
    symbols: [
      { disp: "∈",    val: " ∈ " },
      { disp: "∉",    val: " ∉ " },
      { disp: "⊂",    val: " ⊂ " },
      { disp: "⊄",    val: " ⊄ " },
      { disp: "⊆",    val: " ⊆ " },
      { disp: "⊇",    val: " ⊇ " },
      { disp: "∪",    val: " ∪ " },
      { disp: "∩",    val: " ∩ " },
      { disp: "∅",    val: "∅" },
      { disp: "{}",   val: "{}" },
      { disp: "A'",   val: "A'" },
      { disp: "n(A)", val: "n(A)" },
    ],
  },
  {
    label: "Relasi",
    icon: "↔",
    symbols: [
      { disp: "(a,b)",   val: "(a, b)" },
      { disp: "A×B",     val: "A × B" },
      { disp: "↔",       val: " ↔ " },
      { disp: "⇔",       val: " ⇔ " },
      { disp: "⇒",       val: " ⇒ " },
      { disp: "∴",       val: " ∴ " },
      { disp: "∵",       val: " ∵ " },
      { disp: "n!",      val: "n!" },
      { disp: "{(a,b)}", val: "{(a, b)}" },
    ],
  },
  {
    label: "Eksponen",
    icon: "x²",
    symbols: [
      { disp: "x²",  val: "x²" },
      { disp: "x³",  val: "x³" },
      { disp: "xⁿ",  val: "xⁿ" },
      { disp: "2²",  val: "2²" },
      { disp: "2³",  val: "2³" },
      { disp: "√x",  val: "√x" },
      { disp: "∛x",  val: "∛x" },
      { disp: "∜x",  val: "∜x" },
      { disp: "√4",  val: "√4" },
      { disp: "√9",  val: "√9" },
      { disp: "½",   val: "½" },
      { disp: "¼",   val: "¼" },
      { disp: "¾",   val: "¾" },
      { disp: "⅓",   val: "⅓" },
      { disp: "⅔",   val: "⅔" },
    ],
  },
  {
    label: "Operator",
    icon: "≠",
    symbols: [
      { disp: "=",  val: " = " },
      { disp: "≠",  val: " ≠ " },
      { disp: "<",  val: " < " },
      { disp: ">",  val: " > " },
      { disp: "≤",  val: " ≤ " },
      { disp: "≥",  val: " ≥ " },
      { disp: "+",  val: " + " },
      { disp: "−",  val: " − " },
      { disp: "×",  val: " × " },
      { disp: "÷",  val: " ÷ " },
      { disp: "·",  val: " · " },
      { disp: "±",  val: " ± " },
      { disp: "%",  val: "%" },
    ],
  },
  {
    label: "Lainnya",
    icon: "π",
    symbols: [
      { disp: "π",  val: "π" },
      { disp: "∞",  val: "∞" },
      { disp: "°",  val: "°" },
      { disp: "α",  val: "α" },
      { disp: "β",  val: "β" },
      { disp: "θ",  val: "θ" },
      { disp: "Δ",  val: "Δ" },
      { disp: "Σ",  val: "Σ" },
      { disp: "∏",  val: "∏" },
      { disp: "≈",  val: " ≈ " },
      { disp: "~",  val: " ~ " },
      { disp: "…",  val: "…" },
    ],
  },
];

// ─── State ───────────────────────────────────────────────────────────────────

let activeInput = null;   // textarea/input yang sedang fokus
let activeTab   = 0;      // index kategori aktif
let keyboardEl  = null;   // elemen DOM keyboard
let isMouseInKb = false;  // mencegah keyboard tutup saat klik tombol simbol

// ─── Insert simbol ke posisi kursor ──────────────────────────────────────────

function insertAtCursor(el, text) {
  if (!el) return;
  const start  = el.selectionStart ?? el.value.length;
  const end    = el.selectionEnd   ?? el.value.length;
  const before = el.value.slice(0, start);
  const after  = el.value.slice(end);
  el.value     = before + text + after;
  const pos    = start + text.length;
  el.setSelectionRange(pos, pos);
  el.focus();
  // trigger supaya listener lain tahu value berubah
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ─── Render ulang isi keyboard ───────────────────────────────────────────────

function renderKeyboard() {
  if (!keyboardEl) return;
  const cat = CATEGORIES[activeTab];

  keyboardEl.innerHTML = `
    <div class="mk-header">
      <span class="mk-title">⌨ Simbol Matematika</span>
      <button class="mk-close" title="Tutup">✕</button>
    </div>
    <div class="mk-tabs">
      ${CATEGORIES.map((c, i) => `
        <button class="mk-tab ${i === activeTab ? "mk-tab-active" : ""}" data-idx="${i}">
          <span class="mk-tab-icon">${c.icon}</span>
          <span class="mk-tab-label">${c.label}</span>
        </button>
      `).join("")}
    </div>
    <div class="mk-grid">
      ${cat.symbols.map(s => `
        <button class="mk-sym" data-val="${encodeURIComponent(s.val)}" title="${s.val.trim()}">
          ${s.disp}
        </button>
      `).join("")}
    </div>
    <div class="mk-footer">
      <span class="mk-hint">💡 Klik simbol untuk menyisipkan ke posisi kursor</span>
    </div>
  `;

  // Tab click
  keyboardEl.querySelectorAll(".mk-tab").forEach(btn => {
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      activeTab = parseInt(btn.dataset.idx);
      renderKeyboard();
    });
  });

  // Symbol click
  keyboardEl.querySelectorAll(".mk-sym").forEach(btn => {
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      insertAtCursor(activeInput, decodeURIComponent(btn.dataset.val));
      btn.classList.add("mk-sym-flash");
      setTimeout(() => btn.classList.remove("mk-sym-flash"), 200);
    });
  });

  // Close
  keyboardEl.querySelector(".mk-close").addEventListener("mousedown", e => {
    e.preventDefault();
    hideKeyboard();
  });
}

// ─── Posisikan keyboard di bawah elemen aktif ────────────────────────────────

function positionKeyboard(el) {
  if (!keyboardEl || !el) return;
  const rect  = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  let top  = rect.bottom + scrollY + 8;
  let left = rect.left   + scrollX;

  const kbWidth  = 480;
  const kbHeight = 270;

  // Jangan keluar layar kanan
  if (left + kbWidth > window.innerWidth + scrollX - 12) {
    left = window.innerWidth + scrollX - kbWidth - 12;
  }
  if (left < 8) left = 8;

  // Jangan keluar layar bawah → tampil di atas input
  if (top + kbHeight > window.innerHeight + scrollY) {
    top = rect.top + scrollY - kbHeight - 8;
  }

  keyboardEl.style.top  = top  + "px";
  keyboardEl.style.left = left + "px";
}

// ─── Show / Hide ─────────────────────────────────────────────────────────────

function showKeyboard(el) {
  activeInput = el;
  if (!keyboardEl) createKeyboardEl();
  renderKeyboard();
  positionKeyboard(el);
  keyboardEl.classList.add("mk-visible");
}

function hideKeyboard() {
  if (!keyboardEl) return;
  keyboardEl.classList.remove("mk-visible");
  activeInput = null;
}

// ─── Buat elemen keyboard (sekali saja) ──────────────────────────────────────

function createKeyboardEl() {
  // Inject CSS
  if (!document.getElementById("mk-style")) {
    const style = document.createElement("style");
    style.id    = "mk-style";
    style.textContent = MK_CSS;
    document.head.appendChild(style);
  }

  keyboardEl = document.createElement("div");
  keyboardEl.className   = "mk-keyboard";
  keyboardEl.setAttribute("aria-label", "Keyboard Simbol Matematika");
  keyboardEl.setAttribute("role", "dialog");

  keyboardEl.addEventListener("mouseenter", () => { isMouseInKb = true;  });
  keyboardEl.addEventListener("mouseleave", () => { isMouseInKb = false; });

  document.body.appendChild(keyboardEl);

  // Tutup jika klik di luar keyboard
  document.addEventListener("mousedown", e => {
    if (keyboardEl && !keyboardEl.contains(e.target) && e.target !== activeInput) {
      hideKeyboard();
    }
  });

  // Reposisi saat scroll / resize
  window.addEventListener("scroll", () => {
    if (activeInput && keyboardEl.classList.contains("mk-visible")) {
      positionKeyboard(activeInput);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (activeInput && keyboardEl.classList.contains("mk-visible")) {
      positionKeyboard(activeInput);
    }
  });
}

// ─── Public: attach ke satu elemen ───────────────────────────────────────────

export function attachKeyboard(el) {
  if (!el || el.dataset.mkAttached) return;
  el.dataset.mkAttached = "1";

  el.addEventListener("focus", () => showKeyboard(el));

  el.addEventListener("blur", () => {
    // Tunda 150ms supaya klik tombol keyboard sempat diproses dulu
    setTimeout(() => {
      if (!isMouseInKb) hideKeyboard();
    }, 150);
  });
}

// ─── Public: init otomatis ke seluruh dashboard ───────────────────────────────

export function initMathKeyboard() {
  // Attach ke semua input/textarea yang sudah ada
  document
    .querySelectorAll("textarea, input[type='text'], input:not([type])")
    .forEach(attachKeyboard);

  // Observer: attach ke elemen yang muncul belakangan (dynamic render)
  const observer = new MutationObserver(() => {
    document
      .querySelectorAll("textarea, input[type='text'], input:not([type])")
      .forEach(attachKeyboard);
  });

  observer.observe(document.getElementById("app") || document.body, {
    childList: true,
    subtree:   true,
  });
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const MK_CSS = `
/* ── Keyboard container ── */
.mk-keyboard {
  position: absolute;
  z-index: 9999;
  width: 480px;
  background: #FFFFFF;
  border: 1.5px solid rgba(0,0,0,.11);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.14), 0 4px 16px rgba(0,0,0,.08);
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  overflow: hidden;
  user-select: none;
}
.mk-keyboard.mk-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* ── Header ── */
.mk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  background: #F7FAFC;
  border-bottom: 1.5px solid rgba(0,0,0,.07);
}
.mk-title {
  font-size: 12px;
  font-weight: 700;
  color: #5A7185;
  letter-spacing: .3px;
}
.mk-close {
  border: none;
  background: transparent;
  color: #A0B0BC;
  cursor: pointer;
  font-size: 13px;
  padding: 3px 7px;
  border-radius: 8px;
  line-height: 1;
  transition: background .12s, color .12s;
}
.mk-close:hover {
  background: rgba(0,0,0,.07);
  color: #1A2B3C;
}

/* ── Tabs ── */
.mk-tabs {
  display: flex;
  gap: 3px;
  padding: 8px 10px 0;
  background: #F7FAFC;
  border-bottom: 1.5px solid rgba(0,0,0,.07);
  overflow-x: auto;
  scrollbar-width: none;
}
.mk-tabs::-webkit-scrollbar { display: none; }

.mk-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 1.5px solid transparent;
  border-bottom: none;
  background: transparent;
  color: #5A7185;
  padding: 5px 11px 7px;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  transition: background .12s, color .12s;
  position: relative;
  bottom: -1.5px;
}
.mk-tab:hover {
  background: rgba(0,168,150,.07);
  color: #00A896;
}
.mk-tab-active {
  background: #FFFFFF;
  color: #00A896;
  border-color: rgba(0,0,0,.09);
  border-bottom-color: #FFFFFF;
}
.mk-tab-icon {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.mk-tab-label {
  font-size: 10px;
  opacity: .8;
}

/* ── Symbol grid ── */
.mk-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px 12px 8px;
  background: #FFFFFF;
  min-height: 96px;
  max-height: 160px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.12) transparent;
}
.mk-grid::-webkit-scrollbar { width: 4px; }
.mk-grid::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.12);
  border-radius: 4px;
}

.mk-sym {
  min-width: 50px;
  height: 40px;
  padding: 0 10px;
  border: 1.5px solid rgba(0,0,0,.10);
  border-radius: 10px;
  background: #F7FAFC;
  color: #1A2B3C;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background .12s, border-color .12s, transform .08s, box-shadow .12s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', 'Segoe UI Symbol', system-ui, sans-serif;
}
.mk-sym:hover {
  background: #E0F5F2;
  border-color: rgba(0,168,150,.45);
  color: #007A6E;
  box-shadow: 0 2px 8px rgba(0,168,150,.15);
  transform: translateY(-1px);
}
.mk-sym:active,
.mk-sym-flash {
  background: #B2EBE0;
  border-color: rgba(0,168,150,.65);
  transform: scale(0.92);
  box-shadow: none;
}

/* ── Footer ── */
.mk-footer {
  padding: 6px 14px 8px;
  border-top: 1.5px solid rgba(0,0,0,.06);
  background: #F7FAFC;
}
.mk-hint {
  font-size: 11px;
  color: #A0B0BC;
}

/* ── Responsive ── */
@media (max-width: 520px) {
  .mk-keyboard { width: calc(100vw - 20px); }
}
`;

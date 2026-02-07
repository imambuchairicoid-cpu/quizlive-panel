import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  increment
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { render, qs } from "../components/ui";
import { toast } from "../components/toast";

let unsubMateriList = null;
let unsubMateriDoc = null;
let unsubSections = null;

let selectedMateriId = null;

// cache list materi untuk search client-side
let materiCache = [];

export function showDashboard(role) {
  render(`
    <div class="dash">
      <div id="overlay" class="overlay"></div>

      <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
          <div class="brand">
            <div class="brand-title">QuizLive Panel</div>
            <div class="brand-sub muted small">Kelola Materi</div>
          </div>
          <button id="btnCloseSidebar" class="icon-btn only-mobile" title="Tutup">✕</button>
        </div>

        <div class="userbox">
          <div class="userline">
            <div class="chip">👤</div>
            <div class="usertext">
              <div class="useremail">${escapeHtml(auth.currentUser?.email || "")}</div>
              <div class="muted small">Role: <b>${escapeHtml(role || "-")}</b></div>
            </div>
          </div>

          <button id="btnLogout" class="btn ghost full">Logout</button>
        </div>

        <div class="sidecard">
          <button id="btnNewMateri" class="btn primary full">+ Materi Baru</button>

          <div class="search">
            <span class="search-ic">⌕</span>
            <input id="materiSearch" class="search-in" placeholder="Cari materi..." />
          </div>

          <div id="materiList" class="materi-list"></div>

          <div id="materiEmpty" class="empty muted small hidden">
            Belum ada materi. Klik <b>Materi Baru</b> untuk mulai.
          </div>
        </div>

        <div class="sidefoot muted small">
          <span>Firestore • Realtime</span>
          <span class="dot">•</span>
          <span>QuizLive</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <button id="btnOpenSidebar" class="icon-btn only-mobile" title="Menu">☰</button>

          <div class="topbar-title">
            <div class="topbar-h" id="currentMateriTitle">Detail Materi</div>
            <div class="muted small" id="currentMateriMeta">Pilih materi di kiri atau buat materi baru</div>
          </div>

          <div class="topbar-actions">
            <span id="currentBadge" class="pill hidden">draft</span>
          </div>
        </header>

        <div class="grid-main">
          <div class="card">
            <div class="card-head">
              <h2>Detail Materi</h2>
              <p class="muted small" id="hintSelect">Pilih materi di kiri atau buat materi baru.</p>
            </div>

            <div id="materiFormWrap" class="hidden">
              <div class="grid2">
                <div>
                  <label>Judul</label>
                  <input id="mJudul" />
                </div>
                <div>
                  <label>Kelas</label>
                  <input id="mKelas" placeholder="VIII" />
                </div>
                <div>
                  <label>Bab</label>
                  <input id="mBab" placeholder="Pola Bilangan" />
                </div>
                <div>
                  <label>Estimasi (menit)</label>
                  <input id="mEstimasi" type="number" min="1" />
                </div>
                <div>
                  <label>Urutan</label>
                  <input id="mUrutan" type="number" />
                </div>

                <div class="row" style="justify-content:flex-start;">
                  <label class="switch">
                    <input id="mPublish" type="checkbox" />
                    <span class="slider"></span>
                    <span class="switch-text">Publish</span>
                  </label>
                </div>
              </div>

              <label>Deskripsi</label>
              <textarea id="mDesc" rows="3"></textarea>

              <!-- ✅ tombol reset ditaruh sebelah simpan -->
              <div class="row gap" style="justify-content:flex-start; margin-top:12px;">
                <button id="btnSaveMateri" class="btn primary">Simpan</button>
                <button id="btnResetProgress" class="btn">Reset Progress</button>
                <button id="btnDeleteMateri" class="btn danger">Hapus</button>
              </div>

              <div class="muted small" style="margin-top:10px;">
                Reset Progress akan membuat semua siswa mulai ulang untuk materi ini.
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h2>Sections</h2>
              <p class="muted small">Section = Text atau Quiz (cek pemahaman)</p>
            </div>

            <div id="sectionWrap" class="hidden">
              <div class="row gap" style="justify-content:flex-start;">
                <button id="btnAddText" class="btn">+ Section Text</button>
                <button id="btnAddQuiz" class="btn">+ Section Quiz</button>
              </div>

              <div id="sectionsList" class="sections-list"></div>

              <div id="sectionsEmpty" class="empty muted small hidden" style="margin-top:10px;">
                Belum ada section. Tambahkan Section Text atau Quiz.
              </div>
            </div>

            <div id="sectionEmpty" class="muted small">Pilih materi dulu.</div>
          </div>
        </div>
      </main>
    </div>
  `);

  // ===== Mobile sidebar toggle
  const overlay = qs("#overlay");
  const openBtn = qs("#btnOpenSidebar");
  const closeBtn = qs("#btnCloseSidebar");

  function openSidebar() {
    document.body.classList.add("sb-open");
  }
  function closeSidebar() {
    document.body.classList.remove("sb-open");
  }

  if (openBtn) openBtn.onclick = openSidebar;
  if (closeBtn) closeBtn.onclick = closeSidebar;
  if (overlay) overlay.onclick = closeSidebar;

  // ===== Logout
  qs("#btnLogout").onclick = async () => {
    await signOut(auth);
  };

  // ===== New materi
  qs("#btnNewMateri").onclick = async () => {
    try {
      const ref = await addDoc(collection(db, "materi"), {
        judul: "Materi Baru",
        kelas: "VIII",
        bab: "Pola Bilangan",
        deskripsi: "",
        estimasiMenit: 10,
        urutan: 0,
        publish: false,
        // ✅ resetVersion default (opsional). kalau tidak ada juga aman, tapi ini bikin rapi.
        resetVersion: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast("Materi dibuat");
      selectMateri(ref.id);
      closeSidebar();
    } catch (e) {
      toast("Gagal buat materi: " + (e?.message || "unknown"));
    }
  };

  // ===== Search materi
  qs("#materiSearch").addEventListener("input", () => renderMateriList());

  listenMateriList();
}

function listenMateriList() {
  if (unsubMateriList) unsubMateriList();

  const q = query(collection(db, "materi"), orderBy("urutan", "asc"));
  unsubMateriList = onSnapshot(q, (snap) => {
    materiCache = [];
    snap.forEach((d) => materiCache.push({ id: d.id, data: d.data() }));
    renderMateriList();
  });
}

function renderMateriList() {
  const list = qs("#materiList");
  const empty = qs("#materiEmpty");
  const kw = (qs("#materiSearch").value || "").trim().toLowerCase();

  list.innerHTML = "";

  const filtered = materiCache.filter((x) => {
    if (!kw) return true;
    const m = x.data || {};
    const hay = `${m.judul || ""} ${m.kelas || ""} ${m.bab || ""}`.toLowerCase();
    return hay.includes(kw);
  });

  empty.classList.toggle("hidden", filtered.length > 0);

  filtered.forEach(({ id, data: m }) => {
    const active = id === selectedMateriId ? "active" : "";
    const publish = !!m.publish;

    const badge = publish
      ? `<span class="badge ok">publish</span>`
      : `<span class="badge">draft</span>`;

    const metaLeft = `${escapeHtml(m.kelas || "-")} • ${escapeHtml(m.bab || "-")}`;
    const metaRight = `${escapeHtml(String(m.urutan ?? 0))} • ${escapeHtml(String(m.estimasiMenit ?? 10))}m`;

    const item = document.createElement("button");
    item.type = "button";
    item.className = `list-item ${active}`;
    item.innerHTML = `
      <div class="li-main">
        <div class="li-title">${escapeHtml(m.judul || "Tanpa Judul")}</div>
        <div class="li-sub">
          <span>${metaLeft}</span>
          <span class="li-sep">•</span>
          <span>${metaRight}</span>
        </div>
      </div>
      ${badge}
    `;

    item.onclick = () => {
      selectMateri(id);
      document.body.classList.remove("sb-open");
    };

    list.appendChild(item);
  });
}

function setDetailVisible(visible) {
  qs("#hintSelect").classList.toggle("hidden", visible);
  qs("#materiFormWrap").classList.toggle("hidden", !visible);
  qs("#sectionWrap").classList.toggle("hidden", !visible);
  qs("#sectionEmpty").classList.toggle("hidden", visible);
}

function setTopbarInfo({ judul, kelas, bab, publish }) {
  qs("#currentMateriTitle").textContent = judul ? judul : "Detail Materi";
  qs("#currentMateriMeta").textContent =
    kelas || bab ? `${kelas || "-"} • ${bab || "-"}` : "Pilih materi di kiri atau buat materi baru";

  const pill = qs("#currentBadge");
  if (judul) {
    pill.classList.remove("hidden");
    pill.textContent = publish ? "publish" : "draft";
    pill.classList.toggle("ok", !!publish);
  } else {
    pill.classList.add("hidden");
  }
}

function selectMateri(materiId) {
  selectedMateriId = materiId;
  setDetailVisible(true);

  // refresh active marker list
  renderMateriList();

  if (unsubMateriDoc) unsubMateriDoc();
  if (unsubSections) unsubSections();

  const materiRef = doc(db, "materi", materiId);

  unsubMateriDoc = onSnapshot(materiRef, (snap) => {
    if (!snap.exists()) return;
    const m = snap.data();

    qs("#mJudul").value = m.judul || "";
    qs("#mKelas").value = m.kelas || "";
    qs("#mBab").value = m.bab || "";
    qs("#mEstimasi").value = String(m.estimasiMenit ?? 10);
    qs("#mUrutan").value = String(m.urutan ?? 0);
    qs("#mPublish").checked = !!m.publish;
    qs("#mDesc").value = m.deskripsi || "";

    setTopbarInfo({
      judul: m.judul || "Materi",
      kelas: m.kelas || "-",
      bab: m.bab || "-",
      publish: !!m.publish
    });
  });

  qs("#btnSaveMateri").onclick = async () => {
    try {
      await setDoc(
        materiRef,
        {
          judul: qs("#mJudul").value.trim(),
          kelas: qs("#mKelas").value.trim(),
          bab: qs("#mBab").value.trim(),
          deskripsi: qs("#mDesc").value.trim(),
          estimasiMenit: parseInt(qs("#mEstimasi").value || "10", 10),
          urutan: parseInt(qs("#mUrutan").value || "0", 10),
          publish: qs("#mPublish").checked,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      toast("Materi disimpan");
    } catch (e) {
      toast("Gagal simpan: " + (e?.message || "unknown"));
    }
  };

  // ✅ RESET PROGRESS: increment resetVersion
  qs("#btnResetProgress").onclick = async () => {
    if (!selectedMateriId) {
      toast("Pilih materi dulu");
      return;
    }

    const ok = confirm(
      "Reset progress siswa untuk materi ini?\n\n" +
      "Efek:\n" +
      "- Semua siswa dianggap mulai dari 0%\n" +
      "- Jawaban tersimpan versi lama tidak dipakai lagi\n\n" +
      "Lanjut reset?"
    );
    if (!ok) return;

    try {
      await setDoc(
        materiRef,
        {
         resetVersion: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      toast("✅ Progress siswa berhasil direset");
    } catch (e) {
      toast("Gagal reset: " + (e?.message || "unknown"));
    }
  };

  qs("#btnDeleteMateri").onclick = async () => {
    if (!confirm("Hapus materi ini beserta semua sections?")) return;
    try {
      await deleteDoc(materiRef);
      toast("Materi dihapus");
      selectedMateriId = null;
      setDetailVisible(false);
      qs("#sectionsList").innerHTML = "";
      qs("#sectionsEmpty").classList.add("hidden");
      setTopbarInfo({ judul: "", kelas: "", bab: "", publish: false });
      renderMateriList();
    } catch (e) {
      toast("Gagal hapus: " + (e?.message || "unknown"));
    }
  };

  qs("#btnAddText").onclick = () => addSectionText(materiId);
  qs("#btnAddQuiz").onclick = () => addSectionQuiz(materiId);

  listenSections(materiId);
}

function listenSections(materiId) {
  const q = query(collection(db, "materi", materiId, "sections"), orderBy("order", "asc"));

  unsubSections = onSnapshot(q, (snap) => {
    const wrap = qs("#sectionsList");
    const empty = qs("#sectionsEmpty");
    wrap.innerHTML = "";

    let count = 0;

    snap.forEach((d) => {
      count++;
      const s = d.data();
      const type = s.type || "text";

      const card = document.createElement("div");
      card.className = "sec";

      const typePill =
        type === "quiz"
          ? `<span class="type-pill quiz">QUIZ</span>`
          : `<span class="type-pill text">TEXT</span>`;

      card.innerHTML = `
        <div class="sec-head">
          <div class="sec-left">
            <div class="sec-topline">
              ${typePill}
              <div class="sec-title">#${escapeHtml(String(s.order ?? 0))} • ${escapeHtml(s.title || "Tanpa Judul")}</div>
            </div>
            <div class="muted small sec-sub">
              ${type === "quiz" ? escapeHtml((s.question || "").slice(0, 80)) : escapeHtml((s.content || "").slice(0, 80))}
            </div>
          </div>

          <div class="sec-actions">
            <button class="btn mini" data-act="toggle">Edit</button>
            <button class="btn mini danger" data-act="del">Hapus</button>
          </div>
        </div>

        <div class="sec-body hidden">
          <div class="grid2">
            <div>
              <label>Order</label>
              <input class="sOrder" type="number" value="${escapeAttr(String(s.order ?? 0))}" />
            </div>
            <div>
              <label>Title</label>
              <input class="sTitle" value="${escapeAttr(s.title || "")}" />
            </div>
          </div>

          ${
            type === "text"
              ? `
                <label>Content (Text)</label>
                <textarea class="sContent" rows="7">${escapeHtml(s.content || "")}</textarea>
              `
              : `
                <label>Question</label>
                <textarea class="sQuestion" rows="3">${escapeHtml(s.question || "")}</textarea>

                <label>Options (1 baris = 1 opsi)</label>
                <textarea class="sOptions" rows="5">${escapeHtml(((s.options || [])).join("\n"))}</textarea>

                <div class="grid2">
                  <div>
                    <label>Answer Index (0..n-1)</label>
                    <input class="sAnswer" type="number" value="${escapeAttr(String(s.answerIndex ?? 0))}" />
                  </div>
                  <div>
                    <label>Hint</label>
                    <input class="sHint" value="${escapeAttr(s.hint || "")}" />
                  </div>
                </div>

                <label>Explain</label>
                <textarea class="sExplain" rows="4">${escapeHtml(s.explain || "")}</textarea>
              `
          }

          <div class="row gap" style="justify-content:flex-start; margin-top:12px;">
            <button class="btn primary mini" data-act="save">Simpan</button>
            <button class="btn mini" data-act="close">Tutup</button>
          </div>
        </div>
      `;

      const body = card.querySelector(".sec-body");

      card.querySelector('[data-act="toggle"]').onclick = () => body.classList.toggle("hidden");
      card.querySelector('[data-act="close"]').onclick = () => body.classList.add("hidden");

      card.querySelector('[data-act="del"]').onclick = async () => {
        if (!confirm("Hapus section ini?")) return;
        try {
          await deleteDoc(doc(db, "materi", materiId, "sections", d.id));
          toast("Section dihapus");
        } catch (e) {
          toast("Gagal hapus section: " + (e?.message || "unknown"));
        }
      };

      card.querySelector('[data-act="save"]').onclick = async () => {
        try {
          const payload = {
            order: parseInt(card.querySelector(".sOrder").value || "0", 10),
            title: card.querySelector(".sTitle").value.trim(),
            updatedAt: serverTimestamp()
          };

          if (type === "text") {
            payload.content = card.querySelector(".sContent").value;
          } else {
            const optionsRaw = card.querySelector(".sOptions").value || "";
            payload.question = card.querySelector(".sQuestion").value;
            payload.options = optionsRaw.split("\n").map((x) => x.trim()).filter(Boolean);
            payload.answerIndex = parseInt(card.querySelector(".sAnswer").value || "0", 10);
            payload.hint = card.querySelector(".sHint").value.trim();
            payload.explain = card.querySelector(".sExplain").value;
          }

          await setDoc(doc(db, "materi", materiId, "sections", d.id), payload, { merge: true });
          toast("Section disimpan");
          body.classList.add("hidden");
        } catch (e) {
          toast("Gagal simpan section: " + (e?.message || "unknown"));
        }
      };

      wrap.appendChild(card);
    });

    empty.classList.toggle("hidden", count > 0);
  });
}

async function addSectionText(materiId) {
  try {
    await addDoc(collection(db, "materi", materiId, "sections"), {
      type: "text",
      order: 0,
      title: "Section Text",
      content: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    toast("Section text dibuat");
  } catch (e) {
    toast("Gagal tambah section: " + (e?.message || "unknown"));
  }
}

async function addSectionQuiz(materiId) {
  try {
    await addDoc(collection(db, "materi", materiId, "sections"), {
      type: "quiz",
      order: 0,
      title: "Cek Pemahaman",
      question: "",
      options: ["A", "B", "C", "D"],
      answerIndex: 0,
      hint: "",
      explain: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    toast("Section quiz dibuat");
  } catch (e) {
    toast("Gagal tambah section: " + (e?.message || "unknown"));
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

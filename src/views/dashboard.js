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

export function showDashboard(role) {
  render(`
    <div class="dash">
      <aside class="sidebar">
        <div class="sidebar-head">
          <div>
            <div class="title">Kelola Materi</div>
            <div class="muted small">${escapeHtml(auth.currentUser?.email || "")}</div>
            <div class="muted small">Role: <b>${escapeHtml(role || "-")}</b></div>
          </div>
          <button id="btnLogout" class="btn ghost">Logout</button>
        </div>

        <div class="box">
          <button id="btnNewMateri" class="btn primary full">+ Materi Baru</button>
          <div id="materiList" class="list"></div>
        </div>
      </aside>

      <main class="content">
        <div class="card">
          <h2>Detail Materi</h2>
          <p class="muted" id="hintSelect">Pilih materi di kiri atau buat materi baru.</p>

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
              <div class="row">
                <label class="chk">
                  <input id="mPublish" type="checkbox" />
                  <span>Publish</span>
                </label>
              </div>
            </div>

            <label>Deskripsi</label>
            <textarea id="mDesc" rows="3"></textarea>

            <div class="row gap">
              <button id="btnSaveMateri" class="btn primary">Simpan</button>
              <button id="btnResetMateri" class="btn warn">Reset Progress</button>
              <button id="btnDeleteMateri" class="btn danger">Hapus</button>
            </div>

            <div class="muted small" style="margin-top:8px;">
              Reset Progress akan membuat semua siswa mengulang dari 0.
            </div>
          </div>
        </div>

        <div class="card">
          <h2>Sections</h2>
          <p class="muted">Section = Text atau Quiz (cek pemahaman)</p>

          <div id="sectionWrap" class="hidden">
            <div class="row gap" style="justify-content:flex-start;">
              <button id="btnAddText" class="btn">+ Section Text</button>
              <button id="btnAddQuiz" class="btn">+ Section Quiz</button>
            </div>

            <div id="sectionsList" class="list" style="margin-top:10px;"></div>
          </div>

          <div id="sectionEmpty" class="muted">Pilih materi dulu.</div>
        </div>
      </main>
    </div>
  `);

  qs("#btnLogout").onclick = async () => {
    await signOut(auth);
  };

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

        // ✅ penting untuk reset progress
        resetVersion: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast("Materi dibuat");
      selectMateri(ref.id);
    } catch (e) {
      toast("Gagal buat materi: " + (e?.message || "unknown"));
    }
  };

  listenMateriList();
}

function listenMateriList() {
  if (unsubMateriList) unsubMateriList();

  const q = query(collection(db, "materi"), orderBy("urutan", "asc"));
  unsubMateriList = onSnapshot(q, (snap) => {
    const list = qs("#materiList");
    list.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const active = d.id === selectedMateriId ? "active" : "";
      const badge = m.publish ? `<span class="badge ok">publish</span>` : `<span class="badge">draft</span>`;

      const item = document.createElement("div");
      item.className = `list-item ${active}`;
      item.innerHTML = `
        <div class="li-main">
          <div class="li-title">${escapeHtml(m.judul || "Tanpa Judul")}</div>
          <div class="li-sub">${escapeHtml((m.kelas || "-") + " • " + (m.bab || "-"))}</div>
        </div>
        ${badge}
      `;

      item.onclick = () => selectMateri(d.id);
      list.appendChild(item);
    });
  });
}

function setDetailVisible(visible) {
  qs("#hintSelect").classList.toggle("hidden", visible);
  qs("#materiFormWrap").classList.toggle("hidden", !visible);
  qs("#sectionWrap").classList.toggle("hidden", !visible);
  qs("#sectionEmpty").classList.toggle("hidden", visible);
}

function selectMateri(materiId) {
  selectedMateriId = materiId;
  setDetailVisible(true);

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
  });

  qs("#btnSaveMateri").onclick = async () => {
    try {
      await setDoc(materiRef, {
        judul: qs("#mJudul").value.trim(),
        kelas: qs("#mKelas").value.trim(),
        bab: qs("#mBab").value.trim(),
        deskripsi: qs("#mDesc").value.trim(),
        estimasiMenit: parseInt(qs("#mEstimasi").value || "10", 10),
        urutan: parseInt(qs("#mUrutan").value || "0", 10),
        publish: qs("#mPublish").checked,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast("Materi disimpan");
    } catch (e) {
      toast("Gagal simpan: " + (e?.message || "unknown"));
    }
  };

  // ✅ RESET PROGRESS (naikkan resetVersion)
  qs("#btnResetMateri").onclick = async () => {
    if (!confirm("Reset progress materi ini untuk semua siswa?\n\nSiswa akan mengulang dari 0.")) return;
    try {
      await setDoc(materiRef, {
        resetVersion: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast("✅ Reset sukses. Progress siswa kembali 0.");
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
    wrap.innerHTML = "";

    snap.forEach((d) => {
      const s = d.data();
      const type = s.type || "text";

      const card = document.createElement("div");
      card.className = "sec";

      card.innerHTML = `
        <div class="sec-head">
          <div>
            <div class="sec-title">${escapeHtml(type.toUpperCase())} • #${escapeHtml(String(s.order ?? 0))}</div>
            <div class="muted small">${escapeHtml(s.title || "")}</div>
          </div>
          <div class="row gap" style="justify-content:flex-end;">
            <button class="btn mini" data-act="toggle">Edit</button>
            <button class="btn mini danger" data-act="del">Hapus</button>
          </div>
        </div>

        <div class="sec-body hidden">
          <label>Order</label>
          <input class="sOrder" type="number" value="${escapeAttr(String(s.order ?? 0))}" />

          <label>Title</label>
          <input class="sTitle" value="${escapeAttr(s.title || "")}" />

          ${
            type === "text"
              ? `
                <label>Content (Text)</label>
                <textarea class="sContent" rows="6">${escapeHtml(s.content || "")}</textarea>
              `
              : `
                <label>Question</label>
                <textarea class="sQuestion" rows="3">${escapeHtml(s.question || "")}</textarea>

                <label>Options (1 baris = 1 opsi)</label>
                <textarea class="sOptions" rows="5">${escapeHtml(((s.options || [])).join("\n"))}</textarea>

                <label>Answer Index (0..n-1)</label>
                <input class="sAnswer" type="number" value="${escapeAttr(String(s.answerIndex ?? 0))}" />

                <label>Hint</label>
                <input class="sHint" value="${escapeAttr(s.hint || "")}" />

                <label>Explain</label>
                <textarea class="sExplain" rows="4">${escapeHtml(s.explain || "")}</textarea>
              `
          }

          <div class="row gap" style="justify-content:flex-start;">
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
            payload.options = optionsRaw.split("\n").map(x => x.trim()).filter(Boolean);
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

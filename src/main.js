import "./style.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import { render } from "./components/ui";
import { toast } from "./components/toast";

import { showLogin } from "./views/login";
import { showDashboard } from "./views/dashboard";

import { getUserRole, isAllowedRole } from "./role";

function showChecking() {
  render(`
    <div class="page">
      <div class="card">
        <h2>Memeriksa akses</h2>
        <p class="muted">Tunggu sebentar</p>
      </div>
    </div>
  `);
}

function showNoAccess() {
  render(`
    <div class="page">
      <div class="card">
        <h1>Akses ditolak</h1>
        <p class="muted">Akun ini tidak memiliki role guru/admin.</p>
        <button id="btnBack" class="btn primary full">Kembali</button>
      </div>
    </div>
  `);

  document.getElementById("btnBack").onclick = () => showLogin();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return showLogin();

  showChecking();

  try {
    const role = await getUserRole(user.uid);

    if (!isAllowedRole(role)) {
      toast("Role tidak diizinkan: " + (role || "null"));
      await signOut(auth);
      return showNoAccess();
    }

    showDashboard(role);
  } catch (e) {
    toast("Gagal cek role: " + (e?.message || "unknown"));
    await signOut(auth);
    showLogin();
  }
});

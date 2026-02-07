import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { render, qs } from "../components/ui";
import { toast } from "../components/toast";

export function showLogin() {
  render(`
    <div class="page">
      <div class="card">
        <h1>Panel Materi</h1>
        <p class="muted">Login untuk kelola materi QuizLive</p>

        <label>Email</label>
        <input id="email" type="email" placeholder="admin@email.com" />

        <label>Password</label>
        <input id="pass" type="password" placeholder="••••••••" />

        <button id="btnLogin" class="btn primary full">Masuk</button>

        <p class="muted small" style="margin-top:10px;">
          Akun harus dibuat dulu di Firebase Auth (Email/Password).
        </p>
      </div>
    </div>
  `);

  qs("#btnLogin").addEventListener("click", async () => {
    const email = qs("#email").value.trim();
    const pass = qs("#pass").value.trim();

    if (!email || !pass) return toast("Email dan password wajib diisi");

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast("Login berhasil");
    } catch (e) {
      toast("Login gagal: " + (e?.message || "unknown"));
    }
  });
}

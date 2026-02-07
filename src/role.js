import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export function isAllowedRole(role) {
  return role === "admin" || role === "guru";
}

export async function getUserRole(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data()?.role ?? null;
}

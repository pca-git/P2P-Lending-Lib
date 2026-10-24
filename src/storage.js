// Gives the app the same window.storage interface it used inside Claude, backed by
// Firebase Firestore (shared by everyone). Falls back to this browser's localStorage
// in demo mode, when the Firebase settings have not been filled in yet.
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

const configured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("PASTE"));

if (configured) {
  const db = getFirestore(initializeApp(firebaseConfig));
  window.storage = {
    async get(key) {
      const snap = await getDoc(doc(db, "kv", key));
      if (!snap.exists()) throw new Error("not found");
      return { key, value: snap.data().value };
    },
    async set(key, value) {
      await setDoc(doc(db, "kv", key), { value });
      return { key, value };
    },
  };
} else {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem("lendinglib:" + key);
      if (value === null) throw new Error("not found");
      return { key, value };
    },
    async set(key, value) {
      localStorage.setItem("lendinglib:" + key, value);
      return { key, value };
    },
  };
  window.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.textContent =
      "Demo mode: data is saved only in this browser. Add your Firebase settings in src/firebase-config.js to share it with everyone.";
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:100;padding:8px 16px;font:13px Inter,sans-serif;text-align:center;background:#2A251F;color:#FBF9F2;";
    document.body.appendChild(bar);
  });
}

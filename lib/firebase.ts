import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

//  Your config (this is fine)
const firebaseConfig = {
  apiKey: "AIzaSyC7nAb5tpL8UrbVvmXY2Ih2V5tTSB3PJ40",
  authDomain: "memory-vault-954c2.firebaseapp.com",
  projectId: "memory-vault-954c2",
  storageBucket: "memory-vault-954c2.firebasestorage.app",
  messagingSenderId: "689215782329",
  appId: "1:689215782329:web:b5075866591b3644db8a68",
  measurementId: "G-N81N7S8M7V"
};

const app = initializeApp(firebaseConfig);

//ADD THESE (you were missing them)
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { firebaseConfig } from "./firebaseConfig";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

let messagingInstance: Messaging | null | undefined;

// FCM isn't available in every browser (e.g. no Service Worker/Push API
// support); isSupported() guards against throwing in those environments.
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance !== undefined) {
    return messagingInstance;
  }
  messagingInstance = (await isSupported()) ? getMessaging(app) : null;
  return messagingInstance;
}

import { getToken, onMessage } from "firebase/messaging";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, getMessagingInstance } from "./firebase";

const DEVICE_ID_KEY = "familyTaskApp.deviceId";

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export async function enablePushNotifications(uid: string): Promise<"granted" | "denied" | "unsupported"> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "denied";
  }

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return "denied";
  }

  const deviceId = getOrCreateDeviceId();
  await setDoc(doc(db, "users", uid, "devices", deviceId), {
    fcmToken: token,
    updatedAt: serverTimestamp(),
    userAgent: navigator.userAgent,
  });

  return "granted";
}

export async function listenForForegroundMessages(
  onNotification: (title: string, body: string) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return () => {};
  }
  return onMessage(messaging, (payload) => {
    onNotification(payload.notification?.title ?? "Напомняне", payload.notification?.body ?? "");
  });
}

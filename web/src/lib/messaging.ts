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

// iOS only delivers web push to a PWA added to the home screen — never to
// a tab open in regular Safari, even with permission granted.
export function isIosNonStandalone(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

export async function enablePushNotifications(uid: string): Promise<"granted" | "denied" | "unsupported"> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error(
      "Липсва VAPID ключ (VITE_FIREBASE_VAPID_KEY в .env) — известията не могат да се регистрират.",
    );
  }

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
    vapidKey,
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

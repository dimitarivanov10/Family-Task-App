// @ts-nocheck
// Custom service worker: precaches the app shell (for offline/installable
// PWA support) and handles FCM push notifications while the app is in the
// background or closed. Not type-checked with the rest of the app because
// its ambient types (self, __WB_MANIFEST, ServiceWorkerGlobalScope) belong
// to a different lib ("webworker") than the main app ("dom").
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { precacheAndRoute } from "workbox-precaching";
import { firebaseConfig } from "./lib/firebaseConfig";

precacheAndRoute(self.__WB_MANIFEST);

initializeApp(firebaseConfig);
const messaging = getMessaging();

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title || "Напомняне за задача";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});

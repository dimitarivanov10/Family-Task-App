import { initializeApp } from "firebase-admin/app";

initializeApp();

export { createFamily, joinFamily } from "./family";
export { createTask, markSeen, acceptTask, completeTask, changeDeadline } from "./tasks";
export { sendTaskReminders } from "./reminders";

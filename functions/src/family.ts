import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { FamilyDoc } from "./types";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const INVITE_CODE_LENGTH = 6;
const MAX_INVITE_CODE_ATTEMPTS = 5;

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  const db = getFirestore();
  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
    const code = generateInviteCode();
    const existing = await db.collection("families").where("inviteCode", "==", code).limit(1).get();
    if (existing.empty) {
      return code;
    }
  }
  throw new HttpsError("internal", "Неуспешно генериране на уникален код за покана. Опитайте отново.");
}

export const createFamily = onCall<{ name: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }

  const name = request.data?.name?.trim();
  if (!name || name.length < 1 || name.length > 60) {
    throw new HttpsError("invalid-argument", "Името на семейството трябва да е между 1 и 60 символа.");
  }

  const inviteCode = await generateUniqueInviteCode();
  const db = getFirestore();
  const familyRef = db.collection("families").doc();

  const family: FamilyDoc = {
    name,
    inviteCode,
    members: [uid],
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp() as unknown as FamilyDoc["createdAt"],
  };

  await familyRef.set(family);

  return { familyId: familyRef.id, inviteCode, name };
});

export const joinFamily = onCall<{ inviteCode: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }

  const inviteCode = request.data?.inviteCode?.trim().toUpperCase();
  if (!inviteCode) {
    throw new HttpsError("invalid-argument", "Моля, въведете код за покана.");
  }

  const db = getFirestore();
  const matches = await db.collection("families").where("inviteCode", "==", inviteCode).limit(1).get();

  if (matches.empty) {
    throw new HttpsError("not-found", "Няма семейство с този код за покана.");
  }

  const familyDoc = matches.docs[0];
  const family = familyDoc.data() as FamilyDoc;

  if (!family.members.includes(uid)) {
    await familyDoc.ref.update({
      members: FieldValue.arrayUnion(uid),
    });
  }

  return { familyId: familyDoc.id, inviteCode: family.inviteCode, name: family.name };
});

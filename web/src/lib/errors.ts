// Firebase errors carry a `.code` like "permission-denied" or
// "auth/wrong-password" and a `.message` that's really meant for
// developers (often literally the raw rule-evaluation text). Never show
// that to the user — map known codes to plain Bulgarian, and fall back
// to one generic line for anything else.
const CODE_MESSAGES: Record<string, string> = {
  "permission-denied": "Нямате право да извършите това действие.",
  unauthenticated: "Трябва да сте влезли в профила си.",
  "not-found": "Елементът не е намерен.",
  "already-exists": "Вече съществува.",
  unavailable: "Няма връзка със сървъра. Проверете интернет връзката си.",
  "deadline-exceeded": "Заявката отне твърде дълго. Опитайте отново.",
  cancelled: "Действието беше прекъснато.",
  aborted: "Действието не може да бъде завършено поради конфликт. Опитайте отново.",
  "resource-exhausted": "Твърде много заявки. Опитайте отново по-късно.",
  "failed-precondition": "Това действие не е възможно в момента.",
  internal: "Възникна вътрешна грешка. Опитайте отново.",

  "auth/invalid-email": "Невалиден имейл адрес.",
  "auth/user-disabled": "Този профил е деактивиран.",
  "auth/user-not-found": "Няма профил с този имейл.",
  "auth/wrong-password": "Грешна парола.",
  "auth/invalid-credential": "Грешен имейл или парола.",
  "auth/email-already-in-use": "Вече има профил с този имейл.",
  "auth/weak-password": "Паролата трябва да е поне 6 символа.",
  "auth/too-many-requests": "Твърде много опити. Изчакайте и опитайте отново.",
  "auth/network-request-failed": "Няма връзка с интернет.",
  "auth/popup-closed-by-user": "Прозорецът беше затворен.",
};

function extractCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return err.code;
  }
  return undefined;
}

export function getErrorMessage(err: unknown): string {
  const code = extractCode(err);
  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }
  if (err instanceof Error && err.message && !code) {
    // Errors we threw ourselves (new Error("...")) already carry a clear
    // Bulgarian message and have no Firebase `.code` — safe to show.
    return err.message;
  }
  return "Възникна неочаквана грешка. Опитайте отново.";
}

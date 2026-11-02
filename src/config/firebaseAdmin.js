import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

const firstEnv = (...names) => names.map((name) => process.env[name]).find(Boolean);

const firebaseEnvPresence = () => ({
  projectId: Boolean(firstEnv("FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "project_id")),
  clientEmail: Boolean(firstEnv("FIREBASE_CLIENT_EMAIL", "FIREBASE_ADMIN_CLIENT_EMAIL", "client_email")),
  privateKey: Boolean(firstEnv("FIREBASE_PRIVATE_KEY", "FIREBASE_ADMIN_PRIVATE_KEY", "private_key")),
  serviceAccountJson: Boolean(firstEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON", "FIREBASE_SERVICE_ACCOUNT", "FIREBASE_ADMIN_SDK_JSON", "GOOGLE_APPLICATION_CREDENTIALS_JSON"))
});

const getServiceAccount = () => {
  const jsonValue = firstEnv(
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON",
    "FIREBASE_SERVICE_ACCOUNT",
    "FIREBASE_ADMIN_SDK_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON"
  );
  if (jsonValue) {
    try {
      return JSON.parse(jsonValue);
    } catch (_error) {
      throw new Error("Firebase service-account JSON is invalid");
    }
  }

  const clientEmail = firstEnv("FIREBASE_CLIENT_EMAIL", "FIREBASE_ADMIN_CLIENT_EMAIL", "client_email");
  const privateKey = firstEnv("FIREBASE_PRIVATE_KEY", "FIREBASE_ADMIN_PRIVATE_KEY", "private_key");
  if (clientEmail && privateKey) {
    return {
      projectId: firstEnv("FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "project_id"),
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n")
    };
  }

  return null;
};

export const firebaseAdminAuth = () => {
  if (getApps().length > 0) return getAuth();

  const serviceAccount = getServiceAccount();
  if (!serviceAccount?.projectId || !serviceAccount?.clientEmail || !serviceAccount?.privateKey) {
    const presence = firebaseEnvPresence();
    const missing = Object.entries(presence)
      .filter(([name, present]) => name !== "serviceAccountJson" && !present)
      .map(([name]) => name)
      .join(", ");
    throw new Error(`Firebase Admin is not configured. Missing: ${missing || "valid service-account JSON"}`);
  }

  initializeApp({ credential: cert(serviceAccount) });
  return getAuth();
};

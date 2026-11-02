import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

const firstEnv = (...names) => names.map((name) => process.env[name]).find(Boolean);

const getServiceAccount = () => {
  const jsonValue = firstEnv(
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON"
  );
  if (jsonValue) {
    try {
      return JSON.parse(jsonValue);
    } catch (_error) {
      throw new Error("Firebase service-account JSON is invalid");
    }
  }

  const clientEmail = firstEnv("FIREBASE_CLIENT_EMAIL", "FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = firstEnv("FIREBASE_PRIVATE_KEY", "FIREBASE_ADMIN_PRIVATE_KEY");
  if (clientEmail && privateKey) {
    return {
      projectId: firstEnv("FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID", "GOOGLE_CLOUD_PROJECT"),
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
    throw new Error("Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to Render.");
  }

  initializeApp({ credential: cert(serviceAccount) });
  return getAuth();
};

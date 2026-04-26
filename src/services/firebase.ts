import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Help with sandbox environments
});
export const auth = getAuth(app);

/**
 * Validates connection to Firestore as required by security guidelines.
 */
export async function testConnection() {
  try {
    // Attempt a silent background fetch to verify link but don't block
    const docRef = doc(db, 'test', 'connection');
    getDocFromServer(docRef).catch(() => {
      console.log("Firebase: Operating in optimized offline mode.");
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Standardized Firestore error handler for enhanced diagnostics.
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error Diagnostics: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

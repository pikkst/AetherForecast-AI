
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface UserSettings {
  savedLocations: string[];
  nodes?: Record<string, string>;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  if (!auth.currentUser) return null;
  const docRef = doc(db, 'userPreferences', auth.currentUser.uid);
  try {
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as UserSettings : { savedLocations: [], nodes: {} };
  } catch (error) {
    console.warn("User settings fetch failed (offline mode):", error);
    return { savedLocations: [], nodes: {} };
  }
}

export async function saveNode(nodeId: string, location: string) {
  if (!auth.currentUser) return;
  const docRef = doc(db, 'userPreferences', auth.currentUser.uid);
  await setDoc(docRef, {
    nodes: {
      [nodeId]: location
    }
  }, { merge: true });
}

export async function saveLocation(location: string) {
  if (!auth.currentUser) return;
  const docRef = doc(db, 'userPreferences', auth.currentUser.uid);
  await setDoc(docRef, {
    savedLocations: arrayUnion(location)
  }, { merge: true });
}

export async function removeLocation(location: string) {
  if (!auth.currentUser) return;
  const docRef = doc(db, 'userPreferences', auth.currentUser.uid);
  await updateDoc(docRef, {
    savedLocations: arrayRemove(location)
  });
}

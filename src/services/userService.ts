
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface UserSettings {
  savedLocations: string[];
}

export async function getUserSettings(): Promise<UserSettings | null> {
  if (!auth.currentUser) return null;
  const docRef = doc(db, 'userPreferences', auth.currentUser.uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() as UserSettings : { savedLocations: [] };
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

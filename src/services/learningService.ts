import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';

export interface WeatherLearningLog {
  location: string;
  coordinates: { lat: number; lon: number };
  timestamp: string;
  actualTemp: number;
  predictedTemp: number;
  errorDelta: number;
  modelVariant: 'standard' | 'experimental';
  isAnomaly?: boolean;
  anomalyExplanation?: string;
}

export async function logWeatherComparison(log: WeatherLearningLog) {
  const path = 'weatherLogs';
  try {
    const isAnomaly = Math.abs(log.errorDelta) > 5;
    await addDoc(collection(db, path), {
      ...log,
      isAnomaly,
      createdAt: new Date().toISOString()
    });
    
    // Update performance stats
    const performancePath = `modelPerformance/${log.location.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const performanceRef = doc(db, 'modelPerformance', log.location.replace(/[^a-zA-Z0-9]/g, '_'));
    
    // Use standard getDoc for better resilience
    const perfSnap = await getDoc(performanceRef);
    
    if (perfSnap.exists()) {
      const data = perfSnap.data();
      const newTotal = (data.totalSamples || 0) + 1;
      const newAvg = ((data.averageError || 0) * (data.totalSamples || 0) + Math.abs(log.errorDelta)) / newTotal;
      
      await setDoc(performanceRef, {
        location: log.location,
        averageError: newAvg,
        totalSamples: newTotal,
        lastUpdate: new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(performanceRef, {
        location: log.location,
        averageError: Math.abs(log.errorDelta),
        totalSamples: 1,
        lastUpdate: new Date().toISOString()
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.warn("Learning log skipped (offline or auth restriction)");
  }
}

export async function getModelPerformance(location: string) {
  const id = location.replace(/[^a-zA-Z0-9]/g, '_');
  const path = `modelPerformance/${id}`;
  try {
    const docRef = doc(db, 'modelPerformance', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.warn("Performance fetch skipped (offline)");
    return null;
  }
}

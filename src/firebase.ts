import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDrQ8d8IB2SVtSMm2YigJEvVQv3DJJ8kOM",
  authDomain: "elegant-bit-36tp2.firebaseapp.com",
  projectId: "elegant-bit-36tp2",
  storageBucket: "elegant-bit-36tp2.firebasestorage.app",
  messagingSenderId: "733243349065",
  appId: "1:733243349065:web:f33fcc4888a35299de0798"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID as the third argument
export const db = initializeFirestore(
  app, 
  {}, 
  "ai-studio-tabunganbandarse-3d42ed54-4c4b-462a-acf1-abdc76c6bddc"
);

export const storage = getStorage(app);


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
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


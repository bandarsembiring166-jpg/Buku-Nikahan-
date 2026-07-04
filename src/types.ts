export interface Transaction {
  id: string;
  amount: number;
  depositor: 'Bandar' | 'Selly';
  note: string;
  category: string;
  date: string; // ISO String
}

export interface Milestone {
  id: string;
  title: string;
  target: number;
  description: string;
  iconName: string;
}

export interface AppConfig {
  coupleName1: string;
  coupleName2: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
  photoUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  createdAt: string; // ISO String
  storagePath?: string;
}


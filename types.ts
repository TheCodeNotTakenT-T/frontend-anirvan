export type ViewState = 'landing' | 'landowner' | 'enterprise' | 'validation';

export interface Transaction {
  hash: string;
  slot: number;
  type: string;
  from: string;
  age: string;
  status: 'Success' | 'Processing';
}

export interface Project {
  id: number;
  location: string;
  species: string;
  area: string;
  multiplier: string;
  price: number;
  type: string;
  image: string;
}

export interface ValidationRequest {
  id: string;
  landowner: string;
  parcelId: string;
  location: string;
  submittedDate: string;
  claimAmount: string;
  riskScore: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Approved' | 'Rejected';
  images: string[];
  documents: string[];
  gps: { lat: number; lng: number };
}

export interface LandApplication {
  id: string; 
  ownerName: string;
  species: string;
  area: number;
  pdfName: string; // Used for document_url
  images: string[];
  videoName?: string; // Used for video_url
  coordinates: {
    lat: number;
    lon: number;
  } | null;
  polygonPath?: number[][]; 
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  walletAddress?: string;
  contractId?: number;
}
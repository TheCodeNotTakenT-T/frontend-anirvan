import { Transaction, Project, ValidationRequest } from './types';

export const MOCK_TXS: Transaction[] = [
  { hash: '5x9a...3k2p', slot: 234156789, type: 'Mint NFT (Parcel)', from: 'Addr...89x1', age: '15s ago', status: 'Success' },
  { hash: '2b4c...9m1q', slot: 234156785, type: 'Upload Proof', from: 'Addr...4j22', age: '45s ago', status: 'Success' },
  { hash: '8k1l...0p3z', slot: 234156782, type: 'Oracle Verify', from: 'Oracle-Chainlink', age: '1m ago', status: 'Success' },
  { hash: '3m2n...5r8t', slot: 234156778, type: 'Claim Artha', from: 'Addr...99a1', age: '2m ago', status: 'Success' },
  { hash: '9p8o...1q2w', slot: 234156770, type: 'Buy Offset', from: 'Corp...Google', age: '5m ago', status: 'Success' },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 1, location: 'Kerala, India', species: 'Tectona grandis (Teak)', area: '12 Acres', multiplier: '2.5x', price: 4500, type: 'Native', image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5c73?auto=format&fit=crop&q=80&w=800' },
  { id: 2, location: 'Sumatra, Indonesia', species: 'Diverse Rainforest', area: '45 Acres', multiplier: '2.0x', price: 12000, type: 'Restoration', image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800' },
  { id: 3, location: 'Amazonas, Brazil', species: 'Hevea brasiliensis', area: '8 Acres', multiplier: '1.8x', price: 3200, type: 'Agroforestry', image: 'https://images.unsplash.com/photo-1448375240586-dfd8d395ea6c?auto=format&fit=crop&q=80&w=800' },
];

export const MOCK_VALIDATIONS: ValidationRequest[] = [
  {
    id: 'VAL-2026-001',
    landowner: 'John Doe (0x71...9A22)',
    parcelId: '#2491',
    location: 'Kerala Sector A',
    submittedDate: '2026-01-16',
    claimAmount: '450 ARTHA',
    riskScore: 'Low',
    status: 'Pending',
    gps: { lat: 10.8505, lng: 76.2711 },
    images: [
      'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5c73?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=200'
    ],
    documents: ['soil_report_2026.pdf', 'ownership_deed.pdf']
  },
  {
    id: 'VAL-2026-004',
    landowner: 'Maria Garcia (0x82...1B33)',
    parcelId: '#2495',
    location: 'Amazonas, Brazil',
    submittedDate: '2026-01-15',
    claimAmount: '1200 ARTHA',
    riskScore: 'Medium',
    status: 'Pending',
    gps: { lat: -3.4653, lng: -62.2159 },
    images: [
      'https://images.unsplash.com/photo-1448375240586-dfd8d395ea6c?auto=format&fit=crop&q=80&w=200'
    ],
    documents: ['satellite_analysis_q4.pdf']
  }
];
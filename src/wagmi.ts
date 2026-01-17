import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

const walletConnectProjectId = 'YOUR_PROJECT_ID_HERE'; 

// !!! MAKE SURE THIS IS THE ADDRESS OF THE NEW 'AnirvanDynamic' CONTRACT !!!
export const CONTRACT_ADDRESS = "0x8b386Ac8d0Db1fa0E32f92576f8819870715d434"; 

export const config = getDefaultConfig({
  appName: 'Anirvan',
  projectId: walletConnectProjectId,
  chains: [polygonAmoy],
  ssr: false, 
});

// NEW ABI FOR DYNAMIC CONTRACT
export const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address","name": "landowner","type": "address"}],
    "name": "registerLand",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "projectId","type": "uint256"}],
    "name": "buyPendingCredits",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "projectId","type": "uint256"}],
    "name": "getPendingTokens",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "name": "projects",
    "outputs": [
      {"internalType": "address","name": "landowner","type": "address"},
      {"internalType": "uint256","name": "lastClaimTime","type": "uint256"},
      {"internalType": "bool","name": "isRegistered","type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
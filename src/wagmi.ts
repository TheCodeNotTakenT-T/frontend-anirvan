import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

const walletConnectProjectId = 'YOUR_PROJECT_ID_HERE'; 

// REPLACE THIS with your new contract address after deploying the updated Solidity code
export const CONTRACT_ADDRESS = "0xE5355D85ce17dF9F6eB2e39c0ec63591B2955243"; 

export const config = getDefaultConfig({
  appName: 'Anirvan',
  projectId: walletConnectProjectId,
  chains: [polygonAmoy],
  ssr: false, 
});

// NEW ABI FOR DYNAMIC CONTRACT
export const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address","name": "_landowner","type": "address"},
      {"internalType": "string","name": "_surveyNumber","type": "string"}
    ],
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
    "name": "claimAccumulatedCredits",
    "outputs": [],
    "stateMutability": "nonpayable",
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
      {"internalType": "string","name": "surveyNumber","type": "string"},
      {"internalType": "bool","name": "isRegistered","type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "projectCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
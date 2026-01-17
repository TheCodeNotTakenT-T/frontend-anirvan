import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

const walletConnectProjectId = 'YOUR_PROJECT_ID_OR_RANDOM_STRING'; 

// !!! REPLACE THIS WITH THE NEW ADDRESS YOU JUST COPIED !!!
export const CONTRACT_ADDRESS = "0x056e1D81E3B7084D4aC516AEEF2e28da72999148"; 

export const config = getDefaultConfig({
  appName: 'Anirvan',
  projectId: walletConnectProjectId,
  chains: [polygonAmoy],
  ssr: false, 
});

// UPDATED ABI - Matches the new 2-argument function
export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "landowner", "type": "address" },
      { "internalType": "string", "name": "_tokenURI", "type": "string" }
    ],
    "name": "registerLandAndMint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "buyCredit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "usdAmount", "type": "uint256" }
    ],
    "name": "getMaticPrice",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
] as const;
// src/constants.ts

export const CONTRACT_ADDRESS = "0xE5355D85ce17dF9F6eB2e39c0ec63591B2955243"; // Replace if you redeployed

export const CONTRACT_ABI = [
  // 1. Function: registerLand
  {
    "type": "function",
    "name": "registerLand",
    "inputs": [
      { "name": "_landowner", "type": "address", "internalType": "address" },
      { "name": "_surveyNumber", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // 2. Function: buyPendingCredits
  {
    "type": "function",
    "name": "buyPendingCredits",
    "inputs": [
      { "name": "projectId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  // 3. Function: claimAccumulatedCredits
  {
    "type": "function",
    "name": "claimAccumulatedCredits",
    "inputs": [
      { "name": "projectId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // 4. View: getPendingTokens
  {
    "type": "function",
    "name": "getPendingTokens",
    "inputs": [
      { "name": "projectId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  // 5. View: projects (Mapping)
  {
    "type": "function",
    "name": "projects",
    "inputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "landowner", "type": "address", "internalType": "address" },
      { "name": "lastClaimTime", "type": "uint256", "internalType": "uint256" },
      { "name": "surveyNumber", "type": "string", "internalType": "string" },
      { "name": "isRegistered", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  // 6. View: projectCount
  {
    "type": "function",
    "name": "projectCount",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  }
] as const; 
// ^ IMPORTANT: 'as const' makes this strictly typed for Viem
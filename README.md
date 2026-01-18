# Anirvan - Decentralized Reforestation Platform

A blockchain-powered platform connecting small landowners to the global carbon credit market through automated satellite verification and smart contracts.

## Overview

Anirvan solves the transparency crisis in reforestation by combining NASA's Sentinel satellite data with Polygon blockchain infrastructure. The platform enables:

- **Landowners**: Register parcels, track verification status, and earn carbon credits
- **Validators**: Process applications using real-time satellite imagery (NDVI analysis)
- **Enterprises**: Purchase carbon credits with transparent, verifiable impact

## Architecture

### Frontend
- React 18 with TypeScript
- TailwindCSS for styling
- Wagmi v2 with RainbowKit for EVM wallet integration
- Motion/Framer Motion for animations
- ArcGIS SDK for geospatial mapping
- Three.js for visual effects

### Backend
- Supabase for database and file storage
- Polygon Amoy Testnet for smart contracts
- NASA GIBS API for satellite imagery
- Sentinel Hub API for NDVI calculations

### Smart Contract
- Solidity 0.8.20
- Dynamic token accumulation (1 ARTHA per 60 seconds demo / 1 day production)
- Deployed on Polygon Amoy at: `0xE5355D85ce17dF9F6eB2e39c0ec63591B2955243`

---

## Prerequisites

### Required Accounts and Services

#### 1. Supabase Account (Free Tier)
- Create project at https://supabase.com
- Note your Project URL and Anon Key
- Create storage bucket: `land_documents`
- Create table: `land_applications` with the following schema:

```sql
CREATE TABLE land_applications (
    survey_number text PRIMARY KEY,
    full_name text,
    tree_species text,
    area_acres numeric,
    status text, -- 'PENDING' | 'APPROVED' | 'REJECTED'
    wallet_address text,
    document_url text,
    coordinates jsonb,
    polygon_path jsonb,
    images text[],
    video_url text,
    submitted_at timestamp
);
```

#### 2. WalletConnect Project ID
- Register at https://cloud.walletconnect.com
- Required for RainbowKit wallet connections

#### 3. Sentinel Hub Account (For Validators)
- Register at https://www.sentinel-hub.com
- Create OAuth client credentials
- Note CLIENT_ID and CLIENT_SECRET for token generation

#### 4. Polygon Wallet Configuration
- Install MetaMask or compatible EVM wallet
- Add Polygon Amoy Testnet with the following details:
  - Network Name: Polygon Amoy Testnet
  - RPC URL: https://rpc-amoy.polygon.technology/
  - Chain ID: 80002
  - Currency Symbol: MATIC
- Obtain test MATIC from https://faucet.polygon.technology

#### 5. Bun Package Manager
Install from https://bun.sh

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Installation

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd anirvan-frontend
```

### Step 2: Install Dependencies
```bash
bun install
```

### Step 3: Environment Configuration

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Update Wagmi Configuration

Edit `src/wagmi.ts` and replace the placeholder values:

```typescript
const walletConnectProjectId = 'YOUR_WALLETCONNECT_PROJECT_ID';
export const CONTRACT_ADDRESS = "0xE5355D85ce17dF9F6eB2e39c0ec63591B2955243";
```

### Step 5: Generate Sentinel Hub Access Token (Validators Only)

Edit `app.py` with your Sentinel Hub credentials:

```python
CLIENT_ID = 'your-sentinel-hub-client-id'
CLIENT_SECRET = 'your-sentinel-hub-client-secret'
```

Execute the token generator:
```bash
python app.py
```

Copy the generated access token for use in the Validation View interface.

---

## Running the Application

### Development Server
```bash
bun run dev
```

The application will be accessible at: http://localhost:5173

### Build for Production
```bash
bun run build
```

### Preview Production Build
```bash
bun run preview
```

---

## User Workflows

### Landowner Journey

1. Connect wallet using RainbowKit modal
2. Navigate to the "Landowners" section
3. Complete land registration process:
   - **Step 1**: Enter full name, survey number, and tree species selection
   - **Step 2**: Upload land ownership deed (PDF format only)
   - **Step 3**: Draw parcel polygon boundary on satellite map interface
   - **Step 4**: Upload photographic and video evidence, then submit application
4. Access dashboard to monitor application status (Pending/Approved/Rejected)

### Validator Journey

1. Connect authorized wallet address
2. Navigate to the "Validation" section
3. Select pending application from queue
4. Review submitted evidence:
   - Examine True Color satellite imagery from NASA GIBS
   - Generate NDVI heatmap analysis (requires valid Sentinel Hub token)
   - Review uploaded documentation and media files
5. Approve registration to trigger smart contract `registerLand()` function
6. Upon blockchain confirmation, land parcel is registered and ARTHA accumulation timer begins

### Enterprise Journey

1. Navigate to the "Marketplace" section
2. Browse active reforestation projects with real-time pending ARTHA token counts
3. Execute purchase transaction:
   - Review dynamically calculated cost (20 POL per ARTHA token)
   - Click "Buy & Mint Batch" button
   - Approve transaction in connected wallet
4. Receive ERC721 NFT representing purchased carbon credit batch

---

## Technical Details

### Smart Contract Functions

```solidity
// Register new land project (Validator only)
function registerLand(address landowner, string memory surveyNumber) external;

// View pending tokens for a project
function getPendingTokens(uint256 projectId) public view returns (uint256);

// Purchase accumulated credits (Enterprise)
function buyPendingCredits(uint256 projectId) external payable;

// Claim tokens to own wallet (Landowner)
function claimAccumulatedCredits(uint256 projectId) external;
```

### Token Accumulation Mechanism

- **Demo Mode**: 1 ARTHA token per 60 seconds
- **Production Mode**: 1 ARTHA token per 24 hours (modify `SECONDS_PER_TOKEN` constant in smart contract)
- **Pricing Model**: 1 ARTHA = $10 USD = 20 POL (assuming $0.50 USD per POL)

### Satellite Data Sources

#### NASA GIBS (True Color RGB Imagery)
- Layer: `HLS_S30_Nadir_BRDF_Adjusted_Reflectance`
- Authentication: Not required
- Access: Public API




## License and Attribution

**Development Context**: Built at IIIT Kottayam's Code Kalari Hackathon (January 17th, 2026)

**Team**: Decaf-test

---

## Third-Party Services and Acknowledgments

This project integrates the following third-party services:

- NASA GIBS for Harmonized Landsat Sentinel-2 (HLS) satellite data
- Sentinel Hub for NDVI processing and Sentinel-2 imagery
- Polygon blockchain infrastructure for smart contract deployment
- Supabase for PostgreSQL database and object storage services
- ESRI ArcGIS SDK for geospatial mapping capabilities
- RainbowKit and Wagmi for EVM wallet integration

---

## Support and Contribution

For technical questions, bug reports, or feature requests, please open an issue in the project repository. Contributions following the established code style and architecture patterns are welcome through pull requests.

import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// 1. First, import the default Solana styles
import '@solana/wallet-adapter-react-ui/styles.css';

// 2. Second, import YOUR App.css (This allows your code to win the "priority" battle)
import './App.css';

// 1. Import Solana-specific providers
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// 2. Import the default styles for the login button
import '@solana/wallet-adapter-react-ui/styles.css';

const RootComponent = () => {
    // 3. Set the network to Devnet (standard for testing projects with Devnet USDC) 
    const network = WalletAdapterNetwork.Devnet;

    // 4. Set the endpoint (the "gate") to talk to the Solana blockchain
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // 5. Select which wallets you want to support (Phantom and Solflare are standard)
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    return (
        <React.StrictMode>
            {/* The ConnectionProvider connects Anirvan to the Solana blockchain */}
            <ConnectionProvider endpoint={endpoint}>
                {/* The WalletProvider manages the login state for Landowners and Validators */}
         
            <WalletProvider 
                wallets={wallets} 
                autoConnect={true} 
                localStorageKey="anirvan-wallet-choice" // This names the "cookie" specifically for Anirvan
            >
                <WalletModalProvider>
                    <App />
                </WalletModalProvider>
            </WalletProvider>
            </ConnectionProvider>
        </React.StrictMode>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<RootComponent />);
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import './App.css';
import '@rainbow-me/rainbowkit/styles.css';

import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';

const queryClient = new QueryClient();

const RootComponent = () => {
    return (
        <React.StrictMode>
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider 
                        theme={darkTheme({
                            accentColor: '#84cc16', // anirvan-accent
                            accentColorForeground: 'black',
                            borderRadius: 'large',
                        })}
                    >
                        <App />
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </React.StrictMode>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<RootComponent />);
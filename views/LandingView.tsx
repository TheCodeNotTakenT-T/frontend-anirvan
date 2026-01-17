import React from 'react';
import { X, CheckCircle2, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react'; 
import { ViewState } from '../types';
import LiquidEther from '../components/LiquidEther';
import CardSwap, { Card } from '../components/CardSwap';
import ShinyText from '../components/ShinyText';
import BlurText from '../components/BlurText';

interface LandingViewProps {
  setView: (v: ViewState) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ setView }) => {
  // Entrance animation logic matching the BlurText style
  const blurEntrance = {
    initial: { filter: 'blur(10px)', opacity: 0, y: -40 },
    animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-20 pb-32 px-4 overflow-visible min-h-[700px] flex flex-col items-center">
        
        {/* LIQUID ETHER BACKGROUND */}
        <div className="absolute -top-[76px] left-0 right-0 h-[calc(100%+76px)] z-0 pointer-events-none overflow-hidden">
          <LiquidEther
            mouseForce={35}
            cursorSize={100}
            isViscous={true}
            viscous={15}
            colors={["#65a30d", "#84cc16", "#22c55e"]}
            autoDemo={true}
          />
          {/* Depth Mask */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-anirvan-dark/20 to-anirvan-dark" />
        </div>

        {/* HERO CONTENT */}
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-anirvan-accent/5 border border-anirvan-accent/10 text-anirvan-accent text-[10px] font-bold uppercase tracking-widest mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
            </span>
            Live on Solana Devnet
          </div>

          {/* HEADLINE WITH SHINY + ENTRANCE EFFECT */}
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.85]">
            <motion.span 
              className="inline-block"
              initial={blurEntrance.initial} 
              whileInView={blurEntrance.animate} 
              transition={{...blurEntrance.transition, delay: 0.1}} 
              viewport={{ once: true }}
            >
              <ShinyText text="Making forests" disabled={false} speed={3} color="#ffffff" shineColor="#84cc16" yoyo={true} />
            </motion.span>
            <br />
            <motion.span 
              className="inline-block"
              initial={blurEntrance.initial} 
              whileInView={blurEntrance.animate} 
              transition={{...blurEntrance.transition, delay: 0.3}} 
              viewport={{ once: true }} 
            >
              <ShinyText text="profitable & transparent." disabled={false} speed={3} color="#84cc16" shineColor="#ffffff" yoyo={true} />
            </motion.span>
          </h1>

          {/* SUBHEADING WITH BLUR EFFECT */}
          <BlurText 
            text="Connect small landowners to the $2 Billion carbon market. Automated verification via satellite data, secured by blockchain."
            delay={50}
            animateBy="words"
            className="text-lg md:text-xl text-anirvan-muted max-w-2xl mx-auto mb-12 justify-center"
          />

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => setView('explorer')}
              className="px-10 py-4 bg-anirvan-primary hover:bg-lime-600 text-anirvan-dark rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-lime-900/20 active:scale-95"
            >
              Explore Network
            </button>
            <button 
              onClick={() => setView('landowner')}
              className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
            >
              Start Planting
            </button>
          </div>
        </div>
      </section>
      
      {/* 2. STATS BAR */}
      <div className="border-y border-white/10 bg-black/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-sm text-anirvan-muted mb-1">Active Landowners</div>
            <div className="text-2xl font-mono text-white">1,248</div>
          </div>
          <div>
            <div className="text-sm text-anirvan-muted mb-1">Trees Verified</div>
            <div className="text-2xl font-mono text-anirvan-accent">842,901</div>
          </div>
          <div>
            <div className="text-sm text-anirvan-muted mb-1">Carbon Sequestered</div>
            <div className="text-2xl font-mono text-white">12,450 tCO2</div>
          </div>
          <div>
            <div className="text-sm text-anirvan-muted mb-1">Artha Price</div>
            <div className="text-2xl font-mono text-white">$0.04 <span className="text-green-500 text-sm">▲ 12%</span></div>
          </div>
        </div>
      </div>

      {/* 3. CENTERED DYNAMICS SECTION */}
      <section className="relative py-24 overflow-visible">
        
        {/* FULL WIDTH BACKGROUND EFFECT */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <LiquidEther
            mouseForce={35}
            cursorSize={100}
            isViscous={true}
            viscous={15}
            colors={["#65a30d", "#84cc16", "#22c55e"]}
            autoDemo={true}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-anirvan-dark via-transparent to-anirvan-dark" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            
            {/* LEFT COLUMN: DESCRIPTION */}
            <div className="space-y-8">
              <div className="inline-block px-3 py-1 rounded bg-anirvan-primary/10 border border-anirvan-primary/20 text-anirvan-accent text-xs font-bold uppercase tracking-widest">
                  Ecosystem Dynamics
              </div>

              {/* HEADING WITH SHINY + ENTRANCE EFFECT */}
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                <motion.span 
                  className="inline-block"
                  initial={blurEntrance.initial} 
                  whileInView={blurEntrance.animate} 
                  transition={{...blurEntrance.transition, delay: 0.1}} 
                  viewport={{ once: true }}
                >
                  <ShinyText text="Scaling Nature with" color="#ffffff" shineColor="#84cc16" speed={3} yoyo={true} />
                </motion.span>
                <br /> 
                <motion.span 
                  className="inline-block"
                  initial={blurEntrance.initial} 
                  whileInView={blurEntrance.animate} 
                  transition={{...blurEntrance.transition, delay: 0.3}} 
                  viewport={{ once: true }} 
                >
                  <ShinyText text="Algorithmic Trust." color="#84cc16" shineColor="#ffffff" speed={3} yoyo={true} />
                </motion.span>
              </h2>

              <p className="text-lg text-anirvan-muted max-md leading-relaxed">
                Anirvan solves the transparency crisis in reforestation. By merging NASA's Sentinel data with Solana's high-speed ledger, we've built a system where every seedling is a verifiable asset.
              </p>
              
              <div className="space-y-4">
                  <div className="flex items-center gap-4 text-white font-semibold">
                      <div className="bg-anirvan-accent/10 p-1.5 rounded-full border border-anirvan-accent/20">
                          <Zap className="h-4 w-4 text-anirvan-accent" />
                      </div>
                      <span>Real-time Satellite Proof of Growth</span>
                  </div>
                  <div className="flex items-center gap-4 text-white font-semibold">
                      <div className="bg-anirvan-accent/10 p-1.5 rounded-full border border-anirvan-accent/20">
                          <Zap className="h-4 w-4 text-anirvan-accent" />
                      </div>
                      <span>Instant Payouts via Smart Contracts</span>
                  </div>
              </div>

              <button className="flex items-center gap-2 text-anirvan-accent font-bold hover:gap-4 transition-all group pt-4">
                  VIEW TECHNICAL WHITEPAPER <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* RIGHT COLUMN: CENTERED CARD STACK */}
            <div className="relative flex items-center justify-center min-h-[500px]">
              <div className="w-full max-w-[440px] aspect-[4/3] relative">
                <CardSwap
                  width="100%"
                  height="100%"
                  cardDistance={65}
                  verticalDistance={55}
                  delay={4000}
                  pauseOnHover
                  skewAmount={4}
                >
                  {/* CARD 1: THE BARRIER */}
                  <Card className="p-8 border-red-500/20 shadow-2xl bg-gradient-to-br from-[#1e293b] to-red-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-500/20 rounded-lg"><X className="h-6 w-6 text-red-400" /></div>
                        <h3 className="text-xl font-bold text-red-200 uppercase tracking-tighter">The Barrier</h3>
                      </div>
                      <ul className="space-y-4 text-sm text-red-100/70">
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>Verification costs $15k-$50k, locking out small farmers.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>Opaque intermediaries take 30-60% in hidden fees.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>Corporations face greenwashing risks due to lack of proof.</span>
                        </li>
                      </ul>
                    </div>
                  </Card>

                  {/* CARD 2: THE SOLUTION */}
                  <Card className="p-8 border-anirvan-accent/20 shadow-2xl bg-gradient-to-br from-[#1e293b] to-green-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-anirvan-accent/20 rounded-lg"><CheckCircle2 className="h-6 w-6 text-anirvan-accent" /></div>
                        <h3 className="text-xl font-bold text-green-200 uppercase tracking-tighter">The Solution</h3>
                      </div>
                      <ul className="space-y-4 text-sm text-green-100/70">
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-anirvan-accent mt-1.5 shrink-0" />
                          <span>Remote sensing cuts verification costs to near zero.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-anirvan-accent mt-1.5 shrink-0" />
                          <span>Smart contracts automate payments, reducing fees to 5%.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-anirvan-accent mt-1.5 shrink-0" />
                          <span>Transparent, on-chain proof of impact for every dollar.</span>
                        </li>
                      </ul>
                    </div>
                  </Card>

                  {/* CARD 3: MULTIPLIERS */}
                  <Card className="p-8 border-blue-500/20 shadow-2xl bg-gradient-to-br from-[#1e293b] to-blue-950/20 flex flex-col justify-between">
                    <div>
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Reward Multipliers</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs text-anirvan-muted uppercase font-bold tracking-widest">Location Bonus</span>
                            <span className="text-lg font-mono text-anirvan-accent font-bold">2.5x</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs text-anirvan-muted uppercase font-bold tracking-widest">Species Diversity</span>
                            <span className="text-lg font-mono text-anirvan-accent font-bold">2.0x</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs text-anirvan-muted uppercase font-bold tracking-widest">Tokenomics</span>
                            <span className="text-sm font-mono text-blue-400 font-bold uppercase">Deflationary</span>
                        </div>
                        <p className="text-[10px] text-anirvan-muted leading-relaxed italic opacity-80 pt-2">
                          Native species rewarded. Monocultures penalized (0.3x). Tokens burned when corps claim offset certificates.
                        </p>
                      </div>
                    </div>
                  </Card>
                </CardSwap>
              </div>
            </div>

          </div>
        </div>
      </section>
      
    </div>
  );
};

export default LandingView;
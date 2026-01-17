import { DollarSign, ShieldCheck } from 'lucide-react';
import { MOCK_PROJECTS } from '../data';



const EnterpriseView = () => {
  // ADD THIS FUNCTION
  const renderSpecies = (species: string) => {
    if (species.includes('(')) {
      const [scientific, common] = species.split('(');
      return (
        <>
          <span className="italic opacity-90">{scientific.trim()}</span> 
          <span className="ml-1 text-gray-500">({common}</span>
        </>
      );
    }
    return <span className="italic opacity-90">{species}</span>;
  };

  return (
    // ... rest of component
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">Carbon Credit Marketplace</h2>
        <p className="text-anirvan-muted max-w-2xl mx-auto">
          Fund verified reforestation projects directly. Receive NFT certificates as proof of your ESG impact, auditable on-chain.
        </p>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button className="bg-anirvan-accent text-black px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">All Projects</button>
        <button className="bg-white/5 text-white hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10 whitespace-nowrap">High Impact (2.5x)</button>
        <button className="bg-white/5 text-white hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10 whitespace-nowrap">Asia Pacific</button>
        <button className="bg-white/5 text-white hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10 whitespace-nowrap">South America</button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {MOCK_PROJECTS.map((project) => (
          <div key={project.id} className="bg-anirvan-card border border-white/10 rounded-xl overflow-hidden hover:border-anirvan-accent/50 transition-all group">
            <div className="h-48 overflow-hidden relative">
              <img src={project.image} alt="Forest" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-lime-400 font-mono border border-lime-500/30">
                {project.multiplier} Impact
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-white">{project.location}</h3>
                <span className="text-xs text-anirvan-muted bg-white/5 px-2 py-1 rounded">{project.type}</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
  {renderSpecies(project.species)} <span className="mx-2 text-white/10">•</span> {project.area}
</p>
              
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-anirvan-muted mb-1">Price per ton</div>
                  <div className="text-xl font-bold text-white flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> 24.50
                  </div>
                </div>
                <button className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  Fund Project
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between text-xs text-anirvan-muted">
               <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Verified by Chainlink</span>
               <span>ID: #{4920 + project.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



export default EnterpriseView;
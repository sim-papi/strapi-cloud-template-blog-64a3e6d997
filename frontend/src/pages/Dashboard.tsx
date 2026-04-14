import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Factory, Cpu, Grid3X3, Tag, Box, Utensils, Columns2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getMachines, getErrors } from '../services/strapi';

const iconMap: Record<string, any> = {
  precision_manufacturing: Factory,
  settings_input_component: Cpu,
  grid_view: Grid3X3,
  label: Tag,
  conveyor_belt: Box,
  restaurant: Utensils,
  splitscreen: Columns2,
  thermoformer: Cpu,
  'h-module': Factory,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [machinesData, errorsData] = await Promise.all([
        getMachines(),
        getErrors()
      ]);

      if (!machinesData || !errorsData) {
        setStats([]);
        return;
      }

      const calculatedStats = machinesData.map((machine: any) => {
        const mAttrs = machine.attributes || machine;
        const machineName = mAttrs.machine_type || mAttrs.name;
        
        // Filter errors belonging to this machine
        // Assuming there is a relation or we match by machine_type string for now
        // If there's a proper relation, we'd use machine.id
        const machineErrors = errorsData.filter((err: any) => {
          const eAttrs = err.attributes || err;
          
          // Check for 'machines' relation (plural as per user info)
          const machinesRel = eAttrs.machines?.data || eAttrs.machines;
          
          if (Array.isArray(machinesRel)) {
            return machinesRel.some((m: any) => {
              const mAttrs = m.attributes || m;
              return (mAttrs.machine_type || mAttrs.name) === machineName;
            });
          }
          
          // Fallback to single machine or direct field
          const machineRef = eAttrs.machine?.data?.attributes?.machine_type || eAttrs.machine_type;
          return machineRef === machineName;
        });

        const totalErrors = machineErrors.length;
        const errorsWithCauses = machineErrors.filter((err: any) => {
          const eAttrs = err.attributes || err;
          const causes = eAttrs.causes?.data || eAttrs.causes;
          return causes && causes.length > 0;
        }).length;

        const coverage = totalErrors > 0 ? Math.round((errorsWithCauses / totalErrors) * 100) : 0;
        const missingCauses = totalErrors - errorsWithCauses;

        return {
          id: machine.id,
          name: machineName,
          slug: mAttrs.slug || machineName.toLowerCase().replace(/\s+/g, '-'),
          icon: mAttrs.icon?.toLowerCase() || machineName.toLowerCase().replace(/\s+/g, '-'),
          totalErrors,
          coverage,
          missingCauses
        };
      });

      setStats(calculatedStats);
    } catch (err: any) {
      console.error('Dashboard load failed:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Analyzing Database Coverage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-primary font-headline uppercase">Sync Error</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="bg-secondary text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-secondary/90 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Re-establish Connection
        </button>
      </div>
    );
  }

  const aggregateCoverage = stats.length > 0 
    ? Math.round(stats.reduce((acc, curr) => acc + curr.coverage, 0) / stats.length * 10) / 10 
    : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary mb-2 uppercase">Database Coverage</h1>
        <p className="text-on-surface-variant max-w-xl text-sm">
          Real-time analysis of knowledge base completeness and missing diagnostic data across the Unit Alpha fleet.
        </p>
      </div>

      <div className="bg-white border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-outline-variant">
                <th className="px-6 py-4 text-[11px] font-serif italic uppercase tracking-widest text-slate-400 border-r border-outline-variant">Machine Type</th>
                <th className="px-6 py-4 text-[11px] font-serif italic uppercase tracking-widest text-slate-400 text-center border-r border-outline-variant">Total Errors</th>
                <th className="px-6 py-4 text-[11px] font-serif italic uppercase tracking-widest text-slate-400 text-center border-r border-outline-variant">Knowledge Coverage</th>
                <th className="px-6 py-4 text-[11px] font-serif italic uppercase tracking-widest text-slate-400 text-center">Missing Causes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {stats.map((machine) => {
                const Icon = iconMap[machine.icon] || iconMap[machine.name.toLowerCase()] || Cpu;
                const isLow = machine.coverage < 85;
                return (
                  <tr 
                    key={machine.id} 
                    onClick={() => navigate(`/machine/${machine.slug}`)}
                    className="hover:bg-primary transition-all duration-200 group cursor-pointer"
                  >
                    <td className="px-6 py-5 border-r border-outline-variant transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-slate-400 group-hover:text-white/70 transition-colors" />
                        <span className="font-headline font-bold text-primary group-hover:text-white tracking-tight transition-colors">{machine.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-mono font-bold text-on-surface-variant group-hover:text-white border-r border-outline-variant transition-colors">
                      {machine.totalErrors}
                    </td>
                    <td className="px-6 py-5 border-r border-outline-variant transition-colors">
                      <div className="flex flex-col gap-1 items-center">
                        <span className={`text-[10px] font-mono font-bold ${isLow ? 'text-orange-600 group-hover:text-orange-300' : 'text-emerald-600 group-hover:text-emerald-300'} transition-colors`}>
                          {machine.coverage}%
                        </span>
                        <div className="w-24 h-1 bg-slate-100 group-hover:bg-white/20 rounded-full overflow-hidden transition-colors">
                          <div 
                            className={`h-full ${isLow ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${machine.coverage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center transition-colors">
                      <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-sm ${
                        machine.missingCauses > 0 
                          ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white border border-orange-100 group-hover:border-transparent' 
                          : 'bg-slate-100 text-on-surface-variant group-hover:bg-white/10 group-hover:text-white/50'
                      } transition-colors`}>
                        {machine.missingCauses}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-outline-variant flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold font-mono">Aggregate Coverage Score: {aggregateCoverage}%</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Live Sync Active</span>
        </div>
      </div>
    </div>
  );
}

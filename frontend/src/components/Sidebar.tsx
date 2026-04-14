import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Cpu, Layers, Factory, Tag, Box, Utensils, LayoutGrid, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getMachines } from '../services/strapi';

const iconMap: Record<string, any> = {
  dashboard: LayoutDashboard,
  thermoformer: Cpu,
  traysealer: Layers,
  'h-module': Factory,
  labeller: Tag,
  flowpacker: Box,
  slicer: Utensils,
  portionierer: LayoutGrid,
};

export default function Sidebar() {
  const location = useLocation();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMachines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMachines();
      const formattedMachines = data.map((item: any) => {
        const attrs = item.attributes || item;
        const name = attrs.machine_type || attrs.name || 'Unknown Machine';
        return {
          id: item.id,
          name: name,
          slug: attrs.slug || name.toLowerCase().replace(/\s+/g, '-'),
          icon: attrs.icon?.toLowerCase() || 'settings'
        };
      });
      setMachines(formattedMachines);
    } catch (err: any) {
      console.error('Failed to fetch machines:', err);
      setError(err.message || 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  return (
    <aside className="fixed left-0 h-full w-64 border-r border-outline-variant bg-white flex flex-col pt-20 pb-4 z-40">
      <div className="px-6 mb-10">
        <div className="text-2xl font-extrabold text-primary font-headline leading-tight">MULTIVAC</div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Error Solving Center</div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        <Link
          to="/"
          className={`flex items-center px-6 py-3.5 transition-colors font-body text-[11px] uppercase tracking-widest font-bold ${
            location.pathname === '/'
              ? 'text-secondary border-r-[3px] border-secondary bg-slate-50'
              : 'text-on-surface-variant hover:bg-surface'
          }`}
        >
          <LayoutDashboard className={`mr-4 w-5 h-5 ${location.pathname === '/' ? 'text-secondary' : 'text-on-surface-variant'}`} />
          Dashboard
        </Link>

        {loading ? (
          <div className="px-6 py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing...</span>
          </div>
        ) : error ? (
          <div className="px-6 py-8 space-y-3">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sync Failed</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              {error}
            </p>
            <button 
              onClick={loadMachines}
              className="text-[9px] font-bold text-secondary uppercase tracking-widest hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry Connection
            </button>
          </div>
        ) : (
          machines.map((machine) => {
            const Icon = iconMap[machine.slug] || Cpu;
            const path = `/machine/${machine.slug}`;
            const isActive = location.pathname === path;
            return (
              <Link
                key={machine.id}
                to={path}
                className={`flex items-center px-6 py-3.5 transition-colors font-body text-[11px] uppercase tracking-widest font-bold ${
                  isActive
                    ? 'text-secondary border-r-[3px] border-secondary bg-slate-50'
                    : 'text-on-surface-variant hover:bg-surface'
                }`}
              >
                <Icon className={`mr-4 w-5 h-5 ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`} />
                {machine.name}
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Filter, FileDown, ChevronRight, ChevronLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getErrors } from '../services/strapi';

export default function ErrorList() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const machineName = machineId ? machineId.charAt(0).toUpperCase() + machineId.slice(1) : 'Machine';

  const loadErrors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getErrors();
      if (!data || !Array.isArray(data)) {
        setErrors([]);
        setLoading(false);
        return;
      }
      // Filter errors by machine slug or type
      const filteredErrors = data.filter((err: any) => {
        const attrs = err.attributes || err;
        
        // Check for 'machines' relation (plural as per user info)
        const machinesRel = attrs.machines?.data || attrs.machines;
        
        if (Array.isArray(machinesRel)) {
          return machinesRel.some((m: any) => {
            const mAttrs = m.attributes || m;
            const mSlug = mAttrs.slug || (mAttrs.machine_type || mAttrs.name)?.toLowerCase().replace(/\s+/g, '-');
            return mSlug === machineId?.toLowerCase();
          });
        }

        const machineRef = attrs.machine?.data?.attributes?.slug || 
                          attrs.machine?.data?.attributes?.machine_type?.toLowerCase() ||
                          attrs.machine_type?.toLowerCase();
        return machineRef === machineId?.toLowerCase();
      }).map((err: any) => {
        const attrs = err.attributes || err;
        const causes = attrs.causes?.data || attrs.causes || [];
        return {
          id: err.id,
          code: attrs.error_id || attrs.code,
          description: attrs.description,
          shortDescription: attrs.orientation_check || attrs.shortDescription,
          solutionsCount: causes.length
        };
      });
      setErrors(filteredErrors);
    } catch (err: any) {
      console.error('Failed to fetch errors:', err);
      setError(err.message || 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  };

  const filteredBySearch = errors.filter(err => 
    err.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadErrors();
  }, [machineId]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Accessing Error Database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center">
        <AlertTriangle className="w-12 h-12 text-error" />
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-primary font-headline uppercase">Database Error</h2>
          <p className="text-sm text-on-surface-variant">{error}</p>
        </div>
        <button onClick={loadErrors} className="bg-secondary text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-secondary"></div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary font-mono">Machine Database</span>
          </div>
          <h1 className="text-5xl font-extrabold text-primary tracking-tight capitalize font-headline">
            {machineId?.replace(/-/g, ' ')}
          </h1>
          <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
            Technical error documentation and resolution protocols for {machineId?.replace(/-/g, ' ')} systems. 
            Select an entry to view detailed diagnostic data.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-secondary transition-colors" />
            <input
              type="text"
              placeholder="SEARCH DATABASE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3 bg-white border border-outline-variant rounded-none focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all w-64 font-mono text-[11px] uppercase tracking-wider"
            />
          </div>
          <button className="p-3 bg-white border border-outline-variant hover:border-secondary hover:text-secondary transition-all rounded-none">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-3 bg-white border border-outline-variant hover:border-secondary hover:text-secondary transition-all rounded-none">
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-outline-variant shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[140px_1fr_120px_60px] border-b border-outline-variant bg-slate-50">
          <div className="px-6 py-4 font-serif italic text-[11px] uppercase tracking-widest text-slate-400 border-r border-outline-variant">Error ID</div>
          <div className="px-6 py-4 font-serif italic text-[11px] uppercase tracking-widest text-slate-400 border-r border-outline-variant">Diagnostic Description</div>
          <div className="px-6 py-4 font-serif italic text-[11px] uppercase tracking-widest text-slate-400 border-r border-outline-variant text-center">Solutions</div>
          <div className="px-6 py-4 font-serif italic text-[11px] uppercase tracking-widest text-slate-400 flex justify-center">
            <RefreshCw className="w-3 h-3" />
          </div>
        </div>

        {filteredBySearch.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-slate-400 font-serif italic">No entries found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {filteredBySearch.map((err) => (
              <Link
                key={err.id}
                to={`/error/${err.code}`}
                className="grid grid-cols-[140px_1fr_120px_60px] group hover:bg-primary transition-all duration-200"
              >
                <div className="px-6 py-5 font-mono text-[12px] font-bold text-primary group-hover:text-white border-r border-outline-variant transition-colors">
                  {err.code}
                </div>
                <div className="px-6 py-5 border-r border-outline-variant transition-colors">
                  <div className="text-[14px] font-bold text-primary group-hover:text-white mb-1 transition-colors">
                    {err.description}
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">
                    {err.shortDescription}
                  </div>
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-r border-outline-variant transition-colors">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-tighter rounded-sm ${
                    err.solutionsCount > 0 
                      ? 'bg-secondary/10 text-secondary group-hover:bg-white/20 group-hover:text-white' 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-white/10 group-hover:text-white/50'
                  }`}>
                    {err.solutionsCount} {err.solutionsCount === 1 ? 'REMEDY' : 'REMEDIES'}
                  </span>
                </div>
                <div className="flex items-center justify-center group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-slate-400">
        <div className="flex items-center gap-4">
          <span>Total Entries: {filteredBySearch.length}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
          <span>System Status: Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Last Sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

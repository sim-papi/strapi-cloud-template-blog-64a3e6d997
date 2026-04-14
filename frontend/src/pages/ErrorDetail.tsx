import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, PlusCircle, Trash2, ChevronUp, ChevronDown, AlertTriangle, Info, Send, Loader2, RefreshCw, Save, Edit3, X } from 'lucide-react';
import { getErrors, updateError } from '../services/strapi';
import { motion } from 'motion/react';

export default function ErrorDetail() {
  const { errorCode } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAddingCause, setIsAddingCause] = useState(false);
  const [addingItem, setAddingItem] = useState<{causeId: number, field: 'indicators' | 'steps'} | null>(null);
  const [addingCondition, setAddingCondition] = useState(false);
  const [addingSafety, setAddingSafety] = useState<'prohibited' | 'escalation' | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  
  const [newCauseForm, setNewCauseForm] = useState({
    designation: '',
    probability: 'medium',
    estTime: 30,
    indicators: '',
    steps: ''
  });

  const loadErrorDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const allErrors = await getErrors();
      const foundError = allErrors.find((err: any) => {
        const attrs = err.attributes || err;
        return (attrs.error_id || attrs.code) === errorCode;
      });

      if (!foundError) {
        throw new Error(`Error record ${errorCode} not found in database.`);
      }

      const attrs = foundError.attributes || foundError;
      
      // Transform Strapi data to match UI expectations
      const transformedData = {
        id: foundError.id,
        documentId: foundError.documentId,
        code: attrs.error_id || attrs.code,
        title: attrs.description || 'Untitled Error',
        machineType: attrs.machine?.data?.attributes?.machine_type || attrs.machine_type || 'Unknown Machine',
        condition: attrs.condition || attrs.conditions || 'Standard production environment',
        causes: (attrs.causes?.data || attrs.causes || []).map((cause: any, index: number) => {
          const cAttrs = cause.attributes || cause;
          return {
            id: cause.id,
            rank: typeof cAttrs.rank === 'number' ? cAttrs.rank : (parseInt(cAttrs.rank) || index + 1),
            probability: (cAttrs.probability || 'medium').toLowerCase(),
            estTime: cAttrs.estimated_time || cAttrs.est_time || 30,
            designation: cAttrs.designation || cAttrs.title || 'Unknown Cause',
            indicators: cAttrs.detection || cAttrs.indicators || '',
            steps: cAttrs.solution || cAttrs.steps || 'Inspect component for visible damage.'
          };
        }),
        safetyProhibited: attrs.prohibited_actions || attrs.safety_prohibited || 'Do not bypass safety interlocks.',
        safetyEscalation: attrs.technical_escalation || attrs.safety_escalation || 'Contact supervisor if issue persists.',
        peerIntelligence: typeof attrs.comment === 'string' 
          ? attrs.comment.split('\n\n').filter(Boolean).map((commentBlock: string) => {
              const lines = commentBlock.split('\n');
              const header = lines[0] || '';
              const content = lines.slice(1).join('\n');
              const match = header.match(/\[(.*?)\] (.*?) \((.*?)\)/);
              
              if (match) {
                return {
                  date: match[1],
                  author: match[2],
                  role: match[3],
                  content: content,
                  initials: match[2].split(' ').map((n: string) => n[0]).join('').toUpperCase()
                };
              }
              return {
                author: 'System User',
                role: 'Technician',
                date: new Date().toLocaleDateString(),
                content: commentBlock,
                initials: 'SU'
              };
            })
          : []
      };

      setData(transformedData);
    } catch (err: any) {
      console.error('Failed to fetch error detail:', err);
      setError(err.message || 'Failed to load error details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCause = () => {
    setIsAddingCause(true);
    setNewCauseForm({
      designation: '',
      probability: 'medium',
      estTime: 30,
      indicators: '',
      steps: ''
    });
  };

  const handleSaveNewCause = async () => {
    if (!data || !data.documentId || !newCauseForm.designation) return;
    
    setSaving(true);
    try {
      const newCause = {
        rank: data.causes.length + 1,
        probability: newCauseForm.probability.toLowerCase(),
        estimated_time: newCauseForm.estTime,
        designation: newCauseForm.designation,
        detection: newCauseForm.indicators,
        solution: newCauseForm.steps
      };

      // In Strapi 5, we update the error record and include the new cause in the causes array
      // We remove 'id' from existing causes to avoid "Invalid key id" errors if the schema is strict
      const existingCauses = data.causes.map((c: any) => ({
        rank: typeof c.rank === 'number' ? c.rank : (parseInt(c.rank) || 1),
        probability: c.probability.toLowerCase(),
        estimated_time: c.estTime,
        designation: c.designation,
        detection: c.indicators,
        solution: c.steps
      }));
      
      const updatedCauses = [...existingCauses, newCause];
      
      await updateError(data.documentId, {
        causes: updatedCauses
      });

      setIsAddingCause(false);
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to save new cause:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!addingItem || !newItemValue.trim() || !data) return;
    const { causeId, field } = addingItem;

    const cause = data.causes.find((c: any) => c.id === causeId);
    if (!cause) return;

    const strapiFieldMap = {
      indicators: 'detection',
      steps: 'solution'
    };

    const strapiField = strapiFieldMap[field];
    const currentValue = cause[field] || '';
    const newValue = currentValue ? `${currentValue}\n${newItemValue.trim()}` : newItemValue.trim();

    setSaving(true);
    try {
      const updatedCauses = data.causes.map((c: any) => {
        const causeData: any = {
          rank: typeof c.rank === 'number' ? c.rank : (parseInt(c.rank) || 1),
          probability: c.probability.toLowerCase(),
          estimated_time: c.estTime,
          designation: c.designation,
          detection: c.indicators,
          solution: c.steps
        };

        if (c.id === causeId) {
          causeData[strapiField] = newValue;
        }
        return causeData;
      });

      await updateError(data.documentId, {
        causes: updatedCauses
      });

      setAddingItem(null);
      setNewItemValue('');
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to add item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = async () => {
    if (!newItemValue.trim() || !data || !data.documentId) return;

    // If it's the default text, replace it. Otherwise append.
    const isDefault = data.condition === 'Standard production environment';
    const currentConditions = isDefault ? '' : (data.condition || '');
    const updatedConditions = currentConditions ? `${currentConditions}\n${newItemValue.trim()}` : newItemValue.trim();

    setSaving(true);
    try {
      await updateError(data.documentId, {
        condition: updatedConditions
      });
      setAddingCondition(false);
      setNewItemValue('');
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to add condition:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCauseField = async (causeId: number, field: string, value: any) => {
    if (!data || !data.documentId) return;

    const strapiFieldMap: any = {
      designation: 'designation',
      probability: 'probability',
      estTime: 'estimated_time'
    };

    const strapiField = strapiFieldMap[field];
    if (!strapiField) return;

    setSaving(true);
    try {
      const updatedCauses = data.causes.map((c: any) => {
        const causeData: any = {
          rank: typeof c.rank === 'number' ? c.rank : (parseInt(c.rank) || 1),
          probability: c.probability.toLowerCase(),
          estimated_time: c.estTime,
          designation: c.designation,
          detection: c.indicators,
          solution: c.steps
        };

        if (c.id === causeId) {
          causeData[strapiField] = field === 'probability' ? value.toLowerCase() : value;
        }
        return causeData;
      });

      await updateError(data.documentId, {
        causes: updatedCauses
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to update cause field:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCondition = async (index: number) => {
    if (!data || !data.documentId) return;

    const conditions = (data.condition || '').split('\n').filter(Boolean);
    conditions.splice(index, 1);
    const updatedConditions = conditions.join('\n');

    setSaving(true);
    try {
      await updateError(data.documentId, {
        condition: updatedConditions
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to delete condition:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCause = async (causeId: number) => {
    if (!data || !data.documentId) return;

    setSaving(true);
    try {
      const updatedCauses = data.causes
        .filter((c: any) => c.id !== causeId)
        .map((c: any) => ({
          rank: typeof c.rank === 'number' ? c.rank : (parseInt(c.rank) || 1),
          probability: c.probability.toLowerCase(),
          estimated_time: c.estTime,
          designation: c.designation,
          detection: c.indicators,
          solution: c.steps
        }));

      await updateError(data.documentId, {
        causes: updatedCauses
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to delete cause:', err);
      // Using console.error instead of alert as per iframe restrictions
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (causeId: number, field: 'indicators' | 'steps', index: number) => {
    const cause = data.causes.find((c: any) => c.id === causeId);
    if (!cause) return;

    const strapiFieldMap = {
      indicators: 'detection',
      steps: 'solution'
    };

    const strapiField = strapiFieldMap[field];
    const items = (cause[field] || '').split('\n').filter(Boolean);
    items.splice(index, 1);
    const newValue = items.join('\n');

    setSaving(true);
    try {
      const updatedCauses = data.causes.map((c: any) => {
        const causeData: any = {
          rank: typeof c.rank === 'number' ? c.rank : (parseInt(c.rank) || 1),
          probability: c.probability.toLowerCase(),
          estimated_time: c.estTime,
          designation: c.designation,
          detection: c.indicators,
          solution: c.steps
        };

        if (c.id === causeId) {
          causeData[strapiField] = newValue;
        }
        return causeData;
      });

      await updateError(data.documentId, {
        causes: updatedCauses
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRank = async (causeId: number, direction: 'up' | 'down') => {
    if (!data || !data.documentId) return;

    const currentCause = data.causes.find((c: any) => c.id === causeId);
    if (!currentCause) return;

    const currentRank = typeof currentCause.rank === 'number' ? currentCause.rank : parseInt(currentCause.rank);
    const targetRank = direction === 'up' ? Math.max(1, currentRank - 1) : currentRank + 1;

    if (currentRank === targetRank) return;

    setSaving(true);
    try {
      const updatedCauses = data.causes.map((c: any) => {
        const cRank = typeof c.rank === 'number' ? c.rank : parseInt(c.rank);
        let newRank = cRank;

        if (c.id === causeId) {
          newRank = targetRank;
        } else if (cRank === targetRank) {
          // Swap: the cause that was at the target rank now takes the old rank of the moved cause
          newRank = currentRank;
        }

        return {
          rank: newRank,
          probability: c.probability.toLowerCase(),
          estimated_time: c.estTime,
          designation: c.designation,
          detection: c.indicators,
          solution: c.steps
        };
      });

      // Sort by rank to keep things clean
      updatedCauses.sort((a: any, b: any) => a.rank - b.rank);

      await updateError(data.documentId, {
        causes: updatedCauses
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to update rank:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSafetyAction = async () => {
    if (!addingSafety || !newItemValue.trim() || !data || !data.documentId) return;

    const strapiField = addingSafety === 'prohibited' ? 'prohibited_actions' : 'technical_escalation';
    const dataField = addingSafety === 'prohibited' ? 'safetyProhibited' : 'safetyEscalation';
    
    const currentValue = data[dataField] || '';
    const updatedValue = currentValue ? `${currentValue}\n${newItemValue.trim()}` : newItemValue.trim();

    setSaving(true);
    try {
      await updateError(data.documentId, {
        [strapiField]: updatedValue
      });
      setAddingSafety(null);
      setNewItemValue('');
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to add safety action:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSafetyAction = async (field: 'safetyProhibited' | 'safetyEscalation', index: number) => {
    if (!data || !data.documentId) return;

    const strapiField = field === 'safetyProhibited' ? 'prohibited_actions' : 'technical_escalation';
    const items = (data[field] || '').split('\n').filter(Boolean);
    items.splice(index, 1);
    const updatedValue = items.join('\n');

    setSaving(true);
    try {
      await updateError(data.documentId, {
        [strapiField]: updatedValue
      });
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to delete safety action:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newItemValue.trim() || !data || !data.documentId) return;

    const author = 'Simon Papenberg';
    const role = 'Lead Engineer';
    const date = new Date().toLocaleDateString();
    
    // Format: [Date] Author (Role)
    // Content
    const newCommentString = `[${date}] ${author} (${role})\n${newItemValue.trim()}`;

    const currentComment = typeof data.peerIntelligence === 'string' ? data.peerIntelligence : 
                          (Array.isArray(data.peerIntelligence) 
                            ? data.peerIntelligence.map((c: any) => `[${c.date}] ${c.author} (${c.role})\n${c.content}`).join('\n\n')
                            : '');
    
    const updatedComment = currentComment ? `${currentComment}\n\n${newCommentString}` : newCommentString;

    setSaving(true);
    try {
      await updateError(data.documentId, {
        comment: updatedComment
      });
      setNewItemValue('');
      await loadErrorDetail();
    } catch (err: any) {
      console.error('Failed to add comment:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadErrorDetail();
  }, [errorCode]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-secondary" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Retrieving Technical Documentation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center">
        <AlertTriangle className="w-16 h-16 text-error" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary font-headline uppercase">Data Access Failed</h2>
          <p className="text-sm text-on-surface-variant">{error}</p>
        </div>
        <button onClick={loadErrorDetail} className="bg-secondary text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Navigation Back & Header */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ZURÜCK ZUR ÜBERSICHT
          </button>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-secondary uppercase bg-secondary/10 px-2 py-0.5 rounded-sm">
            {data.code}
          </span>
          <span className="h-px w-12 bg-outline-variant"></span>
          <span className="text-[10px] text-slate-400 font-serif italic uppercase tracking-widest">Error Definition File</span>
        </div>
        <h1 className="text-5xl font-extrabold text-primary font-headline tracking-tight">{data.title}</h1>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <section className="bg-white p-8 border border-outline-variant shadow-sm">
            <h3 className="text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Contextual Environment
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Operating Conditions</label>
                <ul className="space-y-3 mb-6">
                  {(data.condition?.split('\n') || []).filter(Boolean).map((condition: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 py-1 group">
                      <span className="w-1 h-1 bg-outline rounded-full mt-2.5 flex-shrink-0"></span>
                      <div className="flex-1 flex items-start gap-2">
                        <p className="text-sm text-on-surface-variant">{condition}</p>
                        <button 
                          onClick={() => handleDeleteCondition(i)}
                          disabled={saving}
                          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-error shrink-0 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => {
                    setAddingCondition(true);
                    setNewItemValue('');
                  }}
                  disabled={saving}
                  className="w-full border-2 border-dashed border-outline-variant py-3 flex items-center justify-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> ADD CONDITION
                </button>

                {addingCondition && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 space-y-3"
                  >
                    <input 
                      autoFocus
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
                      placeholder="Enter condition..."
                      className="w-full p-2 text-sm border border-outline-variant focus:outline-none focus:border-secondary"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAddingCondition(false)} className="text-[10px] font-bold text-slate-400 uppercase">Cancel</button>
                      <button onClick={handleAddCondition} disabled={saving || !newItemValue.trim()} className="text-[10px] font-bold text-secondary uppercase">Confirm</button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Potential Technical Causes
              </h3>
              {!isAddingCause && (
                <button 
                  onClick={handleAddCause}
                  className="bg-primary text-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-primary-container transition-all"
                >
                  <PlusCircle className="w-4 h-4" /> Add Potential Cause
                </button>
              )}
            </div>

            {isAddingCause && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-secondary p-8 shadow-lg mb-8"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-primary uppercase tracking-widest">New Potential Cause Definition</h4>
                  <button onClick={() => setIsAddingCause(false)} className="text-slate-400 hover:text-error transition-colors">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Designation / Title</label>
                    <input 
                      value={newCauseForm.designation}
                      onChange={(e) => setNewCauseForm({...newCauseForm, designation: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-outline-variant focus:outline-none focus:border-secondary font-headline font-bold text-lg"
                      placeholder="e.g. Mechanical obstruction in picker arm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Probability</label>
                    <select 
                      value={newCauseForm.probability}
                      onChange={(e) => setNewCauseForm({...newCauseForm, probability: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-outline-variant focus:outline-none focus:border-secondary font-bold text-secondary"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="rare">Rare</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Est. Time (Min)</label>
                    <input 
                      type="number"
                      step="10"
                      value={newCauseForm.estTime}
                      onChange={(e) => setNewCauseForm({...newCauseForm, estTime: parseInt(e.target.value) || 0})}
                      className="w-full p-3 bg-slate-50 border border-outline-variant focus:outline-none focus:border-secondary font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detection Indicators</label>
                    <textarea 
                      value={newCauseForm.indicators}
                      onChange={(e) => setNewCauseForm({...newCauseForm, indicators: e.target.value})}
                      className="w-full h-24 p-3 bg-slate-50 border border-outline-variant focus:outline-none focus:border-secondary text-sm font-mono"
                      placeholder="One indicator per line..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Solution Steps</label>
                    <textarea 
                      value={newCauseForm.steps}
                      onChange={(e) => setNewCauseForm({...newCauseForm, steps: e.target.value})}
                      className="w-full h-32 p-3 bg-slate-50 border border-outline-variant focus:outline-none focus:border-secondary text-sm font-mono"
                      placeholder="One step per line..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setIsAddingCause(false)}
                    className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-outline-variant hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveNewCause}
                    disabled={saving || !newCauseForm.designation}
                    className="px-8 py-2 text-[10px] font-bold text-white uppercase tracking-widest bg-secondary hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Potential Cause
                  </button>
                </div>
              </motion.div>
            )}

            {data.causes.length === 0 && !isAddingCause ? (
              <div className="bg-white border border-outline-variant border-dashed p-12 text-center rounded-lg">
                <p className="text-sm text-slate-400 italic">No potential causes documented yet for this error.</p>
              </div>
            ) : (
              data.causes.map((cause: any) => (
                <div key={cause.id} className="bg-white border border-outline-variant overflow-hidden relative group shadow-sm">
                  <button 
                    onClick={() => handleDeleteCause(cause.id)}
                    disabled={saving}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-error transition-colors z-10 disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="flex">
                    <div className={`w-2 ${cause.rank === '01' ? 'bg-secondary' : 'bg-slate-300 group-hover:bg-secondary transition-colors'}`}></div>
                    <div className="flex-1 p-8">
                      <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-10">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0.5">
                                <button 
                                  onClick={() => handleUpdateRank(cause.id, 'up')}
                                  disabled={saving}
                                  className="text-slate-300 hover:text-secondary transition-colors leading-none disabled:opacity-50"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleUpdateRank(cause.id, 'down')}
                                  disabled={saving}
                                  className="text-slate-300 hover:text-secondary transition-colors leading-none disabled:opacity-50"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Rank</p>
                                <p className="text-2xl font-extrabold font-headline text-primary">{String(cause.rank).padStart(2, '0')}</p>
                              </div>
                            </div>
                            <div className="flex items-end gap-8">
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Probability</p>
                                <select 
                                  value={cause.probability}
                                  onChange={(e) => handleUpdateCauseField(cause.id, 'probability', e.target.value)}
                                  disabled={saving}
                                  className="bg-transparent border-none p-0 text-secondary font-bold text-sm focus:ring-0 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="rare">Rare</option>
                                </select>
                              </div>
                              <div className="flex flex-col items-center gap-1 shrink-0 bg-slate-50 px-3 py-1.5 rounded-sm">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Est. Time</p>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number"
                                    step="10"
                                    value={cause.estTime}
                                    onChange={(e) => handleUpdateCauseField(cause.id, 'estTime', parseInt(e.target.value) || 0)}
                                    disabled={saving}
                                    className="w-10 bg-transparent border-none p-0 text-xs font-mono text-center focus:ring-0 disabled:opacity-50"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Designation</p>
                          <input 
                            value={cause.designation}
                            onChange={(e) => handleUpdateCauseField(cause.id, 'designation', e.target.value)}
                            disabled={saving}
                            className="w-full bg-transparent border-none p-0 text-lg font-bold font-headline text-primary focus:ring-0 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-8 mb-8">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Detection Indicators</label>
                          <ul className="space-y-2">
                            {(cause.indicators?.split('\n') || []).filter(Boolean).map((indicator: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 py-2 group/item">
                                <span className="w-1.5 h-1.5 bg-outline rounded-full mt-2 shrink-0"></span>
                                <div className="flex-1 flex items-start justify-between gap-2 border-b border-dashed border-slate-200 pb-1">
                                  <p className="text-sm text-on-surface-variant">{indicator}</p>
                                  <button 
                                    onClick={() => handleDeleteItem(cause.id, 'indicators', i)}
                                    disabled={saving}
                                    className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-error shrink-0 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                            <li>
                              {addingItem?.causeId === cause.id && addingItem?.field === 'indicators' ? (
                                <div className="mt-2 space-y-2">
                                  <input 
                                    autoFocus
                                    value={newItemValue}
                                    onChange={(e) => setNewItemValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder="Enter indicator..."
                                    className="w-full p-2 text-xs border border-outline-variant focus:outline-none focus:border-secondary"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setAddingItem(null)} className="text-[9px] font-bold text-slate-400 uppercase">Cancel</button>
                                    <button onClick={handleAddItem} disabled={saving || !newItemValue.trim()} className="text-[9px] font-bold text-secondary uppercase">Confirm</button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setAddingItem({ causeId: cause.id, field: 'indicators' });
                                    setNewItemValue('');
                                  }}
                                  disabled={saving}
                                  className="text-[10px] text-secondary font-bold hover:underline mt-2 uppercase tracking-wide disabled:opacity-50"
                                >
                                  {saving ? 'Updating...' : '+ ADD INDICATOR'}
                                </button>
                              )}
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Solution Implementation Steps</label>
                        <div className="space-y-4">
                          {(cause.steps?.split('\n') || []).filter(Boolean).map((step: string, i: number) => (
                            <div key={i} className="flex gap-4 group/step">
                              <span className="text-xs font-mono text-slate-400 pt-1">0{i+1}</span>
                              <div className="flex-1 flex items-start gap-2 py-1 border-b border-slate-50">
                                <p className="text-sm text-on-surface-variant">{step}</p>
                                <button 
                                  onClick={() => handleDeleteItem(cause.id, 'steps', i)}
                                  disabled={saving}
                                  className="text-slate-300 opacity-0 group-hover/step:opacity-100 transition-opacity hover:text-error shrink-0 mt-0.5 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-4">
                            <span className="text-xs font-mono text-slate-300 pt-3">0{(cause.steps?.split('\n') || []).filter(Boolean).length + 1}</span>
                            {addingItem?.causeId === cause.id && addingItem?.field === 'steps' ? (
                              <div className="flex-1 mt-2 space-y-2">
                                <input 
                                  autoFocus
                                  value={newItemValue}
                                  onChange={(e) => setNewItemValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                  placeholder="Enter solution step..."
                                  className="w-full p-2 text-xs border border-outline-variant focus:outline-none focus:border-secondary"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setAddingItem(null)} className="text-[9px] font-bold text-slate-400 uppercase">Cancel</button>
                                  <button onClick={handleAddItem} disabled={saving || !newItemValue.trim()} className="text-[9px] font-bold text-secondary uppercase">Confirm</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setAddingItem({ causeId: cause.id, field: 'steps' });
                                  setNewItemValue('');
                                }}
                                disabled={saving}
                                className="flex-1 border-2 border-dashed border-slate-100 text-[10px] font-bold text-slate-400 py-3 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest disabled:opacity-50"
                              >
                                {saving ? 'Updating...' : '+ Add solution step'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Safety Information */}
          <section className="bg-[#FFF4F4] border border-[#FFD0D0] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-error w-5 h-5" />
                <h3 className="text-[10px] font-serif italic font-bold text-error uppercase tracking-widest">Mandatory Safety Protocols</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Operator Prohibited Actions</label>
                  <button 
                    onClick={() => {
                      setAddingSafety('prohibited');
                      setNewItemValue('');
                    }}
                    disabled={saving}
                    className="text-[9px] font-bold text-error uppercase tracking-wider hover:underline disabled:opacity-50"
                  >
                    + ADD
                  </button>
                </div>
                <ul className="space-y-3">
                  {(data.safetyProhibited?.split('\n') || []).filter(Boolean).map((action: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-error bg-white/40 p-2 border-l-2 border-error/20 group">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{action}</span>
                      <button 
                        onClick={() => handleDeleteSafetyAction('safetyProhibited', i)}
                        disabled={saving}
                        className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-error transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                  {addingSafety === 'prohibited' && (
                    <li className="space-y-2">
                      <input 
                        autoFocus
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSafetyAction()}
                        placeholder="Enter prohibited action..."
                        className="w-full p-2 text-xs border border-error/30 focus:outline-none focus:border-error bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAddingSafety(null)} className="text-[9px] font-bold text-slate-400 uppercase">Cancel</button>
                        <button onClick={handleAddSafetyAction} disabled={saving || !newItemValue.trim()} className="text-[9px] font-bold text-error uppercase">Confirm</button>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Technician Escalation</label>
                  <button 
                    onClick={() => {
                      setAddingSafety('escalation');
                      setNewItemValue('');
                    }}
                    disabled={saving}
                    className="text-[9px] font-bold text-error uppercase tracking-wider hover:underline disabled:opacity-50"
                  >
                    + ADD
                  </button>
                </div>
                <ul className="space-y-3">
                  {(data.safetyEscalation?.split('\n') || []).filter(Boolean).map((action: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-error bg-white/40 p-2 border-l-2 border-error/20 group">
                      <ChevronUp className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{action}</span>
                      <button 
                        onClick={() => handleDeleteSafetyAction('safetyEscalation', i)}
                        disabled={saving}
                        className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-error transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                  {addingSafety === 'escalation' && (
                    <li className="space-y-2">
                      <input 
                        autoFocus
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSafetyAction()}
                        placeholder="Enter escalation step..."
                        className="w-full p-2 text-xs border border-error/30 focus:outline-none focus:border-error bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAddingSafety(null)} className="text-[9px] font-bold text-slate-400 uppercase">Cancel</button>
                        <button onClick={handleAddSafetyAction} disabled={saving || !newItemValue.trim()} className="text-[9px] font-bold text-error uppercase">Confirm</button>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Expert Knowledge Feed */}
          <section className="space-y-4 pb-24">
            <h3 className="text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Peer Intelligence
            </h3>
            <div className="space-y-4">
              {data.peerIntelligence.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-2">No peer intelligence notes available for this record.</p>
              ) : (
                data.peerIntelligence.map((note: any, i: number) => (
                  <div key={i} className="bg-white p-6 border border-outline-variant relative shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary-container text-white text-[10px] flex items-center justify-center font-bold">{note.initials}</div>
                        <div>
                          <p className="text-xs font-bold text-primary">{note.author}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">{note.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{note.date}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
              <div className="bg-white p-6 border border-outline-variant flex items-center justify-between group shadow-sm">
                <input 
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0" 
                  placeholder="Add technical note to this error record..." 
                  type="text"
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  disabled={saving}
                />
                <button 
                  onClick={handleAddComment}
                  disabled={saving || !newItemValue.trim()}
                  className="text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

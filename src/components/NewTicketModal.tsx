import React, { useState, useEffect } from 'react';
import { Machine, Ticket, User, TicketPriority, Warehouse, SectorGroup } from '../types';

interface NewTicketModalProps {
  onClose: () => void;
  onSubmit: (ticket: Partial<Ticket>) => void;
  editData?: Ticket;
  machines: Machine[];
  warehouses: Warehouse[];
  groups: SectorGroup[];
  currentUser: User | null;
}

const NewTicketModal: React.FC<NewTicketModalProps> = ({
  onClose, onSubmit, editData, machines, warehouses, groups, currentUser
}) => {
  const [formData, setFormData] = useState<Partial<Ticket>>({
    requester: currentUser?.name || '',
    manuseadoPor: '',
    title: '',
    sector: '',
    machineId: '',
    priority: TicketPriority.NORMAL,
    description: '',
    operator: currentUser?.name || '',
    galpao: '',
    grupo: '',
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        requester: editData.requester,
        galpao: editData.galpao,
        grupo: editData.grupo,
        manuseadoPor: editData.manuseadoPor,
        title: editData.title,
        sector: editData.sector,
        machineId: editData.machineId,
        priority: editData.priority,
        description: editData.description,
        operator: editData.operator || '',
      });
    } else if (currentUser && !formData.requester) {
      setFormData(prev => ({ ...prev, requester: currentUser.name, operator: currentUser.name }));
    }
  }, [currentUser, editData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machineId) {
      alert('Por favor, selecione uma máquina.');
      return;
    }

    if (!formData.description?.trim()) {
      alert('Por favor, descreva o problema.');
      return;
    }

    const selectedMachine = machines.find(m => m.id === formData.machineId);

    onSubmit({
      ...formData,
      title: selectedMachine?.name || 'Chamado sem Máquina',
      sector: formData.galpao || selectedMachine?.location || 'Geral'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-[#1c222d] rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <header className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
          <h2 className="text-lg font-bold flex-1 text-center font-display text-slate-900 dark:text-white">{editData ? 'Editar Chamado' : 'Novo Chamado'}</h2>
          <div className="w-10"></div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
          {/* Sessão: Identificação Técnica */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requerente</label>
                <input
                  readOnly={!!editData}
                  placeholder="Seu nome"
                  className={`w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-12 px-4 font-bold text-sm ${editData ? 'opacity-60' : ''} text-slate-900 dark:text-white`}
                  value={formData.requester}
                  onChange={(e) => setFormData(prev => ({ ...prev, requester: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operador *</label>
                <input
                  placeholder="Nome do operador"
                  className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-12 px-4 font-bold text-sm text-slate-900 dark:text-white"
                  value={formData.operator}
                  onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor / Galpão *</label>
                <select
                  required
                  className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-12 px-4 font-bold text-sm appearance-none text-slate-900 dark:text-white"
                  value={formData.galpao}
                  onChange={(e) => setFormData(prev => ({ ...prev, galpao: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grupo *</label>
                <select
                  required
                  className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-12 px-4 font-bold text-sm appearance-none text-slate-900 dark:text-white"
                  value={formData.grupo}
                  onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Máquina Relacionada *</label>
              <select
                required
                className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-12 px-4 font-bold text-sm appearance-none text-slate-900 dark:text-white"
                value={formData.machineId}
                onChange={(e) => setFormData(prev => ({ ...prev, machineId: e.target.value }))}
              >
                <option value="">Selecione o equipamento...</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.location})</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
              <div className="grid grid-cols-3 gap-2">
                {[TicketPriority.LOW, TicketPriority.NORMAL, TicketPriority.HIGH].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${formData.priority === p ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'bg-white dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2"></div>

          {/* Sessão: Descrição do Problema */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Descrição do Problema *
              </label>
            </div>
            <textarea
              required
              className="w-full rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 min-h-[150px] font-bold text-sm focus:ring-4 focus:ring-primary/10 transition-all no-scrollbar"
              placeholder="Descreva aqui o problema com o máximo de detalhes possível..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-primary text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all hover:brightness-110"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-xl">{editData ? 'save' : 'rocket_launch'}</span>
                {editData ? 'Salvar Alterações' : 'Abrir Chamado Técnico'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicketModal;


import React, { useState } from 'react';
import { Machine, SectorGroup, Warehouse, JobRole, User } from '../types';
import { useTheme } from './ThemeContext';
import defaultAvatar from '../assets/default-avatar.svg';
import NewUserModal from './NewUserModal';
import Avatar from './Avatar';
import { generateId } from '../utils';

interface AdminPanelProps {
  machines: Machine[];
  groups: SectorGroup[];
  warehouses: Warehouse[];
  jobRoles: JobRole[];
  users: User[];
  onUpdateMachines: (list: Machine[]) => void;
  onUpdateGroups: (list: SectorGroup[]) => void;
  onUpdateWarehouses: (list: Warehouse[]) => void;
  onUpdateJobRoles: (list: JobRole[]) => void;
  onAddUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  machines, groups, warehouses, jobRoles, users,
  onUpdateMachines, onUpdateGroups, onUpdateWarehouses, onUpdateJobRoles, onAddUser, onEditUser, onDeleteUser, onBack
}) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'machines' | 'groups' | 'warehouses' | 'roles' | 'users'>('machines');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormManufacturer('');
    setFormModel('');
    setFormSerial('');
    setFormLocation('');
    setFormImageUrl('');
    setEditingItem(null);
  };

  const handleOpenModal = (item?: any) => {
    if (activeTab === 'users') {
      setEditingItem(item || null);
      setIsUserModalOpen(true);
      return;
    }

    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      if (activeTab === 'machines') {
        setFormManufacturer(item.manufacturer || '');
        setFormModel(item.model || '');
        setFormSerial(item.serial || '');
        setFormLocation(item.location || '');
        setFormImageUrl(item.imageUrl || '');
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    // Validação: nome obrigatório para qualquer cadastro
    if (!formName || !formName.trim()) {
      alert('Preencha a Denominação Principal antes de salvar.');
      return;
    }
    if (activeTab === 'machines') {
      const newList = [...machines];
      if (editingItem) {
        const idx = newList.findIndex(i => i.id === editingItem.id);
        newList[idx] = { ...editingItem, name: formName, manufacturer: formManufacturer, model: formModel, serial: formSerial, location: formLocation, imageUrl: formImageUrl };
      } else {
        newList.push({ id: generateId(), name: formName, manufacturer: formManufacturer, model: formModel, serial: formSerial, location: formLocation, imageUrl: formImageUrl });
      }
      onUpdateMachines(newList);
    } else {
      const setter = activeTab === 'groups' ? onUpdateGroups : activeTab === 'warehouses' ? onUpdateWarehouses : onUpdateJobRoles;
      const currentList = activeTab === 'groups' ? groups : activeTab === 'warehouses' ? warehouses : jobRoles;
      const newList = [...currentList];
      if (editingItem) {
        const idx = newList.findIndex(i => i.id === editingItem.id);
        newList[idx] = { ...editingItem, name: formName };
      } else {
        // Use a temporary ID that clearly isn't a UUID
        newList.push({ id: `temp-${Date.now()}`, name: formName });
      }
      setter(newList);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setDeleteTarget({ id, name: (machines.find(m => m.id === id) || groups.find(g => g.id === id) || warehouses.find(w => w.id === id) || jobRoles.find(j => j.id === id) || users.find(u => u.id === id))?.name || '' , tab: activeTab });
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; tab: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    if (deleteTarget.tab === 'users') onDeleteUser(id);
    else if (deleteTarget.tab === 'machines') onUpdateMachines(machines.filter(m => m.id !== id));
    else if (deleteTarget.tab === 'groups') onUpdateGroups(groups.filter(g => g.id !== id));
    else if (deleteTarget.tab === 'warehouses') onUpdateWarehouses(warehouses.filter(w => w.id !== id));
    else onUpdateJobRoles(jobRoles.filter(j => j.id !== id));

    setDeleteTarget(null);
  };

  const currentList = activeTab === 'machines' ? machines :
    activeTab === 'groups' ? groups :
      activeTab === 'warehouses' ? warehouses :
        activeTab === 'roles' ? jobRoles : users;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-sans">
      <header className="sticky top-0 z-50 flex items-center bg-white/70 dark:bg-slate-900/70 ios-blur px-6 py-5 border-b border-slate-200 dark:border-slate-800 justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white leading-none">Configurações</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Painel Administrativo Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex md:hidden size-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <span className="material-symbols-outlined text-[22px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="size-10 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-90 transition-all hover:brightness-110"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>
      </header>

      <nav className="flex bg-white/50 dark:bg-slate-900/50 ios-blur border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar px-4">
        {[
          { id: 'machines', label: 'Máquinas', icon: 'precision_manufacturing' },
          { id: 'groups', label: 'Grupos', icon: 'grid_view' },
          { id: 'warehouses', label: 'Galpões', icon: 'factory' },
          { id: 'roles', label: 'Funções', icon: 'badge' },
          { id: 'users', label: 'Equipe', icon: 'group' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex flex-col items-center py-4 px-2 min-w-[100px] gap-2 transition-all relative ${activeTab === tab.id ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-4 right-4 h-1 bg-primary rounded-t-full shadow-[0_-2px_6_rgba(59,130,246,0.3)]"></div>
            )}
          </button>
        ))}
      </nav>

      <main className="p-6 space-y-4 max-w-4xl mx-auto w-full pb-32">
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Dados Atual</p>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">{currentList.length} Registros</p>
        </div>

        {currentList.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
            <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl opacity-40">inventory_2</span>
            </div>
            <p className="font-display font-bold text-lg text-slate-400">Nenhum dado encontrado</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1 text-slate-500">Toque em + para cadastrar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentList.map((item: any) => (
              <div key={item.id} className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {activeTab === 'machines' && (
                    <div
                      className="size-14 rounded-2xl bg-white dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner flex items-center justify-center overflow-hidden"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-2xl">precision_manufacturing</span>
                      )}
                    </div>
                  )}
                  {activeTab === 'users' && (
                    <div className="size-14 rounded-2xl shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner overflow-hidden">
                      <Avatar src={item.avatar || null} name={item.name} className="size-full bg-cover bg-center" />
                    </div>
                  )}
                  {activeTab !== 'machines' && activeTab !== 'users' && (
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">{tabIcon(activeTab)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate font-display tracking-tight">{item.name}</p>
                    {activeTab === 'machines' && (
                      <p className="text-[10px] text-primary uppercase font-black tracking-tighter mt-0.5">{item.manufacturer} <span className="text-slate-300 mx-1">/</span> {item.model}</p>
                    )}
                    {activeTab === 'users' && (
                      <div className="flex flex-col">
                        <p className="text-[10px] text-primary uppercase font-black tracking-tighter mt-0.5">{item.role} <span className="text-slate-300 mx-1">/</span> {item.nickname || 'sem usuário'}</p>
                        {item.email && <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{item.email}</p>}
                      </div>
                    )}
                    {activeTab !== 'machines' && activeTab !== 'users' && (
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">ID: {item.id.slice(0, 8)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="size-10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit_square</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="size-10 flex items-center justify-center text-slate-400 hover:text-danger hover:bg-danger/10 rounded-2xl transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isUserModalOpen && (
        <NewUserModal
          onClose={() => { setIsUserModalOpen(false); setEditingItem(null); }}
          onSubmit={(user) => {
            if (editingItem) onEditUser(user);
            else onAddUser(user);
          }}
          editData={editingItem}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 border border-white/10">
            <div className="size-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-red-500/20">
              <span className="material-symbols-outlined text-5xl">warning</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-3 font-display uppercase tracking-tight">Confirmar Exclusão</h3>
            <p className="text-sm font-bold text-slate-500 text-center mb-8 px-2 leading-relaxed">
              Confirma exclusão de <span className="font-extrabold text-red-500">{deleteTarget.name || deleteTarget.id}</span>? Esta ação removerá permanentemente o registro.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmDelete}
                className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Confirmar e Excluir
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-white/10">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h2 className="font-black text-lg font-display tracking-tight text-slate-900 dark:text-white uppercase leading-none">{editingItem ? 'Editar' : 'Novo'} {activeTab === 'machines' ? 'Mecânica' : activeTab === 'groups' ? 'Grupo' : activeTab === 'warehouses' ? 'Galpão' : 'Cargo'}</h2>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Formulário de Cadastro Profissional</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Denominação Principal *</label>
                <input
                  autoFocus
                  className="w-full rounded-[1.5rem] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 px-6"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Digite o nome identificador..."
                />
              </div>

              {activeTab === 'machines' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fabricante</label>
                      <input
                        className="w-full rounded-[1.25rem] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-12 px-5"
                        value={formManufacturer}
                        onChange={(e) => setFormManufacturer(e.target.value)}
                        placeholder="Ex: Juki"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                      <input
                        className="w-full rounded-[1.25rem] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-12 px-5"
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        placeholder="Ex: S-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Série Técnico</label>
                    <input
                      className="w-full rounded-[1.25rem] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-12 px-5"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      placeholder="Identificação SN-XXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diretório de Mídia (URL)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">link</span>
                      </div>
                      <input
                        className="w-full rounded-[1.25rem] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-12 pl-12 pr-5"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        placeholder="Link da imagem do equipamento..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-8 bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 font-black text-slate-400 uppercase tracking-widest text-[10px] bg-white dark:bg-slate-800 h-14 rounded-2xl active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-2 px-8 bg-primary text-white font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Salvar Registro
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

const tabIcon = (tab: string) => {
  switch (tab) {
    case 'groups': return 'grid_view';
    case 'warehouses': return 'factory';
    case 'roles': return 'badge';
    default: return 'help';
  }
};

export default AdminPanel;

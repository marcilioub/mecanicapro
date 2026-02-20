/* ======================================================
    ENUMS (Valores fixos que não mudam)
===================================================== */

export enum UserStatus {
  AVAILABLE = 'Livre',
  BUSY = 'Ocupado',
  INACTIVE = 'Inativo'
}

export enum TicketStatus {
  OPEN = 'Em Aberto',
  IN_PROGRESS = 'Atendimento',
  COMPLETED = 'Concluído',
  PAUSED = 'Pausado'
}

export enum TicketPriority {
  HIGH = 'Alta',
  NORMAL = 'Normal',
  LOW = 'Baixa'
}

/* ======================================================
    AUTENTICAÇÃO E PERMISSÕES
===================================================== */

// Exportamos UserRole como enum para uso em comparações no código.
export enum UserRole {
  ADMIN = 'Administrador do Sistema',
  MECANICO = 'Mecânico',
  SUPERVISOR = 'Supervisor'
}

// Função centralizada para verificar se o usuário é administrador  4923fe2e-0eba-41b4-8c77-dd87ccc79c56
export const ADMIN_ROLE_ID = "4923fe2e-0eba-41b4-8c77-dd87ccc79c56";

export const checkIsAdmin = (jobRoleId?: string | null): boolean => {
  if (!jobRoleId) return false;
  return jobRoleId === ADMIN_ROLE_ID;
};


/* ======================================================
    USUÁRIO E LOGS
===================================================== */

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Armazena o nome do cargo vindo da tabela job_roles
  nickname?: string;
  avatar?: string;
  status?: UserStatus;
  active: boolean;
  jobRoleId: string | null;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;     // Cargo do usuário no momento da ação
  userAvatar?: string;  // Avatar do usuário para a timeline
  action: string;
  details?: string;
}

/* ======================================================
    MÁQUINAS (Modelos e Mapeadores)
===================================================== */

export interface Machine {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  location: string;
  imageUrl: string;
}

// Modelo para o Banco de Dados (snake_case)
export interface MachineDb {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  location: string;
  image_url: string;
}

export const mapMachineToDb = (machine: Machine): MachineDb => ({
  id: machine.id,
  name: machine.name,
  manufacturer: machine.manufacturer,
  model: machine.model,
  serial: machine.serial,
  location: machine.location,
  image_url: machine.imageUrl,
});

export const mapMachineFromDb = (row: MachineDb): Machine => ({
  id: row.id,
  name: row.name,
  manufacturer: row.manufacturer,
  model: row.model,
  serial: row.serial,
  location: row.location,
  imageUrl: row.image_url,
});

/* ======================================================
    CHAT E MENSAGENS
===================================================== */

export type MessageType = 'text' | 'image' | 'document';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
  messageType?: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  deliveredAt?: string;
}

/* ======================================================
    ESTRUTURA ORGANIZACIONAL
===================================================== */

export interface SectorGroup {
  id: string;
  name: string;
}

export interface SectorGroupDb {
  id: string;
  name: string;
}

export const mapSectorGroupToDb = (g: SectorGroup): SectorGroupDb => ({
  id: g.id,
  name: g.name,
});

export const mapSectorGroupFromDb = (row: SectorGroupDb): SectorGroup => ({
  id: row.id,
  name: row.name,
});

export interface Warehouse {
  id: string;
  name: string;
}

export interface JobRole {
  id: string;
  name: string;
}

/* ======================================================
    CHAMADOS (TICKETS)
===================================================== */

export interface Ticket {
  id: string;
  title: string;
  requester: string;
  galpao?: string;
  grupo?: string;
  manuseadoPor?: string;
  sector: string;
  machineId: string;
  status: TicketStatus;
  priority: TicketPriority;
  description: string;
  machineCategory?: string;
  operator?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  mecanicoId?: string;
  mechanicIds?: string[];
  totalTimeSpent?: number;
  pausedByUserId?: string;
  notes?: string;
  createdBy?: string;
  selectedProblems?: string[];
  customDescription?: string;
}

/* ======================================================
    ESTADO GLOBAL DA APLICAÇÃO (AppState)
===================================================== */

export interface AppState {
  currentUser: User | null;
  view:
    | 'login'
    | 'dashboard'
    | 'tickets'
    | 'users'
    | 'report'
    | 'activity_report'
    | 'active_ticket'
    | 'profile'
    | 'chat'
    | 'admin_panel';

  tickets: Ticket[];
  users: User[];
  machines: Machine[];
  groups: SectorGroup[];
  warehouses: Warehouse[];
  jobRoles: JobRole[];
  activityLogs: ActivityLog[];
  
  activeTicketId: string | null;
  messages: ChatMessage[];
  activeChatUserId: string | null;

  connectionStatus: 'online' | 'offline' | 'loading' | 'error';
  lastSync: string | null;
  
  standardProblems: any[]; // Problemas padronizados vindo do banco
  
  dataStats: {
    tickets: number;
    users: number;
    messages: number;
    machines: number;
  };
}
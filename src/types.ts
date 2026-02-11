
export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  MECANICO = 'mecanico'
}

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

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
  messageType?: 'text' | 'image' | 'document';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  deliveredAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  avatar: string;
  nickname?: string;
  password?: string;
  status?: UserStatus;
  jobRoleId?: string;
}

export interface Machine {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  location: string;
  imageUrl: string;
}

export interface SectorGroup {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface JobRole {
  id: string;
  name: string;
}


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
  selectedProblems?: string[]; // Deprecated: use description
  customDescription?: string; // Deprecated: use description
  machineCategory?: string; // Optional machine category
  operator?: string; // Who was operating the machine
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  mecanicoId?: string;
  mechanicIds?: string[]; // Histórico de IDs dos mecânicos que trabalharam no chamado
  totalTimeSpent?: number; // Tempo acumulado em segundos
  pausedByUserId?: string;
  notes?: string;
  createdBy?: string;
}

export interface AppState {
  currentUser: User | null;
  view: 'login' | 'dashboard' | 'tickets' | 'users' | 'report' | 'active_ticket' | 'profile' | 'chat' | 'admin_panel';
  tickets: Ticket[];
  users: User[];
  machines: Machine[];
  groups: SectorGroup[];
  warehouses: Warehouse[];
  jobRoles: JobRole[];
  activeTicketId: string | null;
  messages: ChatMessage[];
  activeChatUserId: string | null;
  activityLogs: ActivityLog[];
  connectionStatus: 'online' | 'offline' | 'loading' | 'error';
  lastSync: string | null;
  dataStats: {
    tickets: number;
    users: number;
    messages: number;
    machines: number;
  };
}

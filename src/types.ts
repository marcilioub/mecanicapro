/* ======================================================
   ENUMS
====================================================== */

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

/* ======================================================
   USER
====================================================== */

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

/* ======================================================
   MACHINE (FRONTEND MODEL)
====================================================== */

export interface Machine {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  location: string;
  imageUrl: string;
}

/* ======================================================
   MACHINE (DATABASE MODEL - snake_case)
====================================================== */

export interface MachineDb {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  location: string;
  image_url: string;
}

/* ======================================================
   MACHINE MAPPERS
====================================================== */

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
   CHAT
====================================================== */

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
   ACTIVITY LOG
====================================================== */

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details?: string;
}

/* ======================================================
   STRUCTURAL TABLES
====================================================== */

export interface SectorGroup {
  id: string;
  name: string;
}

/* ======================================================
   SECTOR_GROUP (DATABASE MODEL - snake_case)
====================================================== */

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
   TICKET
====================================================== */

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
}

/* ======================================================
   APP STATE (ZUSTAND / CONTEXT)
====================================================== */

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

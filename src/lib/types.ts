// Shared types — ASYNC pipeline, 5 chains × 4 roles × 10 SV = tối đa 200 slots

export type RoleKey = 'retailer' | 'wholesaler' | 'distributor' | 'factory';
export type ChainKey = 'A' | 'B' | 'C' | 'D' | 'E';

export const ROLES: RoleKey[] = ['retailer', 'wholesaler', 'distributor', 'factory'];
export const CHAINS: ChainKey[] = ['A', 'B', 'C', 'D', 'E'];

export const ROLE_LABELS: Record<RoleKey, string> = {
  retailer: 'Retailer (Bán lẻ)',
  wholesaler: 'Wholesaler (Bán sỉ)',
  distributor: 'Distributor (Phân phối)',
  factory: 'Factory (Nhà máy)',
};

export const INITIAL_INVENTORY: Record<RoleKey, number> = {
  retailer: 12, wholesaler: 18, distributor: 25, factory: 33,
};

export const HOLDING_COST = 1.0;
export const BACKLOG_COST = 2.0;
export const SHIP_DELAY_TICKS = 2;
export const MAX_PLAYERS_PER_GROUP = 10;

// Security
export const MAX_NAME_LENGTH = 30;
export const MAX_CHAT_LENGTH = 200;
export const MAX_ORDER_VALUE = 999;
export const RATE_LIMIT_EVENTS_PER_SEC = 15;

export interface ShipItem {
  ticksLeft: number;
  amount: number;
}

export type RoleStatus = 'idle' | 'deciding' | 'awaiting_upstream';

export interface RoleRuntime {
  players: Player[];
  captainId: string | null;
  suggestions: Suggestion[];
  week: number;
  inventory: number;
  backlog: number;
  shipmentsInbound: ShipItem[];
  cost: number;
  history: WeekRecord[];
  inbox: { value: number } | null;
  status: RoleStatus;
  deadline: number | null;
  decidedValue: number | null;
}

export interface WeekRecord {
  week: number;
  incomingOrder: number;
  ordered: number;
  received: number;
  shipped: number;
  netAtStart: number;
  inventory: number;
  backlog: number;
  holdingCost: number;
  shortageCost: number;
  weekCost: number;
  cumCost: number;
  aiDecided: boolean;
}

export interface Player {
  id: string;
  name: string;
  chain: ChainKey;
  role: RoleKey;
  isCaptain: boolean;
  online: boolean;
  joinedAt: number;
}

export interface Suggestion {
  playerId: string;
  playerName: string;
  value: number;
  at: number;
}

export interface ChainRuntime {
  retailer: RoleRuntime;
  wholesaler: RoleRuntime;
  distributor: RoleRuntime;
  factory: RoleRuntime;
}

export interface GameState {
  roomCode: string;
  teacherSocketId: string | null;
  status: 'lobby' | 'running' | 'ended';
  totalWeeks: number;
  decisionSeconds: number;                   // Thời gian tối đa mỗi lượt
  noFactoryChains: ChainKey[];               // Chuỗi 3 vai, không có Nhà máy
  chains: Record<ChainKey, ChainRuntime>;   // ĐỔI: dynamic 5 chains
  demands: Record<ChainKey, number[]>;       // ĐỔI: demand history từng chuỗi
  chatMessages: ChatMessage[];
  captainRotateEvery: number;
  createdAt: number;
}

// Đúng cột "Tồn kho có sẵn" của biên bản: tồn trừ nợ, cộng lô hàng về trong tuần sắp chốt
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function arrivingThisWeek(r: RoleRuntime): number {
  return r.shipmentsInbound.filter(s => s.ticksLeft <= 1).reduce((sum, s) => sum + s.amount, 0);
}

export function rolesOf(state: GameState, chain: ChainKey): RoleKey[] {
  return state.noFactoryChains.includes(chain) ? ROLES.slice(0, 3) : ROLES;
}

// Phòng có chuỗi 3 vai thì chỉ so 3 vai chung, chuỗi đủ vai mới không bị thiệt vì phải cộng thêm Nhà máy
export function rankingRoles(state: GameState): RoleKey[] {
  return state.noFactoryChains.length > 0 ? ROLES.slice(0, 3) : ROLES;
}

export interface ChatMessage {
  id: string;
  chain: ChainKey;
  role: RoleKey;
  playerId: string;
  playerName: string;
  text: string;
  at: number;
}

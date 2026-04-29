// ASYNC pipeline engine — 5 chains × 4 roles × 8 SV
const { nanoid } = require('nanoid');

const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];
const CHAINS = ['A', 'B', 'C', 'D', 'E'];
const INITIAL_INVENTORY = { retailer: 12, wholesaler: 18, distributor: 25, factory: 33 };
const HOLDING_COST = 1.0;
const BACKLOG_COST = 2.0;
const DECISION_TIMEOUT_MS = 90_000;
const SHIP_DELAY_TICKS = 2;
const MAX_PLAYERS_PER_GROUP = 8;
const MAX_NAME_LENGTH = 30;
const MAX_CHAT_LENGTH = 200;
const MAX_ORDER_VALUE = 999;

const UPSTREAM = { retailer: 'wholesaler', wholesaler: 'distributor', distributor: 'factory', factory: null };
const DOWNSTREAM = { wholesaler: 'retailer', distributor: 'wholesaler', factory: 'distributor', retailer: null };

function sanitizeName(s) {
  return String(s || '').trim().replace(/[<>]/g, '').slice(0, MAX_NAME_LENGTH);
}
function sanitizeChat(s) {
  return String(s || '').trim().replace(/[<>]/g, '').slice(0, MAX_CHAT_LENGTH);
}
function clampOrder(v) {
  const n = Math.max(0, Math.round(Number(v) || 0));
  return Math.min(MAX_ORDER_VALUE, n);
}

function createRoleRuntime(inventory) {
  return {
    players: [], captainId: null, suggestions: [],
    week: 0, inventory, backlog: 0,
    shipmentsInbound: [], cost: 0, history: [],
    inbox: null, status: 'idle', deadline: null, decidedValue: null,
  };
}

function createChainRuntime() {
  const c = {};
  for (const r of ROLES) c[r] = createRoleRuntime(INITIAL_INVENTORY[r]);
  return c;
}

function createGame(roomCode, chainCount = 2, totalWeeks = 30, captainRotateEvery = 5) {
  const n = Math.max(1, Math.min(CHAINS.length, Math.round(chainCount)));
  const activeChains = CHAINS.slice(0, n);
  const chains = {};
  const demands = {};
  for (const k of activeChains) { chains[k] = createChainRuntime(); demands[k] = []; }
  return {
    roomCode, teacherSocketId: null, status: 'lobby',
    totalWeeks, chainCount: n, chains, demands,
    chatMessages: [], captainRotateEvery, createdAt: Date.now(),
  };
}

function activeChainsOf(state) {
  return Object.keys(state.chains);
}

function chainOf(state, chain) { return state.chains[chain]; }

function computeAIOrder(role, r, incomingDemand) {
  const N = Math.min(4, r.history.length);
  let expected;
  if (role === 'retailer') expected = incomingDemand;
  else if (r.history.length > 0) {
    const recent = r.history.slice(-N).map(h => h.incomingOrder);
    expected = recent.reduce((a, b) => a + b, 0) / N;
  } else expected = 4;
  const net = r.inventory - r.backlog;
  const inTransit = r.shipmentsInbound.reduce((s, x) => s + x.amount, 0);
  const supply = net + inTransit;
  const target = expected * 3;
  return clampOrder(expected + Math.max(0, target - supply) / 3);
}

function processRoleWeek(r, incomingDemand, role) {
  // 1. Nhận hàng từ pipeline
  let received = 0;
  const nextQueue = [];
  for (const item of r.shipmentsInbound) {
    if (item.ticksLeft <= 1) received += item.amount;
    else nextQueue.push({ ticksLeft: item.ticksLeft - 1, amount: item.amount });
  }
  r.shipmentsInbound = nextQueue;
  r.inventory += received;
  const netAtStart = r.inventory - r.backlog;

  let shipped;
  const totalDemand = incomingDemand + r.backlog;

  if (role === 'retailer') {
    // Retailer phục vụ KHÁCH HÀNG cuối → ship tối đa có thể, phần thiếu thành backlog
    shipped = Math.min(r.inventory, totalDemand);
    r.inventory -= shipped;
    r.backlog = totalDemand - shipped;
  } else {
    // W/D/F ship cho ĐỐI TÁC trong chuỗi → cam kết giao đủ
    // Nếu kho thiếu, kho âm = vai đó tự chịu phạt thiếu hàng
    shipped = totalDemand;
    r.inventory -= shipped;
    if (r.inventory < 0) {
      r.backlog = -r.inventory;
      r.inventory = 0;
    } else {
      r.backlog = 0;
    }
  }

  const holdingCost = r.inventory * HOLDING_COST;
  const shortageCost = r.backlog * BACKLOG_COST;
  const weekCost = holdingCost + shortageCost;
  r.cost += weekCost;
  r.week += 1;
  return { received, shipped, netAtStart, holdingCost, shortageCost, weekCost };
}

function tryFlush(state, chain, role) {
  const c = chainOf(state, chain);
  const r = c[role];
  if (r.decidedValue == null) return false;

  const upKey = UPSTREAM[role];
  if (upKey === null) {
    r.shipmentsInbound.push({ ticksLeft: SHIP_DELAY_TICKS, amount: r.decidedValue });
    r.decidedValue = null; r.status = 'idle'; r.inbox = null; r.deadline = null;
    return true;
  }

  const up = c[upKey];
  if (up.status === 'idle' && up.inbox === null) {
    up.inbox = { value: r.decidedValue };
    up.status = 'deciding';
    up.deadline = Date.now() + DECISION_TIMEOUT_MS;
    up.suggestions = [];
    r.decidedValue = null; r.inbox = null; r.status = 'idle'; r.deadline = null;
    return true;
  }
  r.status = 'awaiting_upstream';
  return false;
}

function cascadeFlush(state, chain, role) {
  const dsKey = DOWNSTREAM[role];
  if (!dsKey) return;
  const ds = chainOf(state, chain)[dsKey];
  if (ds.status === 'awaiting_upstream') {
    const ok = tryFlush(state, chain, dsKey);
    if (ok) cascadeFlush(state, chain, dsKey);
  }
}

function routeShipment(state, chain, role, shippedAmount) {
  const dsKey = DOWNSTREAM[role];
  if (!dsKey) return;
  chainOf(state, chain)[dsKey].shipmentsInbound.push({ ticksLeft: SHIP_DELAY_TICKS, amount: shippedAmount });
}

function commitDecision(state, chain, role, value, aiDecided) {
  const c = chainOf(state, chain);
  const r = c[role];
  if (!r.inbox) return { ok: false, error: 'Inbox rỗng.' };

  const incomingDemand = r.inbox.value;
  const meta = processRoleWeek(r, incomingDemand, role);
  routeShipment(state, chain, role, meta.shipped);

  const decidedVal = clampOrder(value);
  r.history.push({
    week: r.week, incomingOrder: incomingDemand, ordered: decidedVal,
    received: meta.received, shipped: meta.shipped, netAtStart: meta.netAtStart,
    inventory: r.inventory, backlog: r.backlog,
    holdingCost: meta.holdingCost, shortageCost: meta.shortageCost,
    weekCost: meta.weekCost, cumCost: r.cost, aiDecided: !!aiDecided,
  });

  r.decidedValue = decidedVal;
  const flushed = tryFlush(state, chain, role);
  if (flushed) cascadeFlush(state, chain, role);
  checkGameEnd(state);
  return { ok: true };
}

function checkGameEnd(state) {
  const done = activeChainsOf(state).every(chain => {
    const c = chainOf(state, chain);
    return ROLES.every(r => c[r].week >= state.totalWeeks);
  });
  if (done) state.status = 'ended';
}

function sendDemand(state, chain, value) {
  if (!state.chains[chain]) return { ok: false, error: 'Chuỗi không hợp lệ.' };
  const c = chainOf(state, chain);
  const r = c.retailer;
  if (r.status !== 'idle' || r.inbox !== null) return { ok: false, error: 'Retailer đang bận.' };
  if (r.week >= state.totalWeeks) return { ok: false, error: 'Chuỗi đã hoàn thành.' };
  const v = clampOrder(value);
  r.inbox = { value: v };
  r.status = 'deciding';
  r.deadline = Date.now() + DECISION_TIMEOUT_MS;
  r.suggestions = [];
  state.demands[chain].push(v);
  return { ok: true };
}

function resetGame(state) {
  for (const chain of activeChainsOf(state)) {
    const c = chainOf(state, chain);
    for (const role of ROLES) {
      const { players, captainId } = c[role];
      const fresh = createRoleRuntime(INITIAL_INVENTORY[role]);
      fresh.players = players;
      fresh.captainId = captainId;
      c[role] = fresh;
    }
    state.demands[chain] = [];
  }
  state.status = 'running';
}

function addPlayer(state, socketId, name, chain, role) {
  if (!state.chains[chain]) return { ok: false, error: 'Chuỗi không hợp lệ (chuỗi này không có trong phòng).' };
  if (!ROLES.includes(role)) return { ok: false, error: 'Vai không hợp lệ.' };
  const cleanName = sanitizeName(name);
  if (!cleanName) return { ok: false, error: 'Tên không hợp lệ.' };
  const c = chainOf(state, chain);
  const r = c[role];
  if (r.players.length >= MAX_PLAYERS_PER_GROUP) return { ok: false, error: `Vai này đã đủ ${MAX_PLAYERS_PER_GROUP} người.` };
  if (r.players.some(p => p.name === cleanName)) return { ok: false, error: 'Tên này đã tồn tại trong nhóm.' };
  const isCaptain = r.players.length === 0;
  const player = { id: socketId, name: cleanName, chain, role, isCaptain, online: true, joinedAt: Date.now() };
  r.players.push(player);
  if (isCaptain) r.captainId = player.id;
  return { ok: true, player };
}

function removePlayer(state, socketId) {
  for (const chain of activeChainsOf(state)) {
    const c = chainOf(state, chain);
    for (const role of ROLES) {
      const r = c[role];
      const idx = r.players.findIndex(p => p.id === socketId);
      if (idx >= 0) {
        const wasCaptain = r.players[idx].isCaptain;
        r.players.splice(idx, 1);
        if (wasCaptain && r.players.length > 0) {
          r.players[0].isCaptain = true;
          r.captainId = r.players[0].id;
        } else if (r.players.length === 0) r.captainId = null;
      }
    }
  }
}

function findPlayer(state, socketId) {
  for (const chain of activeChainsOf(state)) {
    const c = chainOf(state, chain);
    for (const role of ROLES) {
      const p = c[role].players.find(pl => pl.id === socketId);
      if (p) return { chain, role, player: p, runtime: c[role] };
    }
  }
  return null;
}

function setSuggestion(state, socketId, value) {
  const found = findPlayer(state, socketId);
  if (!found || found.runtime.status !== 'deciding') return;
  const r = found.runtime;
  r.suggestions = r.suggestions.filter(s => s.playerId !== socketId);
  r.suggestions.push({ playerId: socketId, playerName: found.player.name, value: clampOrder(value), at: Date.now() });
}

function submitByCaptain(state, socketId, value) {
  const found = findPlayer(state, socketId);
  if (!found) return { ok: false, error: 'Không tìm thấy.' };
  if (!found.player.isCaptain) return { ok: false, error: 'Chỉ captain được chốt.' };
  if (found.runtime.status !== 'deciding') return { ok: false, error: 'Chưa đến lượt quyết.' };
  return commitDecision(state, found.chain, found.role, value, false);
}

function kickPlayer(state, targetSocketId) {
  removePlayer(state, targetSocketId);
}

function tick(state) {
  if (state.status !== 'running') return false;
  let changed = false;
  const now = Date.now();
  for (const chain of activeChainsOf(state)) {
    const c = chainOf(state, chain);
    for (const role of ROLES) {
      const r = c[role];
      if (r.status === 'deciding' && r.deadline != null && now >= r.deadline) {
        const aiValue = computeAIOrder(role, r, r.inbox ? r.inbox.value : 0);
        commitDecision(state, chain, role, aiValue, true);
        changed = true;
      }
    }
  }
  return changed;
}

function addChatMessage(state, socketId, text) {
  const found = findPlayer(state, socketId);
  if (!found) return null;
  const clean = sanitizeChat(text);
  if (!clean) return null;
  const msg = {
    id: nanoid(8), chain: found.chain, role: found.role,
    playerId: socketId, playerName: found.player.name,
    text: clean, at: Date.now(),
  };
  state.chatMessages.push(msg);
  if (state.chatMessages.length > 500) state.chatMessages.shift();
  return msg;
}

function startGame(state) {
  if (state.status !== 'lobby') return false;
  state.status = 'running';
  return true;
}

function rotateCaptainIfNeeded(state) {
  for (const chain of activeChainsOf(state)) {
    const c = chainOf(state, chain);
    for (const role of ROLES) {
      const r = c[role];
      if (r.players.length < 2) continue;
      if (r.week > 0 && r.week % state.captainRotateEvery === 0 && r.status === 'idle') {
        const currIdx = r.players.findIndex(p => p.isCaptain);
        r.players.forEach(p => (p.isCaptain = false));
        const nextIdx = (currIdx + 1) % r.players.length;
        r.players[nextIdx].isCaptain = true;
        r.captainId = r.players[nextIdx].id;
      }
    }
  }
}

module.exports = {
  createGame, addPlayer, removePlayer, findPlayer,
  setSuggestion, submitByCaptain, sendDemand, resetGame,
  tick, addChatMessage, startGame, rotateCaptainIfNeeded,
  kickPlayer, sanitizeName, sanitizeChat, clampOrder,
  CHAINS, ROLES,
};

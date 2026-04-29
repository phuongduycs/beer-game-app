// Production server — mirror dev-server
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid');
const engine = require('./engine-compiled.js');

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 1000;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN || '*' } });
  const games = new Map();

  function broadcastState(roomCode) {
    const state = games.get(roomCode);
    if (!state) return;
    io.to(roomCode).emit('state:update', state);
  }

  setInterval(() => {
    for (const [code, state] of games) {
      const changed = engine.tick(state);
      engine.rotateCaptainIfNeeded(state);
      if (changed) broadcastState(code);
      else io.to(code).emit('state:tick', { at: Date.now() });
    }
  }, 1000);

  function gameByTeacher(socketId) {
    for (const [, s] of games) if (s.teacherSocketId === socketId) return s;
    return null;
  }
  function rateLimited(socket) {
    const now = Date.now();
    socket.data._events = socket.data._events || [];
    socket.data._events = socket.data._events.filter(t => now - t < RATE_WINDOW_MS);
    if (socket.data._events.length >= RATE_LIMIT) return true;
    socket.data._events.push(now);
    return false;
  }
  function gate(socket, fn) {
    return (...args) => {
      if (rateLimited(socket)) {
        socket.emit('error', 'Bạn thao tác quá nhanh, chờ 1 giây.');
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb({ ok: false, error: 'rate-limited' });
        return;
      }
      fn(...args);
    };
  }

  io.on('connection', (socket) => {
    socket.on('client:requestState', gate(socket, () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const state = games.get(roomCode);
      if (state) socket.emit('state:update', state);
    }));
    socket.on('teacher:create', gate(socket, ({ chainCount = 2, password = '' } = {}, cb) => {
      const required = process.env.TEACHER_PASSWORD;
      if (!required) {
        return cb && cb({ ok: false, error: 'Server chưa cấu hình TEACHER_PASSWORD. Liên hệ admin.' });
      }
      if (password !== required) {
        return cb && cb({ ok: false, error: 'Sai password giảng viên.' });
      }
      const roomCode = nanoid(6).toUpperCase();
      const state = engine.createGame(roomCode, chainCount);
      state.teacherSocketId = socket.id;
      games.set(roomCode, state);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      cb && cb({ ok: true, roomCode });
      broadcastState(roomCode);
    }));
    socket.on('teacher:join', gate(socket, ({ roomCode, password = '' }, cb) => {
      const required = process.env.TEACHER_PASSWORD;
      if (required && password !== required) {
        return cb && cb({ ok: false, error: 'Sai password giảng viên.' });
      }
      const state = games.get(roomCode);
      if (!state) return cb && cb({ ok: false, error: 'Phòng không tồn tại hoặc đã hết hạn.' });
      state.teacherSocketId = socket.id;
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      cb && cb({ ok: true });
      broadcastState(roomCode);
    }));
    socket.on('teacher:startGame', gate(socket, () => {
      const state = gameByTeacher(socket.id);
      if (state && engine.startGame(state)) broadcastState(state.roomCode);
    }));
    socket.on('teacher:sendDemand', gate(socket, ({ chain, value }, cb) => {
      const state = gameByTeacher(socket.id);
      if (!state) return cb && cb({ ok: false });
      const res = engine.sendDemand(state, chain, value);
      if (res.ok) broadcastState(state.roomCode);
      cb && cb(res);
    }));
    socket.on('teacher:reset', gate(socket, () => {
      const state = gameByTeacher(socket.id);
      if (state) { engine.resetGame(state); broadcastState(state.roomCode); }
    }));
    socket.on('teacher:kickPlayer', gate(socket, ({ playerId }) => {
      const state = gameByTeacher(socket.id);
      if (!state || !playerId) return;
      engine.kickPlayer(state, playerId);
      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('kicked', 'Bạn đã bị giảng viên kick khỏi phòng.');
        targetSocket.disconnect();
      }
      broadcastState(state.roomCode);
    }));
    socket.on('teacher:setCaptain', gate(socket, ({ chain, role, playerId }) => {
      const state = gameByTeacher(socket.id);
      if (!state) return;
      const c = state.chains[chain];
      if (!c || !c[role]) return;
      c[role].players.forEach(p => (p.isCaptain = p.id === playerId));
      c[role].captainId = playerId;
      broadcastState(state.roomCode);
    }));
    socket.on('player:join', gate(socket, ({ roomCode, name, chain, role }, cb) => {
      const state = games.get(roomCode);
      if (!state) return cb({ ok: false, error: 'Mã phòng không tồn tại.' });
      if (state.status === 'ended') return cb({ ok: false, error: 'Game đã kết thúc.' });
      const result = engine.addPlayer(state, socket.id, name, chain, role);
      if (!result.ok) return cb({ ok: false, error: result.error });
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      cb({ ok: true, playerId: socket.id });
      broadcastState(roomCode);
    }));
    socket.on('player:suggest', gate(socket, ({ value }) => {
      const roomCode = socket.data.roomCode;
      const state = roomCode && games.get(roomCode);
      if (!state) return;
      engine.setSuggestion(state, socket.id, value);
      broadcastState(roomCode);
    }));
    socket.on('player:submit', gate(socket, ({ value }, cb) => {
      const roomCode = socket.data.roomCode;
      const state = roomCode && games.get(roomCode);
      if (!state) return cb && cb({ ok: false });
      const res = engine.submitByCaptain(state, socket.id, value);
      if (res.ok) broadcastState(roomCode);
      else socket.emit('error', res.error);
      cb && cb(res);
    }));
    socket.on('player:chat', gate(socket, ({ text }) => {
      const roomCode = socket.data.roomCode;
      const state = roomCode && games.get(roomCode);
      if (!state) return;
      if (engine.addChatMessage(state, socket.id, text)) broadcastState(roomCode);
    }));
    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      const state = roomCode && games.get(roomCode);
      if (state) {
        if (state.teacherSocketId === socket.id) state.teacherSocketId = null;
        engine.markPlayerOffline(state, socket.id);
        broadcastState(roomCode);
      }
    });
  });

  httpServer.listen(port, () => console.log(`> Beer Game ASYNC prod ready at ${port}`));
});

const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const MAX_PLAYERS = 7;
const RECONNECT_GRACE_MS = 5 * 60 * 1000;

const DIST_DIR = path.join(__dirname, 'dist');
const HISTORY_FILE = path.join(__dirname, 'question-history.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

const httpServer = createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  if (pathname.startsWith('/socket.io/')) return;

  const requestedPath = path.resolve(DIST_DIR, '.' + pathname);

  if (
    requestedPath !== DIST_DIR &&
    !requestedPath.startsWith(DIST_DIR + path.sep)
  ) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(requestedPath, (error, stats) => {
    let filePath;

    if (!error && stats.isFile()) {
      filePath = requestedPath;
    } else {
      if (path.extname(pathname)) {
        res.writeHead(404);
        return res.end('Not Found');
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        console.error('Ошибка чтения файла:', filePath, readError);
        res.writeHead(500);
        return res.end('Ошибка загрузки игры');
      }

      const contentType =
        MIME_TYPES[path.extname(filePath).toLowerCase()] ||
        'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });

      if (req.method === 'HEAD') return res.end();
      res.end(data);
    });
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = {};
let questionHistory = {};

try {
  if (fs.existsSync(HISTORY_FILE)) {
    questionHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
} catch (error) {
  console.error('Ошибка загрузки истории вопросов:', error);
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(questionHistory, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка сохранения истории:', error);
  }
}

function saveRoomHistory(room) {
  questionHistory[room.code] = {
    usedQuestions: room.usedQuestions,
    previousGameQuestions: room.previousGameQuestions,
    usedCells: room.usedCells
  };
  saveHistory();
}

function clearQuestionTimer(room) {
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }
}

function clearPlayerDisconnectTimer(player) {
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }
}

// Отправляем клиентам только публичные данные игроков, без socket.id и таймеров.
function getPublicPlayers(room) {
  return room.players.map(({ id, name, score, connected }) => ({
    id,
    name,
    score,
    connected: connected !== false
  }));
}

function sendRoom(code) {
  const room = rooms[code];
  if (!room) return;

  const publicPlayers = getPublicPlayers(room);

  room.players.forEach(player => {
    if (!player.socketId || !player.connected) return;

    let activeQuestion = null;

    if (room.activeQuestion) {
      const { answer, ...publicQuestion } = room.activeQuestion;
      activeQuestion = player.id === room.hostId
        ? { ...publicQuestion, answer }
        : publicQuestion;
    }

    io.to(player.socketId).emit('room-updated', {
      code: room.code,
      players: publicPlayers,
      hostId: room.hostId,
      phase: room.phase,
      categories: room.categories,
      activeQuestion,
      usedQuestions: room.usedQuestions,
      previousGameQuestions: room.previousGameQuestions,
      usedCells: room.usedCells,
      timerSeconds: room.timerSeconds,
      serverNow: Date.now(),
      maxPlayers: MAX_PLAYERS
    });
  });
}

function generateRoomCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms[code]);
  return code;
}

function getPlayerById(room, playerId) {
  return room?.players.find(player => player.id === playerId);
}

function isHost(socket, room) {
  return !!room && !!socket.data.playerId && room.hostId === socket.data.playerId;
}

function reply(callback, result) {
  if (typeof callback === 'function') callback(result);
}

function removePlayer(room, player) {
  clearPlayerDisconnectTimer(player);
  room.players = room.players.filter(item => item.id !== player.id);

  if (room.players.length === 0) {
    clearQuestionTimer(room);
    delete rooms[room.code];
    return;
  }

  if (room.hostId === player.id) {
    const nextHost = room.players.find(item => item.connected) || room.players[0];
    room.hostId = nextHost.id;
    console.log(`Ведущий комнаты ${room.code} сменился на ${nextHost.name}`);
  }

  sendRoom(room.code);
}

function schedulePlayerRemoval(room, player) {
  clearPlayerDisconnectTimer(player);

  player.disconnectTimer = setTimeout(() => {
    const currentRoom = rooms[room.code];
    if (!currentRoom) return;

    const currentPlayer = getPlayerById(currentRoom, player.id);
    if (!currentPlayer || currentPlayer.connected) return;

    console.log(`Время переподключения истекло: ${player.name}, комната ${room.code}`);
    removePlayer(currentRoom, currentPlayer);
  }, RECONNECT_GRACE_MS);
}

io.on('connection', socket => {
  console.log('Подключился:', socket.id);

  // Создание комнаты. Принимаем как новый объект, так и старый формат строки.
  socket.on('create-room', (payload, callback) => {
    const name = typeof payload === 'string' ? payload : payload?.name;
    const suppliedPlayerId = typeof payload === 'object' ? payload?.playerId : null;
    const playerName = String(name || '').trim();
    const playerId = String(suppliedPlayerId || socket.id).trim();

    if (!playerName) {
      return reply(callback, { success: false, error: 'Введите имя' });
    }

    if (!playerId || playerId.length > 128) {
      return reply(callback, { success: false, error: 'Некорректный ID игрока' });
    }

    const code = generateRoomCode();
    const savedHistory = questionHistory[code] || {};

    const room = {
      code,
      hostId: playerId,
      phase: 'lobby',
      players: [{
        id: playerId,
        socketId: socket.id,
        name: playerName,
        score: 0,
        connected: true,
        disconnectTimer: null
      }],
      categories: [],
      activeQuestion: null,
      usedQuestions: savedHistory.usedQuestions || [],
      previousGameQuestions: savedHistory.previousGameQuestions || [],
      usedCells: savedHistory.usedCells || [],
      timerSeconds: 60,
      timerHandle: null
    };

    rooms[code] = room;
    socket.data.playerId = playerId;
    socket.data.roomCode = code;
    socket.join(code);
    sendRoom(code);

    reply(callback, { success: true, code, playerId });
    console.log('Создана комната:', code);
  });

  // Подключение нового игрока.
  socket.on('join-room', ({ code, name, playerId: suppliedPlayerId } = {}, callback) => {
    code = String(code || '').trim();
    const room = rooms[code];
    const playerName = String(name || '').trim();
    const playerId = String(suppliedPlayerId || socket.id).trim();

    if (!room) {
      return reply(callback, { success: false, error: 'Комната не найдена' });
    }

    if (!playerName) {
      return reply(callback, { success: false, error: 'Введите имя' });
    }

    if (!playerId || playerId.length > 128) {
      return reply(callback, { success: false, error: 'Некорректный ID игрока' });
    }

    const existingPlayer = getPlayerById(room, playerId);

    // Повторный вход с тем же постоянным ID восстанавливает прежнего игрока.
    if (existingPlayer) {
      clearPlayerDisconnectTimer(existingPlayer);
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      existingPlayer.name = playerName;
      socket.data.playerId = playerId;
      socket.data.roomCode = code;
      socket.join(code);
      sendRoom(code);
      return reply(callback, { success: true, code, playerId, resumed: true });
    }

    if (room.players.length >= MAX_PLAYERS) {
      return reply(callback, {
        success: false,
        error: 'Комната заполнена. Максимум 6 участников и 1 ведущий.'
      });
    }

    room.players.push({
      id: playerId,
      socketId: socket.id,
      name: playerName,
      score: 0,
      connected: true,
      disconnectTimer: null
    });

    socket.data.playerId = playerId;
    socket.data.roomCode = code;
    socket.join(code);
    sendRoom(code);

    reply(callback, { success: true, code, playerId });
    console.log('Игрок подключился к комнате:', code, playerName);
  });

  // Исключение игрока доступно только ведущему.
  socket.on('kick-player', ({ code, playerId } = {}, callback) => {
    code = String(code || '').trim();
    playerId = String(playerId || '').trim();
    const room = rooms[code];

    if (!room || !isHost(socket, room)) {
      return reply(callback, { success: false, error: 'Только ведущий может исключать игроков.' });
    }

    if (!playerId || playerId === room.hostId) {
      return reply(callback, { success: false, error: 'Нельзя исключить ведущего.' });
    }

    const target = getPlayerById(room, playerId);
    if (!target) {
      return reply(callback, { success: false, error: 'Игрок уже не находится в комнате.' });
    }

    const targetSocketId = target.socketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('kicked', { code, message: 'Ведущий исключил вас из комнаты.' });
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(code);
        targetSocket.data.roomCode = null;
      }
    }

    console.log(`Ведущий исключил игрока ${target.name} из комнаты ${code}`);
    removePlayer(room, target);
    reply(callback, { success: true });
  });

  // Добровольный выход из комнаты: игрок удаляется сразу, без ожидания таймера переподключения.
  socket.on('leave-room', ({ code } = {}, callback) => {
    code = String(code || socket.data.roomCode || '').trim();
    const room = rooms[code];
    const playerId = socket.data.playerId;

    if (!room || !playerId) {
      socket.data.roomCode = null;
      return reply(callback, { success: true });
    }

    const player = getPlayerById(room, playerId);
    socket.data.roomCode = null;
    socket.leave(code);

    if (player && player.socketId === socket.id) {
      console.log(`Игрок ${player.name} добровольно покинул комнату ${code}`);
      removePlayer(room, player);
    }

    reply(callback, { success: true });
  });

  // Восстановление существующего игрока после перезагрузки/возврата во вкладку.
  socket.on('resume-room', ({ code, playerId } = {}, callback) => {
    code = String(code || '').trim();
    playerId = String(playerId || '').trim();

    const room = rooms[code];
    if (!room) {
      return reply(callback, {
        success: false,
        error: 'Комната уже закрыта или сервер перезапускался. Создай новую комнату.'
      });
    }

    const player = getPlayerById(room, playerId);
    if (!player) {
      return reply(callback, {
        success: false,
        error: 'Игрок больше не числится в этой комнате. Войди заново по коду.'
      });
    }

    clearPlayerDisconnectTimer(player);
    player.socketId = socket.id;
    player.connected = true;

    socket.data.playerId = playerId;
    socket.data.roomCode = code;
    socket.join(code);

    sendRoom(code);
    reply(callback, { success: true, code, playerId });
    console.log('Игрок восстановил подключение:', player.name, code);
  });

  socket.on('set-categories', ({ code, categories }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room) || room.phase !== 'lobby') {
      return reply(callback, {
        success: false,
        error: 'Выбирать категории может только ведущий в лобби'
      });
    }

    if (
      !Array.isArray(categories) ||
      categories.length > 6 ||
      new Set(categories).size !== categories.length
    ) {
      return reply(callback, {
        success: false,
        error: 'Можно выбрать не более 6 разных категорий'
      });
    }

    room.categories = [...categories];
    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('start-game', (payload = {}, callback) => {
    const code = String(payload.code || '');
    const room = rooms[code];

    console.log('[START-GAME] Запрос:', {
      code,
      socketId: socket.id,
      playerId: socket.data.playerId,
      roomFound: !!room,
      hostId: room?.hostId,
      phase: room?.phase,
      categories: room?.categories?.length
    });

    if (!room) {
      return reply(callback, { success: false, error: 'Комната не найдена' });
    }

    if (!isHost(socket, room)) {
      return reply(callback, {
        success: false,
        error: 'Ты не являешься ведущим этой комнаты'
      });
    }

    if (room.phase !== 'lobby') {
      return reply(callback, { success: false, error: 'Игра уже запущена' });
    }

    if (!Array.isArray(room.categories) || room.categories.length !== 6) {
      return reply(callback, {
        success: false,
        error: 'Необходимо выбрать ровно 6 категорий'
      });
    }

    room.phase = 'game';
    sendRoom(code);
    console.log('[START-GAME] Игра запущена:', code);
    reply(callback, { success: true });
  });

  socket.on('set-timer', ({ code, seconds }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room) || room.phase !== 'lobby') {
      return reply(callback, {
        success: false,
        error: 'Настраивать таймер может только ведущий в лобби'
      });
    }

    if (![null, 60, 90].includes(seconds)) {
      return reply(callback, {
        success: false,
        error: 'Недопустимое время таймера'
      });
    }

    room.timerSeconds = seconds;
    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('open-question', (
    { code, category, points, question, answer },
    callback
  ) => {
    const room = rooms[code];

    if (!isHost(socket, room) || room.phase !== 'game') {
      return reply(callback, {
        success: false,
        error: 'Открывать вопросы может только ведущий во время игры'
      });
    }

    if (room.activeQuestion) {
      return reply(callback, {
        success: false,
        error: 'Сначала закройте текущий вопрос'
      });
    }

    if (
      !room.categories.includes(category) ||
      ![100, 200, 300, 400, 500].includes(points) ||
      typeof question !== 'string' ||
      typeof answer !== 'string'
    ) {
      return reply(callback, {
        success: false,
        error: 'Некорректные данные вопроса'
      });
    }

    const cellId = `${category}|${points}`;
    if (room.usedCells.includes(cellId)) {
      return reply(callback, {
        success: false,
        error: 'Этот вопрос уже использован'
      });
    }

    clearQuestionTimer(room);
    room.usedCells.push(cellId);

    if (!room.usedQuestions.includes(question)) {
      room.usedQuestions.push(question);
    }

    const deadlineAt = room.timerSeconds !== null
      ? Date.now() + room.timerSeconds * 1000
      : null;

    room.activeQuestion = {
      category,
      points,
      question,
      answer,
      revealed: false,
      deadlineAt,
      expired: false
    };

    saveRoomHistory(room);

    if (room.timerSeconds !== null) {
      room.timerHandle = setTimeout(() => {
        if (!rooms[code] || !room.activeQuestion) return;
        room.activeQuestion.expired = true;
        room.timerHandle = null;
        sendRoom(code);
      }, room.timerSeconds * 1000);
    }

    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('reveal-answer', ({ code }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room) || !room.activeQuestion) {
      return reply(callback, {
        success: false,
        error: 'Невозможно показать ответ'
      });
    }

    room.activeQuestion.revealed = true;
    clearQuestionTimer(room);
    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('award-points', ({ code, playerId }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room)) {
      return reply(callback, {
        success: false,
        error: 'Только ведущий может начислять очки'
      });
    }

    if (!room.activeQuestion) {
      return reply(callback, { success: false, error: 'Нет открытого вопроса' });
    }

    const player = room.players.find(player => player.id === playerId);
    if (!player) {
      return reply(callback, { success: false, error: 'Игрок не найден' });
    }

    player.score += room.activeQuestion.points;
    clearQuestionTimer(room);
    room.activeQuestion = null;
    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('finish-question', ({ code }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room)) {
      return reply(callback, {
        success: false,
        error: 'Только ведущий может закрывать вопросы'
      });
    }

    if (room.activeQuestion) {
      clearQuestionTimer(room);
      room.activeQuestion = null;
    }

    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('new-game', ({ code }, callback) => {
    const room = rooms[code];

    if (!isHost(socket, room)) {
      return reply(callback, {
        success: false,
        error: 'Только ведущий может начать новую игру'
      });
    }

    clearQuestionTimer(room);

    room.previousGameQuestions = [...room.usedQuestions];
    room.usedQuestions = [];
    room.usedCells = [];
    room.categories = [];
    room.activeQuestion = null;
    room.phase = 'lobby';

    room.players.forEach(player => {
      player.score = 0;
    });

    saveRoomHistory(room);
    sendRoom(code);
    reply(callback, { success: true });
  });

  socket.on('disconnect', () => {
    console.log('Отключился:', socket.id);

    const playerId = socket.data.playerId;
    if (!playerId) return;

    for (const code in rooms) {
      const room = rooms[code];
      const player = getPlayerById(room, playerId);

      // Игрок мог уже переподключиться с новым socket.id.
      if (!player || player.socketId !== socket.id) continue;

      player.connected = false;
      player.socketId = null;
      schedulePlayerRemoval(room, player);

      console.log(
        `Игрок временно отключён: ${player.name}, комната ${code}. Ожидание ${RECONNECT_GRACE_MS / 1000} сек.`
      );

      sendRoom(code);
      break;
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Ожидание переподключения игрока: ${RECONNECT_GRACE_MS / 1000} секунд`);
});

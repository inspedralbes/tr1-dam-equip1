// Estat EN MEMÒRIA d'una sala. No sap res de WebSockets ni de la BD:
// només aplica les regles del joc i llança AppError si una acció no és vàlida.
const { AppError } = require('../errors');
const { puntuarRonda } = require('./scoring');
const { rangSlider } = require('./slider');

// Fases de la partida i transicions permeses
const ESTATS = { LOBBY: 'LOBBY', VOTING: 'VOTING', RESULTS: 'RESULTS', FINISHED: 'FINISHED' };

class Room {
  constructor(code, numRounds) {
    this.code = code;
    this.numRounds = numRounds;
    this.state = ESTATS.LOBBY;
    this.players = new Map(); // playerId -> { id, name, isHost, connected, score, ws }
    this.roundNumber = 0;
    this.question = null; // pregunta actual (amb la resposta correcta: NO s'envia mai abans dels resultats)
    this.slider = null;
    this.answers = new Map(); // playerId -> valor
    this.usedQuestionIds = [];
    this.closing = false; // evita tancar la mateixa ronda dues vegades
    this.nextId = 1;
  }

  // ---------- Jugadors ----------
  addPlayer(name, ws) {
    if (this.state !== ESTATS.LOBBY) throw new AppError('GAME_ALREADY_STARTED', 'La partida ja ha començat');
    const repetit = [...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (repetit) throw new AppError('NAME_TAKEN', 'Aquest nom ja és a la sala');

    const isHost = this.players.size === 0;
    const player = { id: this.nextId++, name, isHost, connected: true, score: 0, ws };
    this.players.set(player.id, player);
    return player;
  }

  // Marca el jugador com a desconnectat. Si era l'amfitrió, passa el rol a un altre.
  // Retorna el nou amfitrió (o null si no ha canviat).
  disconnect(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    player.connected = false;
    player.ws = null;

    // A la sala d'espera, qui marxa simplement desapareix de la llista
    if (this.state === ESTATS.LOBBY) this.players.delete(playerId);

    if (!player.isHost) return null;
    player.isHost = false;
    const nouHost = this.connectedPlayers()[0];
    if (nouHost) nouHost.isHost = true;
    return nouHost || null;
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  isEmpty() {
    return this.connectedPlayers().length === 0;
  }

  assertHost(playerId) {
    if (!this.players.get(playerId)?.isHost) throw new AppError('NOT_HOST', "Només l'amfitrió pot fer això");
  }

  // ---------- Rondes ----------
  canStartRound() {
    if (this.state !== ESTATS.LOBBY && this.state !== ESTATS.RESULTS) {
      throw new AppError('INVALID_STATE', `No es pot iniciar una ronda en l'estat ${this.state}`);
    }
    if (this.roundNumber >= this.numRounds) throw new AppError('NO_MORE_ROUNDS', 'Ja no queden rondes');
  }

  startRound(pregunta) {
    this.roundNumber++;
    this.state = ESTATS.VOTING;
    this.question = pregunta;
    this.slider = rangSlider(pregunta.resposta_correcta);
    this.answers.clear();
    this.closing = false;
    this.usedQuestionIds.push(pregunta.id);
  }

  submitAnswer(playerId, value) {
    if (this.state !== ESTATS.VOTING) throw new AppError('INVALID_STATE', 'No hi ha cap ronda oberta');
    if (this.answers.has(playerId)) throw new AppError('ALREADY_ANSWERED', 'Ja has respost aquesta ronda');
    if (!Number.isInteger(value)) throw new AppError('INVALID_VALUE', 'La resposta ha de ser un nombre enter');
    if (value < this.slider.min || value > this.slider.max) {
      throw new AppError('INVALID_VALUE', `La resposta ha d'estar entre ${this.slider.min} i ${this.slider.max}`);
    }
    this.answers.set(playerId, value);
  }

  // Tothom que està connectat ha respost?
  allAnswered() {
    return this.connectedPlayers().every((p) => this.answers.has(p.id));
  }

  // Tanca la ronda i calcula punts. Retorna null si ja s'estava tancant (idempotent).
  closeRound() {
    if (this.state !== ESTATS.VOTING || this.closing) return null;
    this.closing = true;
    this.state = ESTATS.RESULTS; // es canvia ABANS de qualsevol await (vegeu skill: concurrència)

    const correcta = this.question.resposta_correcta;
    const respostes = [...this.answers].map(([playerId, value]) => ({ playerId, value }));
    const resultats = puntuarRonda(correcta, respostes);

    for (const r of resultats) this.players.get(r.playerId).score += r.points;

    const senseResposta = [...this.players.values()]
      .filter((p) => !this.answers.has(p.id))
      .map((p) => ({ playerId: p.id, name: p.name, value: null, diff: null, position: null, points: 0 }));

    return {
      round: this.roundNumber,
      correctAnswer: correcta,
      results: [
        ...resultats.map((r) => ({ ...r, name: this.players.get(r.playerId).name })),
        ...senseResposta,
      ],
      leaderboard: this.leaderboard(),
      isLastRound: this.roundNumber >= this.numRounds,
    };
  }

  finish() {
    this.state = ESTATS.FINISHED;
    return { leaderboard: this.leaderboard() };
  }

  // ---------- Vistes públiques (el que es pot enviar als clients) ----------
  leaderboard() {
    return [...this.players.values()]
      .map((p) => ({ playerId: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  publicPlayers() {
    return [...this.players.values()].map(({ id, name, isHost, connected, score }) => ({
      id, name, isHost, connected, score,
    }));
  }

  // Pregunta SENSE la resposta correcta
  publicQuestion() {
    return {
      round: this.roundNumber,
      totalRounds: this.numRounds,
      question: { id: this.question.id, text: this.question.enunciat, category: this.question.categoria },
      slider: this.slider,
    };
  }

  // Qui ha votat, però NO què ha votat
  voteStatus() {
    return { answered: [...this.answers.keys()], total: this.connectedPlayers().length };
  }

  summary() {
    return {
      code: this.code,
      state: this.state,
      round: this.roundNumber,
      totalRounds: this.numRounds,
      players: this.publicPlayers(),
    };
  }
}

module.exports = { Room, ESTATS };

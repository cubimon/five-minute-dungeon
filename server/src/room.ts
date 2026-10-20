import { Room, Client } from "colyseus";
import * as crypto from "node:crypto";
import { Enemy, GameState, Player, enemiesToWin, maxHandCards } from "./state";
import { CardType, GameStatus } from "./types";
import { ENEMY_TEMPLATES, HEROES_MAP } from "./data";
 
export class GameRoom extends Room {
  state = new GameState();

  async onCreate(options: any) {
    this.state = new GameState();
    this.state.status = GameStatus.LOBBY;

    // code
    this.state.roomCode = options.room_code || this.generateRandomCode(4);
    await this.setMetadata({ room_code: this.state.roomCode });
    console.log(`Game room created with code: ${this.state.roomCode}`);

    // messages
    this.onMessage("set_ready", this.setReady.bind(this));
    this.onMessage("select_hero", this.selectHero.bind(this));
    this.onMessage("set_player_name", this.setPlayerName.bind(this));
    this.onMessage("play_card", this.playCard.bind(this));
    this.onMessage("draw", this.draw.bind(this));
    this.onMessage("special", this.special.bind(this));
  }

  onJoin(client: Client, options: unknown) {
    if (this.state.status !== GameStatus.LOBBY) {
      console.log(`Rejecting client because game is not in lobby, ${client.sessionId}`);
      client.leave(4000);
      return;
    }
    console.log(`Client ${client.sessionId} joined`);
    const player = new Player();
    player.name = `Player #${this.state.players.size}`;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, code: number) {
    console.log(`Client ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);
  }

  private async setReady(client: Client, isReady: boolean) {
    if (this.state.status !== GameStatus.LOBBY) {
      console.error("Can't change ready state outside LOBBY");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    player.isReady = isReady;
    console.log(`Player ${client.sessionId} isReady: ${isReady}`);
    await this.checkAllPlayersReady();
  }

  private selectHero(client: Client, message: { name: string }) {
    if (this.state.status !== GameStatus.LOBBY) {
      console.error("Can't change hero outside LOBBY");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    const hero = HEROES_MAP[message.name];
    if (!hero) {
      console.error(`Unknown hero name ${message.name}`);
      return;
    }
    console.log(`Player ${client.sessionId} selected ${message.name}`);
    player.selectHero(hero);
    player.isReady = false;
    console.log(player.isReady);
  }

  setPlayerName(client: Client, message: { name: string }) {
    if (this.state.status !== GameStatus.LOBBY) {
      console.error("Can't change playername outside LOBBY");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    console.log(`Player ${client.sessionId} set name to ${message.name}`);
    player.name = message.name;
    player.isReady = false;
  }

  private playCard(client: Client, message: { id: number }) {
    if (this.state.status !== GameStatus.PLAYING) {
      console.error("Can't play cards outside PLAYING state");
      return;
    }
    if (this.state.isTimeOver()) {
      console.error("Game time is over");
      return;
    }
    const enemy = this.state.currentEnemy;
    if (!enemy || this.state.status !== GameStatus.PLAYING) {
      console.error("Can't play cards while not PLAYING state");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    const handCard = player.getHandCard(message.id);
    if (!handCard) {
      console.error(`Player ${player.name} doesn't have card ${message.id} on hand`);
      return;
    }
    if (enemy.play(handCard.type as CardType)) {
      if (this.state.frozen) {
        console.log("Enemy damaged -> unfrozen");
        this.state.frozen = false;
        this.broadcast("unfrozen");
      }
      console.log(`Player ${player.name} played ${handCard.type}`);
      player.playedHandCard(handCard);
      client.send("played_card", message);
      client.send("updated_enemy", this.state.currentEnemy);
    } else {
      console.log(`Player ${player.name} played illegal card ${handCard.type}`);
    }
    if (enemy.isDefeated()) {
      console.log(`Enemy ${enemy.name} defeated!`);
      this.state.currentEnemy = null;
      this.state.enemiesBeaten += 1;
      if (this.state.enemiesBeaten < enemiesToWin) {
        this.spawnEnemy();
      } else {
        console.log("Game over - all enemies defeated");
        this.state.status = GameStatus.FINISHED;
        this.broadcast("game_over");
      }
    }
  }

  private draw(client: Client) {
    if (this.state.status !== GameStatus.PLAYING) {
      console.error("Can't draw card outside PLAYING state");
      return;
    }
    if (this.state.isTimeOver()) {
      console.error("Game time is over");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    if (player.handCards.length >= maxHandCards) {
      console.error(`Player ${player.name} can't draw more than ${maxHandCards} cards`);
      return;
    }
    const drawnCard = player.drawCard();
    if (drawnCard) {
      console.log(`Drawn card ${drawnCard.type}`);
      client.send("drawn_card", drawnCard);
    }
  }

  private special(client: Client) {
    if (this.state.status !== GameStatus.PLAYING) {
      console.error("Can't activate special outside PLAYING state");
      return;
    }
    if (this.state.isTimeOver()) {
      console.error("Game time is over");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    player.special(this);
  }

  private async checkAllPlayersReady() {
    let allReady = true;
    this.state.players.forEach(player => allReady = allReady && player.isReadyAndSet());
    const usedNames = new Set();
    for (const player of this.state.players.values()) {
      if (usedNames.has(player.name)) {
        console.log("Player names must be unique");
        return;
      }
      usedNames.add(player.name);
    }
    if (allReady && this.state.players.size > 0) {
      console.log("Everyone is ready");
      await this.startGame();
    }
  }

  private async startGame() {
    console.log("All players ready, starting game now...");
    this.state.status = GameStatus.PLAYING;
    this.state.players.forEach(player => player.prepareCards());
    await this.lock();
    this.spawnEnemy();
    this.state.startTime = Date.now();
    setInterval(this.tick.bind(this), 1000);
  }

  private tick() {
    if (!this.state.frozen) {
      this.state.elapsedTime += 1000;
    }
    if (this.state.status === GameStatus.PLAYING
        && this.state.isTimeOver()) {
      console.log("Game is over - time ran out");
      this.state.status = GameStatus.FINISHED;
      this.broadcast("game_over");
    }
  }

  private spawnEnemy() {
    const randomIndex = Math.floor(Math.random() * ENEMY_TEMPLATES.length);
    this.state.currentEnemy = new Enemy(ENEMY_TEMPLATES[randomIndex]);
  }

  private generateRandomCode(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
    return result;
  }
}

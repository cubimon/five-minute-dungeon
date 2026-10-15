import { Room, Client } from "colyseus";
import * as crypto from "node:crypto";
import { Enemy, GameState, Player } from "./state";
import { CardType, GameStatus } from "./types";
import { ENEMY_TEMPLATES, HEROES_MAP } from "./data";
 
export class GameRoom extends Room {
  state = new GameState();

  async onCreate(options: any) {
    this.state = new GameState();
    this.state.status = GameStatus.LOBBY;

    // code
    const roomCode = options.room_code || this.generateRandomCode(4);
    await this.setMetadata({ room_code: roomCode });
    console.log(`Game room created with code: ${options.room_code}`);

    // messages
    this.onMessage("set_ready", this.setReady.bind(this));
    this.onMessage("select_hero", this.selectHero.bind(this));
    this.onMessage("set_player_name", this.setPlayerName.bind(this));
    this.onMessage("play_card", this.playCard.bind(this));
    this.onMessage("draw", this.draw.bind(this));
  }

  onJoin(client: Client, options: unknown) {
    if (this.state.status !== GameStatus.LOBBY) {
      console.log(`Rejecting client because game is not in lobby, ${client.sessionId}`);
      client.leave(4000);
      return;
    }
    console.log(`Client ${client.sessionId} joined`);
    const player = new Player();
    player.isReady = false;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, code: number) {
    console.log(`Client ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);
  }

  private async setReady(client: Client, isReady: boolean) {
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
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    const hero = HEROES_MAP[message.name];
    if (!hero) {
      console.error("Unknown hero name");
      return;
    }
    player.selectHero(hero);
    player.isReady = false;
  }

  setPlayerName(client: Client, message: { name: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    player.name = message.name;
    player.isReady = false;
  }

  private playCard(client: Client, message: { id: number }) {
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
      player.playedHandCard(handCard);
    }
    if (enemy.isDefeated()) {
      console.log(`Enemy ${enemy.name} defeated!`);
      this.state.currentEnemy = null;
      this.state.enemiesBeaten += 1;
      if (this.state.enemiesBeaten < this.state.enemiesToWin) {
        this.spawnEnemy();
      } else {
        console.log("All enemies defeated");
      }
    }
  }

  private draw(client: Client) {
    if (this.state.isTimeOver()) {
      console.error("Game time is over");
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error("No player assigned to session");
      return;
    }
    if (player.handCards.length >= this.state.maxHandCards) {
      console.error(`Player ${player.name} can't draw more than ${this.state.maxHandCards} cards`);
      return;
    }
    player.drawCard();
  }

  private async checkAllPlayersReady() {
    let allReady = true;
    this.state.players.forEach(player => allReady = allReady && player.isReady);
    if (allReady && this.state.players.size > 0) {
      console.log("Everyone is ready");
      await this.startGame();
    }
  }

  private async startGame() {
    console.log("Alle Spieler sind bereit! Starte das Spiel...");
    this.state.status = GameStatus.PLAYING;
    await this.lock();
    this.spawnEnemy();
    this.state.startTime = Date.now();
    this.broadcast("game_start");
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

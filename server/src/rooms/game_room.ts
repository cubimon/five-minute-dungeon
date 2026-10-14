import { Room, Client } from "colyseus";
import { MapSchema, Schema, type } from "@colyseus/schema";
import * as crypto from "node:crypto";

interface EnemyTemplate {
  name: string;
  requiredAttack: number;
  requiredShield: number;
  requiredMagic: number;
  requiredJump: number;
}

const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    name: "Goblin Scout",
    requiredAttack: 2,
    requiredShield: 1,
    requiredMagic: 0,
    requiredJump: 1,
  },
  {
    name: "Orc Warrior",
    requiredAttack: 3,
    requiredShield: 4,
    requiredMagic: 0,
    requiredJump: 2,
  },
  {
    name: "Archmage Specter",
    requiredAttack: 1,
    requiredShield: 2,
    requiredMagic: 3,
    requiredJump: 2,
  },
  {
    name: "Dungeon Boss",
    requiredAttack: 5,
    requiredShield: 5,
    requiredMagic: 4,
    requiredJump: 3,
  }
];

export enum GameStatus {
  LOBBY = "LOBBY",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED"
}

class Player extends Schema {
  @type("boolean") isReady: boolean = false;
}

class Enemy extends Schema {
  @type("string") name: string = "";
  @type("number") requiredAttack: number = 0;
  @type("number") requiredShield: number = 0;
  @type("number") requiredMagic: number = 0;
  @type("number") requiredJump: number = 0;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status: string = GameStatus.LOBBY;
  @type(Enemy) currentEnemy: Enemy | null = null;
  @type("number") enemiesToWin: number = 10;
  @type("number") enemiesBeaten: number = 0;
}
 
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
    this.onMessage("play_card", this.handlePlayCard.bind(this));
  }

  onJoin(client: Client, options: any) {
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
      return;
    }
    player.isReady = isReady;
    console.log(`Player ${client.sessionId} isReady: ${isReady}`);
    await this.checkAllPlayersReady();
  }

  private handlePlayCard(client: Client, message: { type: string }) {
    const enemy = this.state.currentEnemy;
    if (!enemy || this.state.status !== GameStatus.PLAYING) {
      return;
    }

    // Check card type and decrement requirements if greater than 0
    if (message.type === "ATTACK" && enemy.requiredAttack > 0) {
      enemy.requiredAttack -= 1;
      console.log(`Attack applied! Remaining attacks needed: ${enemy.requiredAttack}`);
    } else if (message.type === "SHIELD" && enemy.requiredShield > 0) {
      enemy.requiredShield -= 1;
      console.log(`Shield applied! Remaining shield needed: ${enemy.requiredShield}`);
    } else if (message.type === "MAGIC" && enemy.requiredMagic > 0) {
      enemy.requiredMagic -= 1;
      console.log(`Magic applied! Remaining magic needed: ${enemy.requiredMagic}`);
    } else if (message.type === "JUMP" && enemy.requiredJump > 0) {
      enemy.requiredJump -= 1;
      console.log(`Jump applied! Remaining jump needed: ${enemy.requiredJump}`);
    }

    // Check if the enemy's requirements are fully met
    if (enemy.requiredAttack === 0 && enemy.requiredShield === 0 &&
        enemy.requiredMagic === 0 && enemy.requiredJump === 0) {
      console.log(`Enemy ${enemy.name} defeated!`);
      this.state.currentEnemy = null;
      this.state.enemiesBeaten += 1;
      if (this.state.enemiesBeaten < this.state.enemiesToWin) {
        this.spawnEnemy();
      } else {
        console.log("All enemies beaten");
      }
    }
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
    this.broadcast("game_start");
  }

  private spawnEnemy() {
    const randomIndex = Math.floor(Math.random() * ENEMY_TEMPLATES.length);
    const template = ENEMY_TEMPLATES[randomIndex];
    
    this.instantiateEnemy(template);
  }

  private instantiateEnemy(template: EnemyTemplate) {
    const enemy = new Enemy();
    enemy.name = template.name;
    enemy.requiredAttack = template.requiredAttack;
    enemy.requiredShield = template.requiredShield;
    enemy.requiredMagic = template.requiredMagic;
    enemy.requiredJump = template.requiredJump;

    this.state.currentEnemy = enemy;
    console.log(`Spawned ${enemy.name}`);
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

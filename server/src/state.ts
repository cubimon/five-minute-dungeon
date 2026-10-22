import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { CardType, GameStatus, ICardCount, IEnemy, IHero } from "./types";
import { HEROES_MAP, ICardId } from "./data";
import type { GameRoom } from "./room";


export const enemiesToWin: number = 2;
export const maxHandCards: number = 5;
export const gameDuration: number = 60 * 1000;

function typesMatch(type1: string | null, type2: string | null) {
  return type1 === type2 || type1 === "ANY" || type2 === "ANY";
}

export class CardId extends Schema {
  @type("number") id: number = 0;
  @type("string") type: string = "";
  @type("number") count: number = 1;
  @type("number") remainingCount: number = 1;
  @type("boolean") all: boolean = false;

  constructor(data: ICardId) {
    super();
    this.id = data.id;
    this.type = data.type;
    if (typeof data.count === "number") {
      this.count = data.count;
      this.remainingCount = data.count;
    } else if (data.count === "ALL") {
      this.count = -1;
      this.all = true;
    }
  }
}

export class CardRequirement extends Schema {
  /**
   * type of card required.
   */
  @type("string") type: string | null = null;
  /**
   * number of cards required to play.
   */
  @type("number") count: number = 0;
  /**
   * number of cards played to meet this requirement.
   */
  @type("number") played: number = 0;

  constructor(cardCount: ICardCount) {
    super();
    this.type = cardCount.type;
    this.count = cardCount.count;
    this.played = 0;
  }

  /**
   * 
   * @param cardId 
   * @returns true if consumed, false otherwise
   */
  play(cardId: CardId): boolean {
    if (this.isMet()) {
      return false;
    }
    if (typesMatch(this.type, cardId.type)) {
      if (cardId.all) {
        this.played = this.count;
        // keep using the card
        return false;
      } else if (cardId.count > 0) {
        // check if fully consumed
        const remainingCount = this.count - this.played;
        if (cardId.remainingCount > remainingCount) {
          this.played = this.count;
          cardId.remainingCount -= remainingCount;
          return false;
        } else {
          this.played += cardId.remainingCount;
          cardId.remainingCount = 0;
          return true;
        }
      }
      console.error('card id count <= 0');
    }
    return false;
  }

  isMet(): boolean {
    return this.played >= this.count;
  }
}

export class Enemy extends Schema {
  @type("string") name: string = "";
  @type([CardRequirement]) requirements = new ArraySchema<CardRequirement>();

  constructor(enemyTemplate: IEnemy) {
    super();
    this.name = enemyTemplate.name;
    for (const cardCount of enemyTemplate.cardRequirements) {
      this.requirements.push(new CardRequirement(cardCount));
    }
  }

  play(cardId: CardId) {
    for (const requirement of this.requirements) {
      if (requirement.play(cardId)) {
        return true;
      }
    }
    return false;
  }

  isDefeated() {
    for (const requirement of this.requirements) {
      if (!requirement.isMet()) {
        return false;
      }
    }
    return true;
  }
}

export class Player extends Schema {
  @type("boolean") isReady: boolean = false;
  @type("string") name: string = "";
  @type("string") hero: string = "";
  @type([CardId]) handCards = new ArraySchema<CardId>();
  @type([CardRequirement]) blockers = new ArraySchema<CardRequirement>();

  poolCards: CardId[] = [];
  usedCards: CardId[] = [];

  constructor() {
    super();
    this.selectHero(HEROES_MAP["Mage"]);
  }

  isReadyAndSet() {
    return this.isReady && this.name.length > 0 && this.hero in HEROES_MAP;
  }

  selectHero(hero: IHero) {
    this.hero = hero.name;
    switch(this.hero) {
      case "Warrior":
        this.special = this._warriorSpecial.bind(this);
        break;
      case "Mage":
        this.special = this._mageSpecial.bind(this);
        break;
    }
  }

  prepareCards() {
    const hero = HEROES_MAP[this.hero];
    if (!hero) {
      console.error(`Illegal hero name ${this.hero}`);
      return;
    }
    this.poolCards = [];
    let nextId = 0;
    for (const cardCount of hero.cardCounts) {
      for (let i = 0; i < cardCount.count; i++) {
        this.poolCards.push(new CardId({
          id: nextId,
          type: cardCount.type
        }));
        nextId += 1;
      }
    }
    shuffleArray(this.poolCards);
    for (let i = 0; i < maxHandCards; i++) {
      this.drawCard();
    }
  }

  getHandCard(id: number): CardId | null {
    for (const handCard of this.handCards) {
      if (handCard.id === id) {
        return handCard;
      }
    }
    return null;
  }

  playedHandCard(cardId: CardId) {
    const index = this.handCards.indexOf(cardId);
    if (index < 0) {
      return;
    }
    cardId.remainingCount = 0;
    this.handCards.splice(index, 1);
  }

  cleanMetBlocker() {
    for (const blocker of this._getMetBlockers()) {
      const index = this.blockers.indexOf(blocker);
      if (index < 0) {
        console.error("Blocker to remove not found");
        continue;
      }
      this.blockers.splice(index, 1);
    }
  }

  drawCard(): CardId | undefined {
    if (this.poolCards.length == 0) {
      return;
    }
    const drawnCard = this.poolCards.pop();
    if (drawnCard) {
      this.handCards.push(drawnCard);
      return drawnCard;
    }
  }

  special(room: GameRoom) {
    console.warn("Empty special");
  }

  private _mageSpecial(room: GameRoom) {
    console.log("Freezing time");
    room.state.frozen = true;
    this.blockers.push(new CardRequirement({ type: CardType.ANY, count: 3}));
    room.broadcast("frozen");
  }

  private _warriorSpecial(room: GameRoom) {
    console.log("Megaattack");
    room.state.currentEnemy?.play(new CardId({
      id: -1,
      type: CardType.ATTACK,
      count: "ALL"
    }));
    this.blockers.push(new CardRequirement({ type: CardType.ANY, count: 3}));
  }

  private _getMetBlockers() {
    return this.blockers.filter(blocker => blocker.isMet());
  }
}

export class GameState extends Schema {
  @type("string") roomCode: string = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status: string = GameStatus.LOBBY;
  @type(Enemy) currentEnemy: Enemy | null = null;
  @type("number") enemiesBeaten: number = 0;
  @type("number") startTime: number = 0;
  @type("number") elapsedTime: number = 0;
  @type("boolean") frozen: boolean = false;
  @type("number") gameDuration: number = gameDuration;

  isTimeOver(): boolean {
    return this.elapsedTime > this.gameDuration;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

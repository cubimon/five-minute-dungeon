import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { CardType, GameStatus, ICardCount, IEnemy, IHero } from "./types";
import { HEROES_MAP } from "./data";


export const enemiesToWin: number = 10;
export const maxHandCards: number = 5;
export const gameDuration: number = 5 * 60 * 1000;

export class CardId extends Schema {
  @type("number") id: number = 0;
  @type("string") type: string = "";

  constructor(id: number, type: CardType) {
    super();
    this.id = id;
    this.type = type;
  }
}

export class Player extends Schema {
  @type("boolean") isReady: boolean = false;
  @type("string") name: string = "";
  @type("string") hero: string = "";
  @type([CardId]) handCards = new ArraySchema<CardId>();

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
        this.poolCards.push(new CardId(nextId, cardCount.type));
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
    this.handCards.splice(index, 1);
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

  play(cardType: CardType): boolean {
    if (this.played >= this.count) {
      return false;
    }
    if (this.type == cardType) {
      this.played += 1;
      return true;
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

  play(cardType: CardType) {
    for (const requirement of this.requirements) {
      if (requirement.play(cardType)) {
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

export class GameState extends Schema {
  @type("string") roomCode: string = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status: string = GameStatus.LOBBY;
  @type(Enemy) currentEnemy: Enemy | null = null;
  @type("number") enemiesBeaten: number = 0;
  @type("number") startTime: number = 0;

  isTimeOver(): boolean {
    return Date.now() - this.startTime > gameDuration;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

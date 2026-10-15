export enum CardType {
  ATTACK = "ATTACK",
  SHIELD = "SHIELD",
  MAGIC = "MAGIC",
  JUMP = "JUMP",
}

export interface ICardCount {
  type: CardType;
  count: number;
}

export interface IEnemy {
  name: string;
  cardRequirements: ICardCount[];
}

export interface IHero {
  name: string;
  cardCounts: ICardCount[];
}

export enum GameStatus {
  LOBBY = "LOBBY",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED"
}

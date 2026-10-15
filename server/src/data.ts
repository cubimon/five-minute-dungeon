import { CardType, ICardCount, IEnemy, IHero } from "./types";

function cardCounts(requirements: Partial<Record<CardType, number>>): ICardCount[] {
  const result: ICardCount[] = [];
  for (const [typeString, count] of Object.entries(requirements)) {
    const type = typeString as CardType;
    result.push({
      type,
      count
    })
  }
  return result;
}

export const ENEMY_TEMPLATES: IEnemy[] = [
  {
    name: "Goblin Scout",
    cardRequirements: cardCounts({
      ATTACK: 2,
      SHIELD: 1,
      JUMP: 1,
    })
  },
  {
    name: "Orc Warrior",
    cardRequirements: cardCounts({
      ATTACK: 3,
      SHIELD: 4,
      JUMP: 2,
    })
  },
  {
    name: "Archmage Specter",
    cardRequirements: cardCounts({
      ATTACK: 1,
      SHIELD: 2,
      MAGIC: 3,
      JUMP: 2,
    })
  },
  {
    name: "Dungeon Boss",
    cardRequirements: cardCounts({
      ATTACK: 5,
      SHIELD: 5,
      MAGIC: 4,
      JUMP: 3,
    })
  }
];

export const HEROES: IHero[] = [
  {
    name: "Mage",
    cardCounts: cardCounts({
      ATTACK: 5,
      SHIELD: 5,
      MAGIC: 25,
      JUMP: 5,
    })
  },
  {
    name: "Warrior",
    cardCounts: cardCounts({
      ATTACK: 15,
      SHIELD: 15,
      MAGIC: 5,
      JUMP: 5,
    })
  }
];
export const HEROES_MAP: Record<string, IHero> = HEROES.reduce(
  (acc: Record<string, IHero>, hero: IHero) => {
    acc[hero.name] = hero;
    return acc;
  },
  {});

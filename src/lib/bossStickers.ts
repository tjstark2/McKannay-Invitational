// Boss reaction stickers (Birdie Boss perk). Stored as a reaction value with a
// "boss:" prefix so they live alongside the normal unicode emoji reactions.
export const BOSS_PREFIX = "boss:";

export type BossSticker = { id: string; label: string };

export const BOSS_STICKERS: BossSticker[] = [
  { id: "lol", label: "LOL" },
  { id: "dying", label: "Dying" },
  { id: "cha_ching", label: "Cha-Ching" },
  { id: "no_way", label: "No Way" },
  { id: "facepalm", label: "Facepalm" },
  { id: "on_fire", label: "On Fire" },
  { id: "winner", label: "Winner" },
  { id: "golf_clap", label: "Golf Clap" },
  { id: "tears", label: "Crybaby" },
  { id: "talk_trash", label: "Trash Talk" },
  { id: "choking", label: "Choking" },
  { id: "angry", label: "Angry" },
  { id: "nice", label: "Nice" },
  { id: "hole_in_one", label: "Hole in One" },
  { id: "cheers", label: "Cheers" },
  { id: "mic_drop", label: "Mic Drop" },
];

export const bossSrc = (id: string) => `/stickers/boss/${id}.png`;
export const bossValue = (id: string) => `${BOSS_PREFIX}${id}`;
export const isBossReaction = (v: string) => v.startsWith(BOSS_PREFIX);
export const bossIdOf = (v: string) => v.slice(BOSS_PREFIX.length);

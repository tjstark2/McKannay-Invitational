// House rules a trip can switch on. These are the arguments that actually come
// up on a golf trip, phrased as a question with a yes / no / their-call answer,
// so a group can settle them once instead of re-litigating on the 4th tee.
//
// `defaultAnswer` is only the starting position when an organizer enables the
// rule - they can set it to anything.

export type RuleAnswer = "yes" | "no" | "discretion";

export type PresetRule = {
  key: string;
  title: string;
  question: string;
  defaultAnswer: RuleAnswer;
  /** Shown under the answer to spell out what it means in practice. */
  detail: Partial<Record<RuleAnswer, string>>;
};

export const ANSWER_LABELS: Record<RuleAnswer, string> = {
  yes: "Yes",
  no: "No",
  discretion: "Other team's call",
};

export const PRESET_RULES: PresetRule[] = [
  {
    key: "gimmes",
    title: "Gimmes",
    question: "Are gimmes allowed?",
    defaultAnswer: "discretion",
    detail: {
      yes: "Inside the leather is good. Pick it up and move on.",
      no: "Every putt gets holed, no exceptions.",
      discretion: "The other team gives it, or they don't. Ask, don't assume.",
    },
  },
  {
    key: "breakfast_ball",
    title: "Breakfast ball",
    question: "Is a mulligan off the first tee allowed?",
    defaultAnswer: "yes",
    detail: {
      yes: "One re-tee on the opening hole, no penalty.",
      no: "First one counts, same as every other tee.",
      discretion: "Only if the group agrees on the tee.",
    },
  },
  {
    key: "mulligans",
    title: "Mulligans",
    question: "Are mulligans allowed after the first tee?",
    defaultAnswer: "no",
    detail: {
      yes: "One per player per round unless the group says otherwise.",
      no: "Play it as it lies, all 18.",
      discretion: "Ask the other team before you re-hit.",
    },
  },
  {
    key: "winter_rules",
    title: "Lift, clean and place",
    question: "Can you improve your lie in the fairway?",
    defaultAnswer: "yes",
    detail: {
      yes: "One club length in your own fairway, no closer to the hole.",
      no: "Play it down wherever it finishes.",
      discretion: "Only for clearly damaged ground, by agreement.",
    },
  },
  {
    key: "ob_stroke_distance",
    title: "Out of bounds and lost balls",
    question: "Do you play stroke and distance?",
    defaultAnswer: "no",
    detail: {
      yes: "Back to where you hit it, one shot penalty.",
      no: "Drop near where it was lost, two shot penalty, keeps pace up.",
      discretion: "Group decides based on how far back the tee is.",
    },
  },
  {
    key: "provisional",
    title: "Provisionals",
    question: "Must you hit a provisional when a ball might be lost?",
    defaultAnswer: "yes",
    detail: {
      yes: "Any doubt, hit a second ball before you leave the tee.",
      no: "Go look for it first.",
      discretion: "Group's call on the day.",
    },
  },
  {
    key: "max_score",
    title: "Maximum score",
    question: "Is there a cap on any one hole?",
    defaultAnswer: "yes",
    detail: {
      yes: "Double par and pick up. Keeps rounds moving.",
      no: "Hole everything out, however long it takes.",
      discretion: "Pick up when the hole is already decided.",
    },
  },
  {
    key: "ready_golf",
    title: "Ready golf",
    question: "Do you play ready golf instead of honours?",
    defaultAnswer: "yes",
    detail: {
      yes: "Hit when you're ready and it's safe. Pace over ceremony.",
      no: "Furthest from the hole plays first, honours on the tee.",
      discretion: "Match play sides can insist on honours.",
    },
  },
  {
    key: "rangefinders",
    title: "Rangefinders and GPS",
    question: "Are distance devices allowed?",
    defaultAnswer: "yes",
    detail: {
      yes: "Any device is fine, including slope.",
      no: "Eyes and yardage markers only.",
      discretion: "Allowed unless the other team objects.",
    },
  },
  {
    key: "cart_path_relief",
    title: "Cart paths and obstructions",
    question: "Is free relief allowed from paths and sprinkler heads?",
    defaultAnswer: "yes",
    detail: {
      yes: "Nearest point of relief, no penalty.",
      no: "Play it off the path if that's where it sits.",
      discretion: "By agreement, hole by hole.",
    },
  },
  {
    key: "putt_out",
    title: "Putting out",
    question: "Must you finish the hole once the match is decided?",
    defaultAnswer: "no",
    detail: {
      yes: "Hole out every time - the net score still counts.",
      no: "Pick up once the hole is halved or won.",
      discretion: "Depends whether the round counts for net points.",
    },
  },
  {
    key: "advice",
    title: "Advice between partners",
    question: "Can teammates give each other advice and read putts?",
    defaultAnswer: "yes",
    detail: {
      yes: "Partners can help each other freely.",
      no: "No coaching, play your own ball.",
      discretion: "Fine unless the other side asks you to stop.",
    },
  },
];

export function presetByKey(key: string): PresetRule | undefined {
  return PRESET_RULES.find((r) => r.key === key);
}

export const classes = ["Fighter", "Mage", "Priest"];
export const qualities = [
  "White · Common",
  "Blue · Rare",
  "Purple · Epic",
  "Gold · Legendary",
];
// Target side, timing bonus, effect description.
export const skills = {
  Slash: ["enemy", 0, "Strike for 100% physical attack."],
  Guard: [
    "ally",
    30,
    "Guard an ally this round, reducing incoming attack damage by 45%.",
  ],
  Ambush: [
    "enemy",
    8,
    "Deal 110% physical attack, or 165% against a marked enemy.",
  ],
  Riposte: [
    "ally",
    24,
    "Guard an ally for 30% reduction and counter each blocked attack for 50% physical attack.",
  ],
  Spark: ["enemy", 0, "Deal 105% magical attack."],
  Flare: ["enemy", -3, "Deal 125% magical attack."],
  Aegis: ["ally", 30, "Shield an ally for 25% of their maximum HP this round."],
  Discharge: [
    "enemy",
    0,
    "Deal 100% magical attack plus 8 damage if an ally has a barrier.",
  ],
  Smite: ["enemy", 0, "Deal 100% magical attack as holy damage."],
  Mend: ["ally", 0, "Restore HP equal to 90% magical attack."],
  Judgment: ["enemy", -2, "Deal 155% magical attack as holy damage."],
  Bless: [
    "ally",
    25,
    "Grant +8 holy damage on the next attack. Lasts until used, refreshes once.",
  ],
  Haste: ["ally", 25, "Grant +8 Speed next round."],
};
const rows = [
  [
    "Fighter",
    [
      ["plate", "Layered Plate", 0, "Gain +3 physical defense.", 3],
      ["edge", "Honed Edge", 0, "Gain +3 physical attack.", 3],
      ["foot", "Lightfoot", 0, "Gain +3 Speed.", 3],
      ["twin", "Twin Blades", 1, "Replace slot 2 with Ambush.", 1, "Ambush", 1],
      [
        "feint",
        "Shield Feint",
        1,
        "Each hit blocked by your guard marks its attacker for the next allied hit.",
        1,
      ],
      [
        "riposte",
        "Duelist’s Oath",
        1,
        "Replace slot 2 with Riposte.",
        1,
        "Riposte",
        1,
      ],
      [
        "bulwark",
        "Guardian Stance",
        1,
        "Restore Guard in slot 2 and gain +2 physical defense.",
        1,
        "Guard",
        1,
      ],
      [
        "quarry",
        "Quarry",
        1,
        "Slash marks its target after dealing damage. The next allied hit consumes the mark.",
        1,
      ],
      [
        "pursuit",
        "Hot Pursuit",
        2,
        "Gain +9 damage when attacking a marked target.",
        1,
      ],
      [
        "iron",
        "Iron Resolve",
        2,
        "While below half HP, reduce each incoming attack by 5.",
        1,
      ],
      [
        "tempo",
        "Counterpoise",
        2,
        "After blocking a hit, gain +6 Speed next round.",
        1,
      ],
      [
        "execution",
        "Executioner",
        3,
        "Once per round, double attack damage against a target below 35% HP.",
        1,
      ],
    ],
  ],
  [
    "Mage",
    [
      [
        "thread",
        "Warding Thread",
        0,
        "Increase barriers you create by 15%.",
        3,
      ],
      ["focus", "Crystal Focus", 0, "Gain +3 magical attack.", 3],
      ["cloak", "Runed Cloak", 0, "Gain +3 magical defense.", 3],
      [
        "aegis",
        "Aegis Weave",
        1,
        "Replace Flare’s slot with Aegis.",
        1,
        "Aegis",
        1,
      ],
      [
        "discharge",
        "Charged Staff",
        1,
        "Replace Spark’s slot with Discharge.",
        1,
        "Discharge",
        0,
      ],
      [
        "flare",
        "Ember Tome",
        1,
        "Restore Flare in slot 2 and gain +2 magical attack.",
        1,
        "Flare",
        1,
      ],
      [
        "lattice",
        "Ward Lattice",
        1,
        "At round start, shield yourself for 6 HP.",
        1,
      ],
      ["cinder", "Cinder Seal", 1, "Flare marks its target after impact.", 1],
      [
        "mirror",
        "Mirror Ward",
        2,
        "First allied barrier broken each round reflects 50% of absorbed damage (ignores defense).",
        1,
      ],
      [
        "feedback",
        "Arcane Feedback",
        2,
        "When your barrier absorbs damage, heal its bearer for 3 HP after the hit if alive.",
        1,
      ],
      ["surge", "Overcharge", 2, "While shielded, deal +7 spell damage.", 1],
      [
        "sanctuary",
        "Last Sanctuary",
        3,
        "Once per match, an active Mage barrier saves its bearer from a lethal attack at 1 HP.",
        1,
      ],
    ],
  ],
  [
    "Priest",
    [
      ["votive", "Votive Flame", 0, "Your holy attacks deal +3 damage.", 3],
      ["mercy", "Mercy", 0, "Mend restores 5 more HP.", 3],
      [
        "pilgrim",
        "Pilgrim’s Pace",
        0,
        "Gain +4 Speed while choosing a skill that targets an ally.",
        3,
      ],
      [
        "judgment",
        "Judgment",
        1,
        "Replace Mend’s slot with Judgment.",
        1,
        "Judgment",
        1,
      ],
      [
        "arms",
        "Consecrated Arms",
        1,
        "Replace Smite’s slot with Bless.",
        1,
        "Bless",
        0,
      ],
      [
        "hymn",
        "Marching Hymn",
        1,
        "Replace Smite’s slot with Haste.",
        1,
        "Haste",
        0,
      ],
      [
        "renew",
        "Healing Vow",
        1,
        "Restore Mend in slot 2 and gain +2 magical defense.",
        1,
        "Mend",
        1,
      ],
      ["prism", "Sun Prism", 1, "Smite marks its target after impact.", 1],
      [
        "overflow",
        "Overflow",
        2,
        "Mend converts excess healing into a barrier lasting this round.",
        1,
      ],
      ["fervor", "Holy Fervor", 2, "Bless grants 6 additional holy damage.", 1],
      [
        "verdict",
        "Final Verdict",
        2,
        "Judgment deals +10 damage to marked targets.",
        1,
      ],
      [
        "dawn",
        "Second Dawn",
        3,
        "Once per match, at round start heal each living teammate for 12 HP when any is below half HP.",
        1,
      ],
    ],
  ],
  [
    "Any",
    [
      [
        "luck",
        "Lucky Charm",
        0,
        "Gain +3 Luck, up to 10. Improves odds from the next draft.",
        4,
      ],
      [
        "ration",
        "Field Rations",
        0,
        "Restore 12 HP immediately and increase max HP by 2.",
        Infinity,
      ],
      [
        "drill",
        "Battle Drill",
        0,
        "Gain +2 physical and magical attack.",
        Infinity,
      ],
      [
        "mail",
        "Chain Links",
        0,
        "Gain +2 physical and magical defense.",
        Infinity,
      ],
      ["stride", "Swift Boots", 1, "Gain +4 Speed.", 3],
      ["vigor", "Vital Reserve", 1, "Gain 12 max HP and heal 12 HP.", 3],
      [
        "sight",
        "Spotter",
        1,
        "Your first attack each round marks its target after damage.",
        1,
      ],
      [
        "relay",
        "Opening Bell",
        1,
        "At round start, give the lowest-HP living ally a 4 HP barrier.",
        1,
      ],
      [
        "exploit",
        "Exploit the Opening",
        2,
        "First allied hit on a marked target each round deals +8 damage.",
        1,
      ],
      [
        "guarded",
        "Sheltered Edge",
        2,
        "Deal +6 attack damage while protected by a guard.",
        1,
      ],
      [
        "cleanse",
        "Clear Mind",
        2,
        "Remove your mark at the start of each round and heal 4 HP if removed.",
        1,
      ],
      [
        "comet",
        "Comet Sign",
        3,
        "Once per match, the wearer’s first attack deals +18 damage and marks its target.",
        1,
      ],
    ],
  ],
];
export const cards = rows.flatMap(([group, entries]) =>
  entries.map(([id, name, tier, description, limit, skill, slot]) => ({
    id,
    name,
    tier,
    description,
    limit,
    skill,
    slot,
    group,
  })),
);
export const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
export const dependencies = {
  feint: ["Guard", "Riposte"],
  tempo: ["Guard", "Riposte"],
  quarry: ["Slash"],
  cinder: ["Flare"],
  mercy: ["Mend"],
  overflow: ["Mend"],
  fervor: ["Bless"],
  verdict: ["Judgment"],
  prism: ["Smite"],
};
export function replacement(
  hero,
  card,
  {
    skillName = (s) => s,
    skillText = (s) => skills[s][2],
    cardName = (c) => c.name,
    inactive = "Inactive after swap:",
  } = {},
) {
  if (!card.skill) return "";
  const future = hero.skills.slice();
  future[card.slot] = card.skill;
  const lost = Object.keys(hero.cards).filter(
    (id) =>
      dependencies[id]?.includes(hero.skills[card.slot]) &&
      !dependencies[id].some((s) => future.includes(s)),
  );
  return [
    skillName(hero.skills[card.slot]) + " → " + skillName(card.skill),
    skillText(card.skill),
    lost.length
      ? inactive + " " + lost.map((id) => cardName(byId[id])).join(", ")
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

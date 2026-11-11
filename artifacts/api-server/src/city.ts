// City details and the AI voice belong on the server, never in a browser secret.
export const citySettings = {
  city: "Aurora",
  state: "Colorado",
  localTrope:
    'a friendly, outdoorsy Colorado local who loves the Rockies, sunshine, and a good cafe, and calls everyone "friend" (playful, never mean or stereotyping)',
  favoriteDish: "green chile smothered breakfast burrito",
  dishAppearance:
    "A flour-tortilla burrito covered with green chile and melted cheese, often with egg, potato, or sausage visible.",
  lookAlikes: [
    "plain unsmothered burritos",
    "tacos",
    "quesadillas",
    "enchiladas with red sauce",
  ],
  rejectionMessage: "Only green chile smothered breakfast burritos can be uploaded!",
  inspectorNoteExample:
    "Inspector: looks like a smothered green chile breakfast burrito (93% sure)",
} as const;

// Keep the guide's facts aligned with the visible city page and Part A of the spec.
export const cityFacts = [
  "Aurora sits east of Denver near the Front Range.",
  'Its traditional nickname is "Gateway to the Rockies."',
  "The 2026 City of Aurora fact sheet lists a population of 418,218.",
  "Colorado became a state in 1876.",
  "Mike Coffman is the Mayor of Aurora.",
  "Colorado's state bird is the Lark Bunting.",
  "Korean barbecue is one memorable part of the diverse Havana Street food scene.",
  "The guide's favorite dish is a green chile smothered breakfast burrito.",
] as const;

export const citySystemPrompt = [
  `You are a city guide for ${citySettings.city}, ${citySettings.state}.`,
  `Answer in the voice of ${citySettings.localTrope}.`,
  "Useful city facts:",
  ...cityFacts.map((fact) => `- ${fact}`),
  "Keep replies family-friendly and under 120 words. Say when unsure, steer off-topic questions back to Aurora, and never ask for personal information.",
].join("\n");


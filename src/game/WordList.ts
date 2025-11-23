/**
 * Word List for Imposter Game
 * Pool of secret words that normal players will receive
 */

export const WORD_LIST: string[] = [
  // Food & Drink
  "Pizza",
  "Hamburger",
  "Sushi",
  "Taco",
  "Coffee",
  "Smoothie",
  "Pancakes",
  "Chocolate",
  "Popcorn",
  "Ice Cream",

  // Animals
  "Elephant",
  "Penguin",
  "Dolphin",
  "Giraffe",
  "Butterfly",
  "Kangaroo",
  "Octopus",
  "Flamingo",
  "Hedgehog",
  "Chameleon",

  // Technology
  "Smartphone",
  "Laptop",
  "Headphones",
  "Keyboard",
  "Camera",
  "Drone",
  "Router",
  "Smartwatch",
  "Tablet",
  "USB Cable",

  // Nature
  "Rainbow",
  "Waterfall",
  "Mountain",
  "Volcano",
  "Aurora",
  "Sunset",
  "Lightning",
  "Tornado",
  "Earthquake",
  "Tsunami",

  // Sports & Games
  "Basketball",
  "Soccer",
  "Chess",
  "Bowling",
  "Surfing",
  "Skateboard",
  "Tennis",
  "Golf",
  "Baseball",
  "Swimming",

  // Objects
  "Umbrella",
  "Sunglasses",
  "Backpack",
  "Watch",
  "Bicycle",
  "Skateboard",
  "Telescope",
  "Microscope",
  "Globe",
  "Compass",

  // Entertainment
  "Guitar",
  "Piano",
  "Microphone",
  "Karaoke",
  "Cinema",
  "Painting",
  "Sculpture",
  "Theater",
  "Concert",
  "Festival",

  // Space & Science
  "Astronaut",
  "Rocket",
  "Satellite",
  "Galaxy",
  "Telescope",
  "Black Hole",
  "Comet",
  "Meteor",
  "Space Station",
  "Mars Rover",

  // Fantasy & Mythology
  "Dragon",
  "Unicorn",
  "Phoenix",
  "Mermaid",
  "Wizard",
  "Fairy",
  "Giant",
  "Centaur",
  "Kraken",
  "Griffin",

  // Professions
  "Chef",
  "Firefighter",
  "Astronaut",
  "Detective",
  "Scientist",
  "Artist",
  "Musician",
  "Pilot",
  "Surgeon",
  "Architect",

  // Transportation
  "Airplane",
  "Submarine",
  "Helicopter",
  "Hot Air Balloon",
  "Roller Coaster",
  "Spaceship",
  "Cruise Ship",
  "Motorcycle",
  "Train",
  "Scooter",

  // Seasons & Weather
  "Snowflake",
  "Sunshine",
  "Raindrop",
  "Thunder",
  "Breeze",
  "Fog",
  "Hailstorm",
  "Blizzard",
  "Hurricane",
  "Sandstorm",
];

/**
 * Get a random word from the list
 */
export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
}

/**
 * Get multiple unique random words
 */
export function getRandomWords(count: number): string[] {
  const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, WORD_LIST.length));
}

/**
 * Check if a word exists in the list
 */
export function isValidWord(word: string): boolean {
  return WORD_LIST.includes(word);
}

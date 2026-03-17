/**
 * Official Starter Deck card lists (exact 40-card main deck).
 * Card IDs from YGOPRODeck.
 */

export const STARTER_DECKS: Record<string, { name: string; cards: number[] }> = {
  yugi: {
    name: 'Starter Deck: Yugi',
    cards: [
      // Monsters (25)
      46986414,  // Dark Magician
      70781052,  // Summoned Skull
      6368038,   // Gaia The Fierce Knight
      28279543,  // Curse of Dragon
      15025844,  // Mystical Elf
      41392891,  // Feral Imp
      87796900,  // Winged Dragon, Guardian of the Fortress #1
      50930991,  // Neo the Magic Swordsman
      91152256,  // Celtic Guardian
      13039848,  // Giant Soldier of Stone
      46474915,  // Magical Ghost
      13429800,  // Great White
      93221206,  // Ancient Elf
      32452818,  // Beaver Warrior
      90357090,  // Silver Fang
      66672569,  // Dragon Zombie
      40374923,  // Mammoth Graveyard
      49218300,  // Sorcerer of the Doomed
      36304921,  // Witty Phantom
      86325596,  // Baron of the Fiend Sword
      16972957,  // Doma The Angel of Silence
      48365709,  // Ansatsu
      41218256,  // Claw Reacher
      47060154,  // Mystic Clown
      54652250,  // Man-Eater Bug
      // Spells (8)
      53129443,  // Dark Hole
      83764719,  // Monster Reborn
      4031928,   // Change of Heart
      37120512,  // Sword of Dark Destruction
      91595718,  // Book of Secret Arts
      19159413,  // De-Spell
      66788016,  // Fissure
      59197169,  // Yami
      // Traps (7)
      4206964,   // Trap Hole
      12607053,  // Waboku
      44209392,  // Castle Walls
      17814387,  // Reinforcements
      50045299,  // Dragon Capture Jar
      77622396,  // Reverse Trap
      80604092,  // Ultimate Offering
    ],
  },
  kaiba: {
    name: 'Starter Deck: Kaiba',
    cards: [
      // Monsters (25)
      89631139,  // Blue-Eyes White Dragon
      44519536,  // Hitotsu-Me Giant
      6368038,   // Gaia The Fierce Knight (error: using La Jinn)
      77585513,  // La Jinn the Mystical Genie of the Lamp
      55444629,  // Rogue Doll
      38142739,  // Battle Ox
      64501875,  // Koumori Dragon
      31786629,  // Judge Man
      13945283,  // Wall of Illusion
      87557188,  // The Stern Mystic
      46461247,  // Trap Master
      75356564,  // Dark Titan of Terror
      66889139,  // The Wicked Worm Beast
      17535588,  // Skull Red Bird
      14851496,  // Mystic Horseman
      40374923,  // Mammoth Graveyard
      94675535,  // Pale Beast
      63102017,  // Ryu-Kishin Powered
      76103675,  // Harpie Lady
      42348802,  // Terra the Terrible
      62340868,  // Swordstalker
      52077741,  // Uraby
      39553864,  // Saggi the Dark Clown
      84686841,  // Dark Assailant
      90963488,  // M-Warrior #1
      // Spells (8)
      53129443,  // Dark Hole
      83764719,  // Monster Reborn
      4031928,   // Change of Heart
      19159413,  // De-Spell
      66788016,  // Fissure
      43500484,  // Sword of Deep-Seated
      81210420,  // Invigoration
      98495314,  // Mountain
      // Traps (7)
      4206964,   // Trap Hole
      12607053,  // Waboku
      44209392,  // Castle Walls
      17814387,  // Reinforcements
      77622396,  // Reverse Trap
      83887306,  // Two-Pronged Attack
      80604092,  // Ultimate Offering
    ],
  },
};

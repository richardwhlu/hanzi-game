# Hanzi Creatures 🐉

A Pokemon-inspired Chinese character learning game that combines education with gamification. Practice writing Chinese characters (hanzi) with proper stroke order, level up your characters, and evolve them into phrases!

## Features

### 🎮 Pokemon-Style Mechanics
- Each Chinese character is a unique "creature" with stats (HP, Attack, Defense)
- Gain XP through accurate stroke order practice
- Level up characters to unlock phrase combinations
- Evolution system where leveled characters combine into powerful phrases

### 📚 Educational Focus
- Real stroke order practice using [hanzi-writer.js](https://github.com/chanind/hanzi-writer)
- Pronunciation learning with pinyin display
- Customizable character sets to match textbooks and workbooks
- Accuracy-based progression system

### 🎨 Game Boy Aesthetic
- Retro pixel art styling inspired by Game Boy Color
- Satisfying level-up animations and sound
- Clean, kid-friendly interface designed for ages 5-10

### 💾 Progress Management
- Local storage for persistent progress
- JSON export/import for backing up progress
- Character management system for easy addition/removal

## How to Play

1. **Start Practicing**: Click on any character card to begin writing practice
2. **Follow Strokes**: Use your mouse/finger to trace the character strokes in order
3. **Gain XP**: More accurate writing = more XP gained
4. **Level Up**: Characters gain levels and improved stats
5. **Unlock Phrases**: High-level characters can be combined into phrases
6. **Evolve**: Create powerful phrase "creatures" by meeting level requirements

## Character Stats System

- **HP**: Based on stroke count (more complex characters = more HP)
- **Attack**: Based on character frequency in Chinese language
- **Defense**: Based on learning difficulty rating
- **Level**: Increased through practice sessions
- **XP**: Gained through accurate stroke writing

## Phrase Evolution

Common phrases require lower character levels but are weaker:
- 你好 (Hello): 你 Level 3 + 好 Level 3
- 不好 (Not good): 不 Level 3 + 好 Level 4

Rare phrases require higher levels but are stronger:
- 我是 (I am): 我 Level 5 + 是 Level 6

## Customization

Easily add characters from your textbooks:
1. Click "Manage" in the header
2. Enter any Chinese character
3. The game automatically determines stats or uses defaults
4. New phrase combinations may unlock automatically

## Technical Details

- **Frontend**: Vanilla HTML/CSS/JavaScript (lightweight, no dependencies)
- **Character Writing**: hanzi-writer.js library for stroke order
- **Storage**: Browser localStorage + JSON export/import
- **Hosting**: GitHub Pages ready
- **Responsive**: Works on desktop, tablet, and mobile

## Getting Started

### Play Online
Visit [hanzi-game.pages.dev](https://hanzi-game.pages.dev) (or your GitHub Pages URL)

### Local Development
```bash
git clone https://github.com/richardwhlu/hanzi-game.git
cd hanzi-game
# Open index.html in your browser
```

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Educational Philosophy

This game balances fun with learning by:
- Making stroke order practice engaging through RPG mechanics
- Providing immediate feedback on writing accuracy
- Encouraging repeated practice through character progression
- Building towards practical phrase usage
- Adapting to individual learning pace and textbook content

## Development Roadmap

- [x] Core character practice system
- [x] XP and leveling mechanics  
- [x] Phrase evolution system
- [x] Save/load functionality
- [ ] Sound effects and music
- [ ] Achievement system
- [ ] Multiplayer progress sharing
- [ ] Advanced phrase practice mode
- [ ] Character stroke animation tutorials

## Contributing

This is an open-source educational project. Contributions welcome for:
- Additional character/phrase data
- UI/UX improvements
- Educational features
- Bug fixes and optimizations

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [hanzi-writer.js](https://github.com/chanind/hanzi-writer) for stroke order functionality
- Game Boy aesthetic inspiration from Nintendo
- Chinese language learning community for feedback and ideas

# AGENTS.md

## Development Guidelines

### Testing & Validation

After making significant changes, run the following commands to ensure code quality:

```bash
# Run linter
npm run lint

# Run type checker
npm run typecheck
```

**Always start dev server after making changes:**
```bash
npm run dev
```

### Code Style

- Keep responses concise (4 lines or less unless detail requested)
- Minimize explanatory text - just do the work
- No unnecessary comments in code
- Follow existing patterns in the codebase

### Project Structure

- `src/main.js` - Main application logic, simulation control
- `src/physics.js` - Physics world management (Cannon.js)
- `src/dice.js` - D20 dice implementation
- `src/galtonBoard.js` - Galton board setup (pegs, bins, walls)
- `src/scene.js` - Three.js rendering and camera
- `src/stats.js` - Statistics tracking
- `src/config.js` - Configuration constants
- `src/utils.js` - Utility functions

### Key Features

- **Physics scaling**: All time-based values should scale with `physicsTimeScale`
  - Spawn intervals: Divide by timeScale at high speeds
  - TTL values: Divide by timeScale
  - Max active dice: Scale up with timeScale
- **Dice removal**: Dice are removed by multiple conditions
  - Stuck in bin (Y < 2) for too long
  - Max lifetime exceeded (10s base)
  - After settled (800ms base)
- **TTL indicators**: Visual feedback with different colors
  - Orange: Stuck in bin
  - Red: Max lifetime exceeded
  - Green: Settled TTL

### Physics Speed Levels

Available speeds: 0.5x, 1x, 5x, 20x, 50x, 100x, 500x

### Common Tasks

- **Add new physics property**: Update `src/config.js`, implement in relevant class
- **Modify dice behavior**: Update `src/dice.js`
- **Change spawn logic**: Update `src/main.js`
- **Update physics parameters**: Update `src/physics.js` or `src/config.js`

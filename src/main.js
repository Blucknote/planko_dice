import { Scene } from './scene.js';
import { PhysicsWorld } from './physics.js';
import { D20Dice } from './dice.js';
import { GaltonBoard } from './galtonBoard.js';
import { Statistics } from './stats.js';

class GaltonBoardSimulator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.scene = new Scene(this.canvas);
        this.physics = new PhysicsWorld();
        this.statistics = new Statistics();

        // Create Galton board
        this.galtonBoard = new GaltonBoard(this.physics, this.scene);

        // Dice management
        this.activeDice = [];
        this.maxDice = 50; // Limit for performance

        // Setup controls
        this.setupControls();

        // Animation loop
        this.clock = performance.now();
        this.animate();
    }

    setupControls() {
        document.getElementById('addDice').addEventListener('click', () => {
            this.addDice(1);
        });

        document.getElementById('add10Dice').addEventListener('click', () => {
            this.addDice(10);
        });

        document.getElementById('reset').addEventListener('click', () => {
            this.statistics.reset();
        });

        document.getElementById('clearDice').addEventListener('click', () => {
            this.clearDice();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.addDice(1);
            } else if (e.code === 'KeyR') {
                this.statistics.reset();
            } else if (e.code === 'KeyC') {
                this.clearDice();
            }
        });
    }

    addDice(count) {
        for (let i = 0; i < count; i++) {
            // Remove oldest dice if we're at the limit
            if (this.activeDice.length >= this.maxDice) {
                const oldDice = this.activeDice.shift();
                oldDice.remove();
            }

            const dice = new D20Dice(this.physics, this.scene);
            const spawnPos = this.galtonBoard.getSpawnPosition();

            // Stagger spawning slightly if adding multiple
            setTimeout(() => {
                dice.spawn(spawnPos.x, spawnPos.y, spawnPos.z);
                this.activeDice.push(dice);
            }, i * 100);
        }
    }

    clearDice() {
        this.activeDice.forEach(dice => dice.remove());
        this.activeDice = [];
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.clock) / 1000;
        this.clock = currentTime;

        // Update physics
        this.physics.step(deltaTime);

        // Update all dice
        this.activeDice.forEach((dice, index) => {
            dice.update();

            // Check if dice has settled and record result
            if (dice.isSettled() && dice.getResult() !== null) {
                const result = dice.getResult();
                this.statistics.addRoll(result);

                // Remove dice after recording (optional - comment out to keep dice on board)
                // setTimeout(() => {
                //     dice.remove();
                //     this.activeDice.splice(index, 1);
                // }, 2000);
            }
        });

        // Render scene
        this.scene.render();
    }
}

// Start the simulator when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new GaltonBoardSimulator();
});

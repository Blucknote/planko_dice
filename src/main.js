import { Scene } from './scene.js';
import { PhysicsWorld } from './physics.js';
import { D20Dice } from './dice.js';
import { GaltonBoard } from './galtonBoard.js';
import { Statistics } from './stats.js';
import * as CANNON from 'cannon-es';

class GaltonBoardSimulator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.scene = new Scene(this.canvas);
        this.physics = new PhysicsWorld();
        this.statistics = new Statistics();

        // Create Galton board first (creates peg material)
        this.galtonBoard = new GaltonBoard(this.physics, this.scene);

        // Create a dummy dice to initialize dice material
        this.initializeMaterials();

        // Dice management
        this.activeDice = [];
        this.maxDice = 50; // Limit for performance

        // Setup controls
        this.setupControls();

        // Animation loop
        this.clock = performance.now();
        this.animate();
    }

    initializeMaterials() {
        // Create a temporary dice to initialize the shared dice material
        const tempDice = new D20Dice(this.physics, this.scene);
        tempDice.remove();
        this.activeDice = [];

        // Now create ContactMaterial between dice and pegs
        if (D20Dice.diceMaterial && GaltonBoard.pegMaterial) {
            const dicePegContact = new CANNON.ContactMaterial(
                D20Dice.diceMaterial,
                GaltonBoard.pegMaterial,
                {
                    friction: 0.3,
                    restitution: 0.7, // Good bounce off pegs
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3
                }
            );
            this.physics.world.addContactMaterial(dicePegContact);
            console.log('ContactMaterial created between dice and pegs');
        }
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

            // Check if dice has settled and record result (only once per dice)
            if (dice.isSettled() && dice.getResult() !== null && !dice.resultRecorded) {
                const result = dice.getResult();
                this.statistics.addRoll(result);
                dice.resultRecorded = true; // Mark as recorded to prevent duplicates

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

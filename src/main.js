import { Scene } from './scene.js';
import { PhysicsWorld } from './physics.js';
import { D20Dice } from './dice.js';
import { GaltonBoard } from './galtonBoard.js';
import { Statistics } from './stats.js';
import { CONFIG } from './config.js';
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
        this.maxDice = CONFIG.dice.maxDice;
        this.maxActiveDice = 5;

        // Simulation state
        this.remainingDiceToSpawn = 0;
        this.simulationInterval = null;
        this.physicsTimeScale = 1.0;

        // UI elements
        this.remainingValueElement = document.getElementById('remaining-value');
        this.physicsSliderElement = document.getElementById('physics-slider');
        this.physicsValueElement = document.getElementById('physics-value');

        this.physicsSpeedSteps = [0.5, 1, 5, 20, 50, 100, 500];
        this.currentSpeedIndex = 1;

        this.resultsElement = document.getElementById('results-textarea');
        this.copyResultsButton = document.getElementById('copy-results');
        this.allResults = [];

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

        // ContactMaterial between dice and pegs - bouncy!
        if (D20Dice.diceMaterial && GaltonBoard.pegMaterial) {
            const dicePegContact = new CANNON.ContactMaterial(
                D20Dice.diceMaterial,
                GaltonBoard.pegMaterial,
                {
                    friction: 0.1,
                    restitution: 0.98,
                    contactEquationStiffness: 1e9,
                    contactEquationRelaxation: 3
                }
            );
            this.physics.world.addContactMaterial(dicePegContact);
            console.log('ContactMaterial created between dice and pegs (bouncy)');
        }

        // ContactMaterial between dice and dice - dice influence each other
        if (D20Dice.diceMaterial) {
            const diceDiceContact = new CANNON.ContactMaterial(
                D20Dice.diceMaterial,
                D20Dice.diceMaterial,
                {
                    friction: 0.2,
                    restitution: 0.7,
                    contactEquationStiffness: 1e9,
                    contactEquationRelaxation: 3
                }
            );
            this.physics.world.addContactMaterial(diceDiceContact);
            console.log('ContactMaterial created between dice and dice');
        }

        // ContactMaterial for dice and bins/walls
        const wallMaterial = this.galtonBoard.createWallMaterial();
        if (D20Dice.diceMaterial && wallMaterial) {
            const diceWallContact = new CANNON.ContactMaterial(
                D20Dice.diceMaterial,
                wallMaterial,
                {
                    friction: 0.3,
                    restitution: 0.3,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3
                }
            );
            this.physics.world.addContactMaterial(diceWallContact);
            console.log('ContactMaterial created between dice and walls/bins');
        }

        // ContactMaterial for dice and floor
        if (D20Dice.diceMaterial && this.galtonBoard.floorMaterial) {
            const diceFloorContact = new CANNON.ContactMaterial(
                D20Dice.diceMaterial,
                this.galtonBoard.floorMaterial,
                {
                    friction: 0.8,
                    restitution: 0.1,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3
                }
            );
            this.physics.world.addContactMaterial(diceFloorContact);
            console.log('ContactMaterial created between dice and floor');
        }
    }

    setupControls() {
        document.getElementById('addDice').addEventListener('click', () => {
            this.addDice(1, true);
        });

        document.getElementById('simulate100').addEventListener('click', () => {
            this.simulate(100);
        });

        document.getElementById('simulate1000').addEventListener('click', () => {
            this.simulate(1000);
        });

        document.getElementById('toggleCamera').addEventListener('click', () => {
            this.scene.toggleCameraView();
        });

        document.getElementById('reset').addEventListener('click', () => {
            this.statistics.reset();
            this.remainingDiceToSpawn = 0;
            this.allResults = [];
            this.updateRemainingDisplay();
            this.updateResultsDisplay();
            if (this.simulationInterval) {
                clearTimeout(this.simulationInterval);
                this.simulationInterval = null;
            }
        });

        document.getElementById('clearDice').addEventListener('click', () => {
            this.clearDice();
        });

        this.physicsSliderElement.addEventListener('input', (e) => {
            const sliderValue = parseInt(e.target.value);
            this.currentSpeedIndex = sliderValue;
            const speed = this.physicsSpeedSteps[sliderValue];
            this.physicsTimeScale = speed;
            this.physicsValueElement.textContent = speed.toFixed(1) + 'x';
        });

        this.copyResultsButton.addEventListener('click', () => {
            const text = this.allResults.join(', ');
            navigator.clipboard.writeText(text).then(() => {
                const originalText = this.copyResultsButton.textContent;
                this.copyResultsButton.textContent = 'Copied!';
                setTimeout(() => {
                    this.copyResultsButton.textContent = originalText;
                }, 1000);
            });
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.addDice(1);
            } else if (e.code === 'KeyV') {
                this.scene.toggleCameraView();
            } else if (e.code === 'KeyR') {
                this.statistics.reset();
            } else if (e.code === 'KeyC') {
                this.clearDice();
            }
        });
    }

    getActiveDiceCount() {
        if (this.physicsTimeScale >= 20) {
            return this.activeDice.filter(dice => !dice.isSettled()).length;
        }

        return this.activeDice.filter(dice => {
            if (dice.isSettled()) return false;

            const diceY = dice.body.position.y;
            const velocity = dice.body.velocity.length();
            const pocketThreshold = 0.5;
            const velocityThreshold = 0.5;

            if (diceY < pocketThreshold && velocity < velocityThreshold) return false;

            return true;
        }).length;
    }

    addDice(count, bypassLimit = false) {
        for (let i = 0; i < count; i++) {
            // Remove oldest dice if we're at the limit
            if (this.activeDice.length >= this.maxDice) {
                const oldDice = this.activeDice.shift();
                oldDice.remove();
            }

            // Check if we should create this dice based on active limit
            if (!bypassLimit && this.getActiveDiceCount() >= this.maxActiveDice) {
                return false;
            }

            const dice = new D20Dice(this.physics, this.scene);
            const spawnPos = this.galtonBoard.getSpawnPosition();

            setTimeout(() => {
                dice.spawn(spawnPos.x, spawnPos.y, spawnPos.z);
                this.activeDice.push(dice);
            }, i * CONFIG.dice.spawnInterval);
        }
        return true;
    }

    simulate(count) {
        this.remainingDiceToSpawn += count;
        this.updateRemainingDisplay();

        if (this.simulationInterval) {
            return;
        }

        const spawnNext = () => {
            if (this.remainingDiceToSpawn <= 0) {
                this.simulationInterval = null;
                return;
            }

            const created = this.addDice(1);
            if (created) {
                this.remainingDiceToSpawn--;
                this.updateRemainingDisplay();
            }

            this.simulationInterval = setTimeout(spawnNext, CONFIG.dice.spawnInterval * 2);
        };

        spawnNext();
    }

    updateRemainingDisplay() {
        if (this.remainingValueElement) {
            this.remainingValueElement.textContent = this.remainingDiceToSpawn;
        }
    }

    updateResultsDisplay() {
        if (this.resultsElement) {
            this.resultsElement.value = this.allResults.join(', ');
            this.resultsElement.scrollTop = this.resultsElement.scrollHeight;
        }
    }

    setPhysicsSpeed(speed) {
        const index = this.physicsSpeedSteps.indexOf(speed);
        if (index !== -1) {
            this.currentSpeedIndex = index;
            this.physicsSliderElement.value = index;
        }
        this.physicsTimeScale = speed;
        this.physicsValueElement.textContent = speed.toFixed(1) + 'x';
    }

    clearDice() {
        this.activeDice.forEach(dice => dice.remove());
        this.activeDice = [];
        this.remainingDiceToSpawn = 0;
        this.allResults = [];
        this.updateRemainingDisplay();
        this.updateResultsDisplay();
        if (this.simulationInterval) {
            clearTimeout(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.clock) / 1000;
        this.clock = currentTime;

        this.physics.step(deltaTime, this.physicsTimeScale);

        this.activeDice.forEach(dice => {
            dice.update();

            if (dice.isSettled() && dice.getResult() !== null && !dice.resultRecorded) {
                const result = dice.getResult();
                this.statistics.addRoll(result);
                this.allResults.push(result);
                this.updateResultsDisplay();
                dice.resultRecorded = true;
            }

            if (dice.shouldRemove()) {
                dice.remove();
            }
        });

        this.activeDice = this.activeDice.filter(dice => !dice.shouldRemove());

        this.scene.render();
    }
}

// Start the simulator when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new GaltonBoardSimulator();
});

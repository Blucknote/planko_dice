import * as CANNON from 'cannon-es';
import { CONFIG } from './config.js';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, CONFIG.physics.gravity, 0)
        });

        // Improve physics accuracy
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.5;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
        this.world.defaultContactMaterial.contactEquationRelaxation = 3;

        // Use NaiveBroadphase for more reliable collision detection (slower but more accurate)
        this.world.broadphase = new CANNON.NaiveBroadphase(this.world);

        // Solver settings for better collision response
        this.world.solver.iterations = CONFIG.physics.iterations;
        this.world.solver.tolerance = CONFIG.physics.tolerance;
        this.world.allowSleep = true;

        this.bodies = [];
        this.materialCache = new Map();
        this.materialKeys = new Map();
    }

    registerMaterial(name, material) {
        this.materialKeys.set(material, name);
    }

    getMaterialName(material) {
        return this.materialKeys.get(material);
    }

    createMaterial(options = {}) {
        const key = `${options.friction || 0.3}-${options.restitution || 0.5}`;
        
        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }

        const material = new CANNON.Material({
            friction: options.friction || 0.3,
            restitution: options.restitution || 0.5
        });
        
        this.materialCache.set(key, material);
        return material;
    }

    createContactMaterial(material1, material2, options = {}) {
        const contactMaterial = new CANNON.ContactMaterial(material1, material2, {
            friction: options.friction || 0.3,
            restitution: options.restitution || 0.5,
            contactEquationStiffness: options.stiffness || 1e7,
            contactEquationRelaxation: options.relaxation || 3
        });
        this.world.addContactMaterial(contactMaterial);
        return contactMaterial;
    }

    addBody(body) {
        this.world.addBody(body);
        this.bodies.push(body);
    }

    removeBody(body) {
        this.world.removeBody(body);
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
    }

    step(deltaTime, timeScale = 1.0) {
        const scaledDeltaTime = deltaTime * timeScale;
        const scaledSubSteps = Math.min(Math.ceil(timeScale * CONFIG.physics.maxSubSteps), 50);
        this.world.step(CONFIG.physics.fixedTimeStep, scaledDeltaTime, scaledSubSteps);
    }
}

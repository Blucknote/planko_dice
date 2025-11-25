import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -25, 0) // Moderate gravity
        });

        // Improve physics accuracy
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.5;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
        this.world.defaultContactMaterial.contactEquationRelaxation = 3;

        // Broadphase for better performance - NaiveBroadphase is more reliable for small scenes
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.broadphase.useBoundingBoxes = true;

        // Solver settings for better collision response
        this.world.solver.iterations = 50; // High for accurate collision response
        this.world.solver.tolerance = 0.0001;
        this.world.allowSleep = true;

        this.bodies = [];
        this.materials = {};
    }

    // Store and retrieve materials by name for ContactMaterial creation
    registerMaterial(name, material) {
        this.materials[name] = material;
    }

    getMaterial(name) {
        return this.materials[name];
    }

    createMaterial(options = {}) {
        return new CANNON.Material({
            friction: options.friction || 0.3,
            restitution: options.restitution || 0.5
        });
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

    step(deltaTime) {
        // Fixed timestep with max substeps to prevent tunneling
        const fixedTimeStep = 1 / 120; // Smaller timestep for better accuracy
        const maxSubSteps = 10;
        this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
    }
}

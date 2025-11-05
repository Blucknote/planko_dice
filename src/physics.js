import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -30, 0) // Stronger gravity for faster simulation
        });

        // Improve physics accuracy
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.5;

        // Broadphase for better performance
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 30; // Increased for better accuracy
        this.world.solver.tolerance = 0.001;
        this.world.allowSleep = true;

        this.bodies = [];
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

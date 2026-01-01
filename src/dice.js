import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from './config.js';

export class D20Dice {
    // Shared material for all dice (for ContactMaterial)
    static diceMaterial = null;

    constructor(physicsWorld, scene) {
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.mesh = null;
        this.body = null;
        this.settled = false;
        this.result = null;
        this.resultRecorded = false; // Prevent duplicate recordings

        // Create shared dice material if not exists
        if (!D20Dice.diceMaterial) {
            D20Dice.diceMaterial = physicsWorld.createMaterial({
                friction: 0.5,
                restitution: 0.5
            });
        }

        // D20 vertices (icosahedron)
        this.createDice();
    }

    createDice() {
        const geometry = new THREE.IcosahedronGeometry(CONFIG.dice.radius, 0);

        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.dice,
            metalness: 0.2,
            roughness: 0.4,
            flatShading: true
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.addNumbersToFaces();

        const shape = new CANNON.Sphere(CONFIG.dice.radius);

        this.body = new CANNON.Body({
            mass: CONFIG.dice.mass,
            shape: shape,
            linearDamping: CONFIG.dice.linearDamping,
            angularDamping: CONFIG.dice.angularDamping,
            material: D20Dice.diceMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1,
            allowSleep: true,
            sleepSpeedLimit: 0.05,
            sleepTimeLimit: 0.5
        });

        this.body.ccdSpeedThreshold = 5;
        this.body.ccdIterations = 5;

        this.bodyAdded = false;
    }

    addNumbersToFaces() {
        // Add text sprites for each face
        const positions = this.mesh.geometry.attributes.position;
        const faceNormals = [];

        // Calculate face centers and normals
        for (let i = 0; i < positions.count; i += 3) {
            const v1 = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );
            const v2 = new THREE.Vector3(
                positions.getX(i + 1),
                positions.getY(i + 1),
                positions.getZ(i + 1)
            );
            const v3 = new THREE.Vector3(
                positions.getX(i + 2),
                positions.getY(i + 2),
                positions.getZ(i + 2)
            );

            const center = new THREE.Vector3()
                .add(v1)
                .add(v2)
                .add(v3)
                .divideScalar(3);

            const normal = new THREE.Vector3();
            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            normal.crossVectors(edge1, edge2).normalize();

            faceNormals.push({ center, normal });
        }

        this.faceNormals = faceNormals;
        this.createNumberLabelsAsync();
    }

    async createNumberLabelsAsync() {
        this.numberSprites = [];

        const textures = [];
        for (let i = 0; i < 20; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, 128, 128);

            const num = (i + 1).toString();
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 6;
            ctx.strokeText(num, 64, 64);

            ctx.fillStyle = 'white';
            ctx.fillText(num, 64, 64);

            const dataURL = canvas.toDataURL('image/png');
            textures.push(dataURL);
        }

        for (let i = 0; i < 20; i++) {
            const texture = await new Promise((resolve) => {
                new THREE.TextureLoader().load(textures[i], resolve);
            });
            texture.colorSpace = THREE.SRGBColorSpace;

            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0,
                depthTest: true,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.35, 0.35, 1);

            if (this.faceNormals[i]) {
                const pos = this.faceNormals[i].center.clone().multiplyScalar(1.15);
                sprite.position.copy(pos);
            }

            this.mesh.add(sprite);
            this.numberSprites.push(sprite);
        }
    }

    spawn(x, y, z) {
        // Set position - Z is always 0 for 2D Planko behavior
        this.body.position.set(x, y, 0);

        // Initial velocity - only X and Y, no Z movement
        this.body.velocity.set(
            (Math.random() - 0.5) * 3, // Random X push for variety
            -3, // Initial downward velocity
            0   // No Z velocity - constrained to X-Y plane
        );

        // Angular velocity - only Z-axis rotation for 2D Planko feel
        // This makes the dice spin in the plane of the board
        this.body.angularVelocity.set(
            0,  // No X rotation (would cause Z movement)
            0,  // No Y rotation (would cause Z movement)
            (Math.random() - 0.5) * 10  // Only Z-axis rotation (spin in plane)
        );

        // Add body to physics world if not already added
        if (!this.bodyAdded) {
            this.physicsWorld.addBody(this.body);
            this.bodyAdded = true;
        }

        this.body.wakeUp();
        this.settled = false;
        this.result = null;
        this.resultRecorded = false;

        this.scene.add(this.mesh);
    }

    update() {
        this.constrainToXYPlane();

        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        if (!this.settled) {
            const velocity = this.body.velocity;
            const angVelocity = this.body.angularVelocity;
            const isSlowEnough = velocity.length() < 0.1 && angVelocity.length() < 0.1;
            const isSleeping = this.body.sleepState === CANNON.Body.SLEEPING;

            if (isSleeping || isSlowEnough) {
                this.settled = true;
                this.result = this.calculateResult();
            }
        }
    }

    constrainToXYPlane() {
        // Lock Z position to 0 - dice only moves in X and Y
        this.body.position.z = 0;

        // Kill any Z velocity - dice cannot move toward/away from camera
        this.body.velocity.z = 0;

        // Constrain angular velocity to Z-axis only
        // This prevents rotation that would cause the dice to "flip" in Z direction
        this.body.angularVelocity.x = 0;
        this.body.angularVelocity.y = 0;
        // Keep Z angular velocity for natural spinning in the board plane
    }

    calculateResult() {
        let maxY = -Infinity;
        let topFaceIndex = 0;

        for (let i = 0; i < this.faceNormals.length; i++) {
            const worldNormal = this.faceNormals[i].normal.clone();
            worldNormal.applyQuaternion(this.mesh.quaternion);

            if (worldNormal.y > maxY) {
                maxY = worldNormal.y;
                topFaceIndex = i;
            }
        }

        return topFaceIndex + 1;
    }

    remove() {
        this.scene.remove(this.mesh);
        if (this.bodyAdded) {
            this.physicsWorld.removeBody(this.body);
            this.bodyAdded = false;
        }
    }

    isSettled() {
        return this.settled;
    }

    getResult() {
        return this.result;
    }
}

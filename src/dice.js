import * as THREE from 'three';
import * as CANNON from 'cannon-es';

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
        // Create icosahedron geometry for d20
        const geometry = new THREE.IcosahedronGeometry(0.5, 0);

        // Improved material
        const material = new THREE.MeshStandardMaterial({
            color: 0x2255cc,
            metalness: 0.2,
            roughness: 0.4,
            flatShading: true
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add numbers as textures
        this.addNumbersToFaces();

        // Use Sphere shape with proper radius matching visual - simpler and more reliable
        const shape = new CANNON.Sphere(0.55); // Slightly larger than visual for better collision

        this.body = new CANNON.Body({
            mass: 1,
            shape: shape,
            linearDamping: 0.3,
            angularDamping: 0.3,
            material: D20Dice.diceMaterial, // Use shared material for ContactMaterial
            collisionFilterGroup: 1,
            collisionFilterMask: -1,
            allowSleep: true,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1
        });

        // Enable CCD to prevent tunneling
        this.body.ccdSpeedThreshold = 1;
        this.body.ccdIterations = 5;

        // Don't add body to world yet - wait for spawn()
        this.bodyAdded = false;
    }

    getColorForNumber(num) {
        // Color scheme: cool colors for low numbers, warm for high
        const hue = ((num - 1) / 19) * 300; // 0 to 300 degrees
        return new THREE.Color(`hsl(${hue}, 70%, 60%)`);
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

        // Create number labels
        this.faceNormals = faceNormals;
        this.createNumberLabels();
    }

    createNumberLabels() {
        this.numberSprites = [];

        // Pre-create all textures from data URLs to avoid canvas reference issues
        const textures = [];
        for (let i = 0; i < 20; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Clear with transparent background
            ctx.clearRect(0, 0, 128, 128);

            // Draw number with outline for visibility
            const num = (i + 1).toString();
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Black outline
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 6;
            ctx.strokeText(num, 64, 64);

            // White fill
            ctx.fillStyle = 'white';
            ctx.fillText(num, 64, 64);

            // Convert to data URL immediately to capture the pixel data
            const dataURL = canvas.toDataURL('image/png');
            textures.push(dataURL);
        }

        // Now create sprites from the captured data URLs
        for (let i = 0; i < 20; i++) {
            const texture = new THREE.TextureLoader().load(textures[i]);
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

            // Position sprite on face
            if (this.faceNormals[i]) {
                const pos = this.faceNormals[i].center.clone().multiplyScalar(1.15);
                sprite.position.copy(pos);
            }

            this.mesh.add(sprite);
            this.numberSprites.push(sprite);
        }
    }

    spawn(x, y, z) {
        // Set position first before adding to world
        this.body.position.set(x, y, z);
        this.body.velocity.set(
            (Math.random() - 0.5) * 2,
            -2, // Slight initial downward velocity
            (Math.random() - 0.5) * 1
        );
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
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
        // Sync mesh with physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Check if dice has settled (sleeping or very slow movement)
        if (!this.settled) {
            const velocity = this.body.velocity;
            const angVelocity = this.body.angularVelocity;
            const isSlowEnough = velocity.length() < 0.1 && angVelocity.length() < 0.1;
            const isSleeping = this.body.sleepState === CANNON.Body.SLEEPING;

            if (isSleeping || isSlowEnough) {
                this.settled = true;
                this.result = this.getTopFaceNumber();
            }
        }
    }

    getTopFaceNumber() {
        // Find which face is pointing up
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

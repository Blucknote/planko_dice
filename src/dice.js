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
        this.resultRecorded = false;
        this.settledTime = null;
        this.physicsTimeScale = 1.0;
        this.spawnTime = null;
        this.binEntryTime = null;
        this.baseStuckTTL = 5000;
        this.baseMaxLifetime = 20000;
        this.baseAboveBinActiveTTL = 8000;
        this.aboveBinActiveTime = null;
        this.sleepAboveBinTime = null;
        this.baseSleepAboveBinTTL = 5000;
        this.removed = false;

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

        const shape = this.createIcosahedronShape(CONFIG.dice.radius);

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
        this.ttlIndicator = null;
        this.ttlCanvas = null;
        this.ttlCtx = null;
        this.createTTLIndicator();
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

        const vertices = [];
        const faces = [];
        for (let i = 0; i < positions.count; i += 3) {
            vertices.push(new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            ));
        }
        this.vertices = vertices;
        this.faces = faces;
    }

    createIcosahedronShape(radius) {
        const t = (1 + Math.sqrt(5)) / 2; // phi

        // Same vertices as Three.js IcosahedronGeometry
        const rawVerts = [
            new CANNON.Vec3(-1, t, 0),
            new CANNON.Vec3(1, t, 0),
            new CANNON.Vec3(-1, -t, 0),
            new CANNON.Vec3(1, -t, 0),
            new CANNON.Vec3(0, -1, t),
            new CANNON.Vec3(0, 1, t),
            new CANNON.Vec3(0, -1, -t),
            new CANNON.Vec3(0, 1, -t),
            new CANNON.Vec3(t, 0, -1),
            new CANNON.Vec3(t, 0, 1),
            new CANNON.Vec3(-t, 0, -1),
            new CANNON.Vec3(-t, 0, 1)
        ];

        // Normalize to radius
        const verts = [];
        for (const v of rawVerts) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            const scale = radius / len;
            verts.push(new CANNON.Vec3(v.x * scale, v.y * scale, v.z * scale));
        }

        // Same faces as Three.js
        const faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        return new CANNON.ConvexPolyhedron({ vertices: verts, faces });
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

    spawn(x, y, z, timeScale = 1.0) {
        this.physicsTimeScale = timeScale;
        this.spawnTime = performance.now();
        this.binEntryTime = null;
        this.aboveBinActiveTime = null;
        this.sleepAboveBinTime = null;

        console.log(`[DICE] Spawned at ${new Date().toISOString()}, timeScale: ${timeScale}`);

        // Set position - Z is always 0 for 2D Planko behavior
        this.body.position.set(x, y, 0);

        // Set random initial orientation - different faces can end up on top
        const randomEuler = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        this.mesh.quaternion.setFromEuler(randomEuler);
        this.body.quaternion.copy(this.mesh.quaternion);

        // Initial velocity - only X and Y, no Z movement
        this.body.velocity.set(
            (Math.random() - 0.5) * 3,
            -3,
            0
        );

        // Angular velocity - random rotation on all axes for random results
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
        this.settledTime = null;

        this.scene.add(this.mesh);
    }

    update() {
        this.constrainToXYPlane();

        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        const currentTime = performance.now();

        // Track bin entry (stuck detection)
        const binZoneY = 2;
        const isInBin = this.body.position.y < binZoneY;

        // Dynamic damping - increase when in bin to stop faster
        if (isInBin) {
            this.body.linearDamping = 0.3;
            this.body.angularDamping = 0.5;
        } else {
            this.body.linearDamping = CONFIG.dice.linearDamping;
            this.body.angularDamping = CONFIG.dice.angularDamping;
        }
        const isAboveBin = !isInBin;
        const isSleeping = this.body.sleepState === CANNON.Body.SLEEPING;

        // Log dice lifetime every 5 seconds for debugging
        if (this.spawnTime) {
            const lifetime = currentTime - this.spawnTime;
            if (Math.floor(lifetime / 5000) > Math.floor((lifetime - 16) / 5000)) {
                const shouldRm = this.shouldRemove();
                console.log(`[DICE] Age: ${(lifetime/1000).toFixed(1)}s, Y: ${this.body.position.y.toFixed(2)}, sleeping: ${isSleeping}, settled: ${this.settled}, shouldRemove: ${shouldRm}`);
            }
        }

        // Track when dice is above bin and sleeping
        // Don't reset when not sleeping - dice may oscillate but should still timeout
        if (isAboveBin && isSleeping && !this.sleepAboveBinTime) {
            this.sleepAboveBinTime = currentTime;
        } else if (!isAboveBin) {
            // Only reset when entering bin zone, not when waking up
            this.sleepAboveBinTime = null;
        }

        // Track when dice is above bin (regardless of settled state)
        // This ensures dice stuck on pins will be removed
        if (isAboveBin && !this.aboveBinActiveTime) {
            this.aboveBinActiveTime = currentTime;
        } else if (!isAboveBin) {
            // Only reset when entering bin zone
            this.aboveBinActiveTime = null;
        }

        // Track bin entry with hysteresis to handle oscillations
        const binExitY = 2.5;  // Must go higher to "exit" bin
        if (isInBin && !this.binEntryTime) {
            this.binEntryTime = currentTime;
        } else if (this.body.position.y > binExitY && this.binEntryTime) {
            // Only reset if dice clearly exits bin zone (hysteresis)
            this.binEntryTime = null;
        }

        if (!this.settled) {
            const velocity = this.body.velocity;
            const angVelocity = this.body.angularVelocity;
            const isSlowEnough = velocity.length() < 0.1 && angVelocity.length() < 0.1;
            const isSleeping = this.body.sleepState === CANNON.Body.SLEEPING;

            if (isSleeping || isSlowEnough) {
                this.settled = true;
                this.result = this.calculateResult();
                this.settledTime = currentTime;
            }
        }

        this.updateTTLIndicator();
    }

    shouldRemove() {
        // Already removed - always return true for consistent filtering
        if (this.removed) return true;

        const currentTime = performance.now();
        const timeScale = Math.max(this.physicsTimeScale, 1);

        // Absolute max lifetime - 20 seconds regardless of physics speed
        if (this.spawnTime) {
            const lifetime = currentTime - this.spawnTime;
            if (lifetime >= this.baseMaxLifetime) {
                console.log(`[DICE] Removing by lifetime: ${lifetime.toFixed(0)}ms >= ${this.baseMaxLifetime}ms, position: ${this.body.position.y.toFixed(2)}, sleeping: ${this.body.sleepState === CANNON.Body.SLEEPING}`);
                return true;
            }
        }

        // Check if stuck in bin for too long (3 seconds base, scales with physics speed)
        if (this.binEntryTime) {
            const timeInBin = currentTime - this.binEntryTime;
            const dynamicStuckTTL = Math.max(this.baseStuckTTL / timeScale, 500);
            if (timeInBin >= dynamicStuckTTL) {
                return true;
            }
        }

        // Check if sleeping above bin for too long (5 seconds, scales with physics speed)
        if (this.sleepAboveBinTime) {
            const timeSleepingAboveBin = currentTime - this.sleepAboveBinTime;
            const dynamicSleepTTL = Math.max(this.baseSleepAboveBinTTL / timeScale, 1000);
            if (timeSleepingAboveBin >= dynamicSleepTTL) {
                return true;
            }
        }

        // Check if active above bin for too long (5 seconds base, scales with physics speed)
        if (this.aboveBinActiveTime) {
            const timeAboveBin = currentTime - this.aboveBinActiveTime;
            const dynamicAboveBinTTL = Math.max(this.baseAboveBinActiveTTL / timeScale, 1000);
            if (timeAboveBin >= dynamicAboveBinTTL) {
                return true;
            }
        }

        // Check settled TTL (800ms base, scales with physics speed)
        if (this.settled && this.settledTime) {
            const timeSinceSettled = currentTime - this.settledTime;
            const dynamicTTL = Math.max(CONFIG.dice.settledTTL / timeScale, 200);
            if (timeSinceSettled >= dynamicTTL) {
                return true;
            }
        }

        return false;
    }

    createTTLIndicator() {
        const size = 64;
        this.ttlCanvas = document.createElement('canvas');
        this.ttlCanvas.width = size;
        this.ttlCanvas.height = size;
        this.ttlCtx = this.ttlCanvas.getContext('2d');

        const texture = new THREE.CanvasTexture(this.ttlCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });

        this.ttlIndicator = new THREE.Sprite(material);
        this.ttlIndicator.scale.set(1.2, 1.2, 1);
        this.ttlIndicator.visible = false;
        this.mesh.add(this.ttlIndicator);
        this.ttlIndicator.position.set(0, 0, 0.8);
    }

    updateTTLIndicator() {
        const currentTime = performance.now();
        const timeScale = Math.max(this.physicsTimeScale, 1);
        let shouldShowIndicator = false;
        let remainingRatio = 1;
        let indicatorColor = '#ff4444';

        // Check max lifetime indicator (absolute from spawn)
        if (this.spawnTime) {
            const lifetime = currentTime - this.spawnTime;
            const maxLifetimeRatio = 1 - (lifetime / this.baseMaxLifetime);
            remainingRatio = Math.min(remainingRatio, maxLifetimeRatio);
            if (maxLifetimeRatio < 1) {
                shouldShowIndicator = true;
                indicatorColor = '#ff4444';
            }
        }

        // Check stuck in bin indicator
        if (this.binEntryTime) {
            const timeInBin = currentTime - this.binEntryTime;
            const dynamicStuckTTL = Math.max(this.baseStuckTTL / timeScale, 500);
            const binRatio = 1 - (timeInBin / dynamicStuckTTL);
            if (binRatio < remainingRatio) {
                remainingRatio = binRatio;
                indicatorColor = '#ffaa00';
            }
            if (binRatio < 1) {
                shouldShowIndicator = true;
            }
        }

        // Check sleeping above bin indicator
        if (this.sleepAboveBinTime) {
            const timeSleepingAboveBin = currentTime - this.sleepAboveBinTime;
            const dynamicSleepTTL = Math.max(this.baseSleepAboveBinTTL / timeScale, 1000);
            const sleepRatio = 1 - (timeSleepingAboveBin / dynamicSleepTTL);
            if (sleepRatio < remainingRatio) {
                remainingRatio = sleepRatio;
                indicatorColor = '#ff00ff';
            }
            if (sleepRatio < 1) {
                shouldShowIndicator = true;
            }
        }

        // Check active above bin indicator
        if (this.aboveBinActiveTime) {
            const timeAboveBin = currentTime - this.aboveBinActiveTime;
            const dynamicAboveBinTTL = Math.max(this.baseAboveBinActiveTTL / timeScale, 1000);
            const aboveBinRatio = 1 - (timeAboveBin / dynamicAboveBinTTL);
            if (aboveBinRatio < remainingRatio) {
                remainingRatio = aboveBinRatio;
                indicatorColor = '#aa44ff';
            }
            if (aboveBinRatio < 1) {
                shouldShowIndicator = true;
            }
        }

        // Check settled TTL indicator
        if (this.settled && this.settledTime) {
            const timeSinceSettled = currentTime - this.settledTime;
            const dynamicTTL = Math.max(CONFIG.dice.settledTTL / timeScale, 200);
            const settledRatio = 1 - (timeSinceSettled / dynamicTTL);
            if (settledRatio < remainingRatio) {
                remainingRatio = settledRatio;
                indicatorColor = '#44ff44';
            }
            if (settledRatio < 1) {
                shouldShowIndicator = true;
            }
        }

        if (!shouldShowIndicator || remainingRatio <= 0) {
            this.ttlIndicator.visible = false;
            return;
        }

        this.ttlIndicator.visible = true;
        const size = 64;
        const ctx = this.ttlCtx;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 2;

        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * remainingRatio));
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        this.ttlIndicator.material.map.needsUpdate = true;
    }

    constrainToXYPlane() {
        // Lock Z position to 0 - dice only moves in X and Y
        this.body.position.z = 0;

        // Kill any Z velocity - dice cannot move toward/away from camera
        this.body.velocity.z = 0;

        // Allow full rotation around all axes for random results
        // Z position is constrained but rotation is free
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
        this.removed = true;
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

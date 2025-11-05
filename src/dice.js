import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class D20Dice {
    constructor(physicsWorld, scene) {
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.mesh = null;
        this.body = null;
        this.settled = false;
        this.result = null;

        // D20 vertices (icosahedron)
        this.createDice();
    }

    createDice() {
        // Create icosahedron geometry for d20
        const geometry = new THREE.IcosahedronGeometry(0.5, 0);

        // Create materials with numbers
        const materials = [];
        for (let i = 0; i < 20; i++) {
            materials.push(new THREE.MeshStandardMaterial({
                color: this.getColorForNumber(i + 1),
                metalness: 0.3,
                roughness: 0.4,
                flatShading: true
            }));
        }

        // Create mesh with face materials
        this.mesh = new THREE.Mesh(geometry, materials);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add numbers as textures
        this.addNumbersToFaces();

        // Create physics body
        const shape = new CANNON.Sphere(0.5); // Approximate with sphere for better rolling
        this.body = new CANNON.Body({
            mass: 1,
            shape: shape,
            linearDamping: 0.3,
            angularDamping: 0.3,
            material: this.physicsWorld.createMaterial({
                friction: 0.5,
                restitution: 0.4
            })
        });

        this.physicsWorld.addBody(this.body);
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
        // Create canvas for each number
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        this.numberSprites = [];

        for (let i = 0; i < 20; i++) {
            // Clear canvas
            ctx.clearRect(0, 0, 128, 128);

            // Draw number
            ctx.fillStyle = 'white';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(), 64, 64);

            // Create texture
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.3, 0.3, 1);

            // Position sprite on face
            if (this.faceNormals[i]) {
                const pos = this.faceNormals[i].center.clone().multiplyScalar(1.1);
                sprite.position.copy(pos);
            }

            this.mesh.add(sprite);
            this.numberSprites.push(sprite);
        }
    }

    spawn(x, y, z) {
        this.body.position.set(x, y, z);
        this.body.velocity.set(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        );
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        this.body.wakeUp();
        this.settled = false;
        this.result = null;

        this.scene.add(this.mesh);
    }

    update() {
        // Sync mesh with physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Check if dice has settled
        if (!this.settled && this.body.sleepState === CANNON.Body.SLEEPING) {
            this.settled = true;
            this.result = this.getTopFaceNumber();
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
        this.physicsWorld.removeBody(this.body);
    }

    isSettled() {
        return this.settled;
    }

    getResult() {
        return this.result;
    }
}

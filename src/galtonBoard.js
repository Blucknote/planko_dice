import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class GaltonBoard {
    constructor(physicsWorld, scene) {
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.pegs = [];

        this.createBoard();
    }

    createBoard() {
        // Create the base/floor
        this.createFloor();

        // Create walls
        this.createWalls();

        // Create pegs in Galton board pattern
        this.createPegs();

        // Create collection bins at the bottom
        this.createBins();
    }

    createFloor() {
        const floorGeometry = new THREE.BoxGeometry(15, 0.5, 8);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(0, -0.25, 0);
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        const floorShape = new CANNON.Box(new CANNON.Vec3(7.5, 0.25, 4));
        const floorBody = new CANNON.Body({
            mass: 0,
            shape: floorShape,
            material: this.physicsWorld.createMaterial({
                friction: 0.4,
                restitution: 0.3
            })
        });
        floorBody.position.set(0, -0.25, 0);
        this.physicsWorld.addBody(floorBody);
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4e,
            roughness: 0.7,
            metalness: 0.3,
            transparent: true,
            opacity: 0.6
        });

        // Back wall
        const backWallGeometry = new THREE.BoxGeometry(15, 15, 0.5);
        const backWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWallMesh.position.set(0, 7.5, -4);
        backWallMesh.receiveShadow = true;
        this.scene.add(backWallMesh);

        const backWallShape = new CANNON.Box(new CANNON.Vec3(7.5, 7.5, 0.25));
        const backWallBody = new CANNON.Body({ mass: 0, shape: backWallShape });
        backWallBody.position.set(0, 7.5, -4);
        this.physicsWorld.addBody(backWallBody);

        // Left wall
        const sideWallGeometry = new THREE.BoxGeometry(0.5, 15, 8);
        const leftWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWallMesh.position.set(-7.5, 7.5, 0);
        leftWallMesh.receiveShadow = true;
        this.scene.add(leftWallMesh);

        const leftWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 7.5, 4));
        const leftWallBody = new CANNON.Body({ mass: 0, shape: leftWallShape });
        leftWallBody.position.set(-7.5, 7.5, 0);
        this.physicsWorld.addBody(leftWallBody);

        // Right wall
        const rightWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWallMesh.position.set(7.5, 7.5, 0);
        rightWallMesh.receiveShadow = true;
        this.scene.add(rightWallMesh);

        const rightWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 7.5, 4));
        const rightWallBody = new CANNON.Body({ mass: 0, shape: rightWallShape });
        rightWallBody.position.set(7.5, 7.5, 0);
        this.physicsWorld.addBody(rightWallBody);
    }

    createPegs() {
        const pegMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.4,
            metalness: 0.6
        });

        const rows = 10;
        const pegRadius = 0.15;
        const spacing = 1.2;
        const startY = 13;

        for (let row = 0; row < rows; row++) {
            const y = startY - row * spacing;
            const pegsInRow = row + 3; // Start with 3 pegs, increase each row
            const totalWidth = (pegsInRow - 1) * spacing;
            const startX = -totalWidth / 2;

            for (let col = 0; col < pegsInRow; col++) {
                const x = startX + col * spacing;
                const z = (Math.random() - 0.5) * 0.3; // Slight random depth for 3D effect

                this.createPeg(x, y, z, pegRadius, pegMaterial);
            }
        }
    }

    createPeg(x, y, z, radius, material) {
        // Visual mesh
        const geometry = new THREE.CylinderGeometry(radius, radius, 1.5, 8);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Physics body
        const shape = new CANNON.Cylinder(radius, radius, 1.5, 8);
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: this.physicsWorld.createMaterial({
                friction: 0.1,
                restitution: 0.7
            })
        });
        body.position.set(x, y, z);
        this.physicsWorld.addBody(body);

        this.pegs.push({ mesh, body });
    }

    createBins() {
        const binMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a6e,
            roughness: 0.6,
            metalness: 0.4,
            transparent: true,
            opacity: 0.7
        });

        const numBins = 11;
        const binWidth = 1.0;
        const binHeight = 2;
        const binDepth = 3;
        const totalWidth = numBins * binWidth;
        const startX = -totalWidth / 2;

        for (let i = 0; i < numBins; i++) {
            const x = startX + i * binWidth + binWidth / 2;

            // Create bin divider
            if (i < numBins) {
                const dividerGeometry = new THREE.BoxGeometry(0.1, binHeight, binDepth);
                const dividerMesh = new THREE.Mesh(dividerGeometry, binMaterial);
                dividerMesh.position.set(x - binWidth / 2, binHeight / 2, 0);
                dividerMesh.receiveShadow = true;
                dividerMesh.castShadow = true;
                this.scene.add(dividerMesh);

                const dividerShape = new CANNON.Box(new CANNON.Vec3(0.05, binHeight / 2, binDepth / 2));
                const dividerBody = new CANNON.Body({ mass: 0, shape: dividerShape });
                dividerBody.position.set(x - binWidth / 2, binHeight / 2, 0);
                this.physicsWorld.addBody(dividerBody);
            }
        }

        // Right edge
        const dividerGeometry = new THREE.BoxGeometry(0.1, binHeight, binDepth);
        const dividerMesh = new THREE.Mesh(dividerGeometry, binMaterial);
        dividerMesh.position.set(startX + numBins * binWidth, binHeight / 2, 0);
        dividerMesh.receiveShadow = true;
        dividerMesh.castShadow = true;
        this.scene.add(dividerMesh);

        const dividerShape = new CANNON.Box(new CANNON.Vec3(0.05, binHeight / 2, binDepth / 2));
        const dividerBody = new CANNON.Body({ mass: 0, shape: dividerShape });
        dividerBody.position.set(startX + numBins * binWidth, binHeight / 2, 0);
        this.physicsWorld.addBody(dividerBody);
    }

    getSpawnPosition() {
        return {
            x: (Math.random() - 0.5) * 2, // Spawn in center area with slight variation
            y: 15,
            z: (Math.random() - 0.5) * 1
        };
    }
}

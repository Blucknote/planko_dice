import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from './config.js';

export class GaltonBoard {
    // Shared material for all pegs (for ContactMaterial)
    static pegMaterial = null;

    constructor(physicsWorld, scene) {
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.pegs = [];

        // Create shared peg material if not exists
        if (!GaltonBoard.pegMaterial) {
            GaltonBoard.pegMaterial = physicsWorld.createMaterial(CONFIG.galtonBoard.material);
        }

        this.createBoard();
    }

    createWallMaterial() {
        return this.physicsWorld.createMaterial({
            friction: 0.3,
            restitution: 0.5
        });
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
        const floorDepth = 3;
        const floorGeometry = new THREE.BoxGeometry(18, 0.5, floorDepth);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.floor,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(0, -0.25, 0);
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        const floorShape = new CANNON.Box(new CANNON.Vec3(9, 0.25, floorDepth / 2));
        this.floorMaterial = this.physicsWorld.createMaterial({
            friction: 0.8,
            restitution: 0.1
        });
        const floorBody = new CANNON.Body({
            mass: 0,
            shape: floorShape,
            material: this.floorMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });
        floorBody.position.set(0, -0.25, 0);
        this.physicsWorld.addBody(floorBody);
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.wall,
            roughness: 0.7,
            metalness: 0.3,
            transparent: true,
            opacity: 0.6
        });

        const wallZPosition = CONFIG.galtonBoard.wallZPosition;
        const wallPhysicsMaterial = this.createWallMaterial();

        const backWallGeometry = new THREE.BoxGeometry(18, 20, 0.5);
        const backWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWallMesh.position.set(0, 10, -wallZPosition);
        backWallMesh.receiveShadow = true;
        this.scene.add(backWallMesh);

        const backWallShape = new CANNON.Box(new CANNON.Vec3(9, 10, 0.25));
        const backWallBody = new CANNON.Body({
            mass: 0,
            shape: backWallShape,
            material: wallPhysicsMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });
        backWallBody.position.set(0, 10, -wallZPosition);
        this.physicsWorld.addBody(backWallBody);

        const frontWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        frontWallMesh.position.set(0, 10, wallZPosition);
        frontWallMesh.receiveShadow = true;
        this.scene.add(frontWallMesh);

        const frontWallShape = new CANNON.Box(new CANNON.Vec3(9, 10, 0.25));
        const frontWallBody = new CANNON.Body({
            mass: 0,
            shape: frontWallShape,
            material: wallPhysicsMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });
        frontWallBody.position.set(0, 10, wallZPosition);
        this.physicsWorld.addBody(frontWallBody);

        const sideWallDepth = wallZPosition * 2;

        const sideWallGeometry = new THREE.BoxGeometry(0.5, 20, sideWallDepth);
        const leftWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWallMesh.position.set(-9, 10, 0);
        leftWallMesh.receiveShadow = true;
        this.scene.add(leftWallMesh);

        const leftWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 10, sideWallDepth / 2));
        const leftWallBody = new CANNON.Body({
            mass: 0,
            shape: leftWallShape,
            material: wallPhysicsMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });
        leftWallBody.position.set(-9, 10, 0);
        this.physicsWorld.addBody(leftWallBody);

        const rightWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWallMesh.position.set(9, 10, 0);
        rightWallMesh.receiveShadow = true;
        this.scene.add(rightWallMesh);

        const rightWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 10, sideWallDepth / 2));
        const rightWallBody = new CANNON.Body({
            mass: 0,
            shape: rightWallShape,
            material: wallPhysicsMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1
        });
        rightWallBody.position.set(9, 10, 0);
        this.physicsWorld.addBody(rightWallBody);
    }

    createPegs() {
        const pegMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.peg,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x332200,
            emissiveIntensity: 0.1
        });

        const rows = CONFIG.galtonBoard.rows;
        const pegRadius = CONFIG.galtonBoard.pegRadius;
        const horizontalSpacing = CONFIG.galtonBoard.horizontalSpacing;
        const verticalSpacing = CONFIG.galtonBoard.verticalSpacing;
        const pegsInRow = CONFIG.galtonBoard.pegsInRow;
        const startY = CONFIG.galtonBoard.startY;

        // Calculate pocket (bin) area to avoid creating pegs there
        const binCount = CONFIG.galtonBoard.binCount;
        const binWidth = CONFIG.galtonBoard.binWidth;
        const totalBinWidth = binCount * binWidth;
        const pocketBottomY = -0.25;
        const pocketTopY = CONFIG.galtonBoard.binHeight - 0.25;

        // Wall boundaries - dice needs space to pass
        const wallPosition = 9;
        const diceRadius = CONFIG.dice.radius;
        const gapFromWalls = 0.8;
        const pegSafeZoneLeft = -wallPosition + diceRadius + gapFromWalls;
        const pegSafeZoneRight = wallPosition - diceRadius - gapFromWalls;

        let pegCount = 0;
        let skippedPegs = 0;

        for (let row = 0; row < rows; row++) {
            const y = startY - row * verticalSpacing;

            // Skip if peg would be in pocket area vertically
            if (y <= pocketTopY) {
                console.log(`Skipping row ${row} at y=${y.toFixed(1)} - would be in pocket area (pocket top: ${pocketTopY.toFixed(1)})`);
                continue;
            }

            const isOddRow = row % 2 === 1;
            const offset = isOddRow ? horizontalSpacing / 2 : 0;
            const totalWidth = (pegsInRow - 1) * horizontalSpacing;
            const startX = -totalWidth / 2 + offset;

            for (let col = 0; col < pegsInRow; col++) {
                const x = startX + col * horizontalSpacing;
                const z = 0;

                // Check if peg is too close to walls (dice needs space to pass)
                if (x < pegSafeZoneLeft || x > pegSafeZoneRight) {
                    skippedPegs++;
                    continue;
                }

                this.createPeg(x, y, z, pegRadius, pegMaterial);
                pegCount++;
            }
        }

        console.log(`Created ${pegCount} pegs total (skipped ${skippedPegs} pegs too close to walls)`);
        console.log(`Peg safe zone: x from ${pegSafeZoneLeft.toFixed(1)} to ${pegSafeZoneRight.toFixed(1)}, y from ${(startY - (rows - 1) * verticalSpacing).toFixed(1)} to ${startY}`);
        console.log(`Pocket area: y from ${pocketBottomY.toFixed(1)} to ${pocketTopY.toFixed(1)}`);
    }

    createPeg(x, y, z, radius, material) {
        // Visual mesh - simple sphere for clean Planko look
        // Using sphere for both visual and physics gives reliable collisions
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Physics body - SPHERE for reliable collision with sphere dice
        // Sphere-sphere collisions are the most reliable in physics engines
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: GaltonBoard.pegMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: -1,
            type: CANNON.Body.STATIC
        });
        body.position.set(x, y, z);
        this.physicsWorld.addBody(body);

        this.pegs.push({ mesh, body });
    }

    createBins() {
        const binMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.bin,
            roughness: 0.6,
            metalness: 0.4,
            transparent: true,
            opacity: 0.7
        });

        const numBins = CONFIG.galtonBoard.binCount;
        const binWidth = CONFIG.galtonBoard.binWidth;
        const binHeight = CONFIG.galtonBoard.binHeight;
        const binDepth = CONFIG.galtonBoard.binDepth;
        const totalWidth = numBins * binWidth;
        const startX = -totalWidth / 2;

        for (let i = 0; i < numBins; i++) {
            const x = startX + i * binWidth + binWidth / 2;

            // Create bin divider
            if (i < numBins) {
                const dividerGeometry = new THREE.BoxGeometry(0.1, binHeight, binDepth);
                const dividerMesh = new THREE.Mesh(dividerGeometry, binMaterial);
                dividerMesh.position.set(x - binWidth / 2, binHeight / 2 - 0.25, 0);
                dividerMesh.receiveShadow = true;
                dividerMesh.castShadow = true;
                this.scene.add(dividerMesh);

                const dividerShape = new CANNON.Box(new CANNON.Vec3(0.05, binHeight / 2, binDepth / 2));
                const dividerBody = new CANNON.Body({ mass: 0, shape: dividerShape, collisionFilterGroup: 1, collisionFilterMask: -1 });
                dividerBody.position.set(x - binWidth / 2, binHeight / 2 - 0.25, 0);
                this.physicsWorld.addBody(dividerBody);
            }
        }

        // Right edge
        const dividerGeometry = new THREE.BoxGeometry(0.1, binHeight, binDepth);
        const dividerMesh = new THREE.Mesh(dividerGeometry, binMaterial);
        dividerMesh.position.set(startX + numBins * binWidth, binHeight / 2 - 0.25, 0);
        dividerMesh.receiveShadow = true;
        dividerMesh.castShadow = true;
        this.scene.add(dividerMesh);

        const dividerShape = new CANNON.Box(new CANNON.Vec3(0.05, binHeight / 2, binDepth / 2));
        const dividerBody = new CANNON.Body({ mass: 0, shape: dividerShape, collisionFilterGroup: 1, collisionFilterMask: -1 });
        dividerBody.position.set(startX + numBins * binWidth, binHeight / 2 - 0.25, 0);
        this.physicsWorld.addBody(dividerBody);

        // Funnel walls removed - dice fall directly into bins
        // this.createFunnelWalls(binMaterial, binDepth);
    }

    createFunnelWalls(material, depth) {
        const numBins = CONFIG.galtonBoard.binCount;
        const binWidth = CONFIG.galtonBoard.binWidth;
        const totalBinWidth = numBins * binWidth;

        // Funnel walls guide dice from walls (at x=±9) into bins
        const wallEdge = 9;
        const binEdge = totalBinWidth / 2;
        const funnelTop = 2;
        const funnelBottom = 0;
        const funnelHeight = funnelTop - funnelBottom;
        const funnelWidth = wallEdge - binEdge;

        const diagonalLength = Math.sqrt(funnelHeight * funnelHeight + funnelWidth * funnelWidth);
        const angle = Math.atan2(funnelWidth, funnelHeight);

        // Left funnel wall
        const leftFunnelGeometry = new THREE.BoxGeometry(0.3, diagonalLength, depth);
        const leftFunnelMesh = new THREE.Mesh(leftFunnelGeometry, material);
        leftFunnelMesh.position.set(-(binEdge + funnelWidth / 2), funnelBottom + funnelHeight / 2, 0);
        leftFunnelMesh.rotation.z = -angle;
        leftFunnelMesh.receiveShadow = true;
        leftFunnelMesh.castShadow = true;
        this.scene.add(leftFunnelMesh);

        const leftFunnelShape = new CANNON.Box(new CANNON.Vec3(0.15, diagonalLength / 2, depth / 2));
        const leftFunnelBody = new CANNON.Body({ mass: 0, shape: leftFunnelShape });
        leftFunnelBody.position.set(-(binEdge + funnelWidth / 2), funnelBottom + funnelHeight / 2, 0);
        leftFunnelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -angle);
        this.physicsWorld.addBody(leftFunnelBody);

        // Right funnel wall
        const rightFunnelGeometry = new THREE.BoxGeometry(0.3, diagonalLength, depth);
        const rightFunnelMesh = new THREE.Mesh(rightFunnelGeometry, material);
        rightFunnelMesh.position.set(binEdge + funnelWidth / 2, funnelBottom + funnelHeight / 2, 0);
        rightFunnelMesh.rotation.z = angle;
        rightFunnelMesh.receiveShadow = true;
        rightFunnelMesh.castShadow = true;
        this.scene.add(rightFunnelMesh);

        const rightFunnelShape = new CANNON.Box(new CANNON.Vec3(0.15, diagonalLength / 2, depth / 2));
        const rightFunnelBody = new CANNON.Body({ mass: 0, shape: rightFunnelShape });
        rightFunnelBody.position.set(binEdge + funnelWidth / 2, funnelBottom + funnelHeight / 2, 0);
        rightFunnelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
        this.physicsWorld.addBody(rightFunnelBody);
    }

    getSpawnPosition() {
        const boardWidth = 16;
        return {
            x: (Math.random() - 0.5) * boardWidth,
            y: 22,
            z: 0
        };
    }
}

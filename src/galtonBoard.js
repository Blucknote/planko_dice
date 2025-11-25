import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class GaltonBoard {
    // Shared material for all pegs (for ContactMaterial)
    static pegMaterial = null;

    constructor(physicsWorld, scene) {
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.pegs = [];

        // Create shared peg material if not exists
        if (!GaltonBoard.pegMaterial) {
            GaltonBoard.pegMaterial = physicsWorld.createMaterial({
                friction: 0.1,
                restitution: 0.8
            });
        }

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
        // Floor depth matches containment (3 units total)
        const floorDepth = 3;
        const floorGeometry = new THREE.BoxGeometry(18, 0.5, floorDepth);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(0, -0.25, 0);
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        const floorShape = new CANNON.Box(new CANNON.Vec3(9, 0.25, floorDepth / 2));
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

        // Narrower depth to keep dice near pegs (dice radius ~0.55)
        const wallZPosition = 1.5; // Closer walls for better containment

        // Back wall
        const backWallGeometry = new THREE.BoxGeometry(18, 20, 0.5);
        const backWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWallMesh.position.set(0, 10, -wallZPosition);
        backWallMesh.receiveShadow = true;
        this.scene.add(backWallMesh);

        const backWallShape = new CANNON.Box(new CANNON.Vec3(9, 10, 0.25));
        const backWallBody = new CANNON.Body({
            mass: 0,
            shape: backWallShape,
            material: this.physicsWorld.createMaterial({
                friction: 0.3,
                restitution: 0.5
            })
        });
        backWallBody.position.set(0, 10, -wallZPosition);
        this.physicsWorld.addBody(backWallBody);

        // Front wall (transparent)
        const frontWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        frontWallMesh.position.set(0, 10, wallZPosition);
        frontWallMesh.receiveShadow = true;
        this.scene.add(frontWallMesh);

        const frontWallShape = new CANNON.Box(new CANNON.Vec3(9, 10, 0.25));
        const frontWallBody = new CANNON.Body({
            mass: 0,
            shape: frontWallShape,
            material: this.physicsWorld.createMaterial({
                friction: 0.3,
                restitution: 0.5
            })
        });
        frontWallBody.position.set(0, 10, wallZPosition);
        this.physicsWorld.addBody(frontWallBody);

        // Side wall depth matches new containment (wallZPosition * 2 + wall thickness)
        const sideWallDepth = wallZPosition * 2;

        // Left wall
        const sideWallGeometry = new THREE.BoxGeometry(0.5, 20, sideWallDepth);
        const leftWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWallMesh.position.set(-9, 10, 0);
        leftWallMesh.receiveShadow = true;
        this.scene.add(leftWallMesh);

        const leftWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 10, sideWallDepth / 2));
        const leftWallBody = new CANNON.Body({
            mass: 0,
            shape: leftWallShape,
            material: this.physicsWorld.createMaterial({
                friction: 0.3,
                restitution: 0.5
            })
        });
        leftWallBody.position.set(-9, 10, 0);
        this.physicsWorld.addBody(leftWallBody);

        // Right wall
        const rightWallMesh = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWallMesh.position.set(9, 10, 0);
        rightWallMesh.receiveShadow = true;
        this.scene.add(rightWallMesh);

        const rightWallShape = new CANNON.Box(new CANNON.Vec3(0.25, 10, sideWallDepth / 2));
        const rightWallBody = new CANNON.Body({
            mass: 0,
            shape: rightWallShape,
            material: this.physicsWorld.createMaterial({
                friction: 0.3,
                restitution: 0.5
            })
        });
        rightWallBody.position.set(9, 10, 0);
        this.physicsWorld.addBody(rightWallBody);
    }

    createPegs() {
        const pegMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x332200,
            emissiveIntensity: 0.1
        });

        const rows = 12; // More rows for better distribution
        const pegRadius = 0.3; // Larger pegs for reliable collision with dice (radius 0.55)
        const horizontalSpacing = 1.2; // Wider spacing - dice needs room to fall between pegs
        const verticalSpacing = 1.1; // Vertical spacing for natural bouncing
        const startY = 13;

        // Classic Galton board: staggered rows (Planko/Plinko pattern)
        for (let row = 0; row < rows; row++) {
            const y = startY - row * verticalSpacing;

            // Staggered pattern: odd rows are offset by half spacing
            // This creates the classic Planko left-right branching
            const isOddRow = row % 2 === 1;
            const pegsInRow = 8; // Fixed number of pegs per row
            const offset = isOddRow ? horizontalSpacing / 2 : 0;
            const totalWidth = (pegsInRow - 1) * horizontalSpacing;
            const startX = -totalWidth / 2 + offset;

            for (let col = 0; col < pegsInRow; col++) {
                const x = startX + col * horizontalSpacing;
                const z = 0; // All pegs at Z=0 for 2D Planko

                this.createPeg(x, y, z, pegRadius, pegMaterial);
            }
        }
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
            material: GaltonBoard.pegMaterial, // Use shared material for ContactMaterial
            collisionFilterGroup: 2, // Pegs are in group 2
            collisionFilterMask: -1, // Collide with everything
            type: CANNON.Body.STATIC
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

        // Add funnel walls to guide dice from outer walls into bin area
        this.createFunnelWalls(binMaterial, binDepth);
    }

    createFunnelWalls(material, depth) {
        // Funnel walls guide dice from walls (at x=±9) into bins (at x=±5.5)
        // Positioned below the pegs (which end around y=2) down to the bins
        const wallEdge = 9; // Wall position
        const binEdge = 5.5; // Bin edge position
        const funnelTop = 2; // Just below pegs (last row at y=2)
        const funnelBottom = 0; // Floor level
        const funnelHeight = funnelTop - funnelBottom;
        const funnelWidth = wallEdge - binEdge; // 3.5 units

        // Calculate diagonal length and angle
        const diagonalLength = Math.sqrt(funnelHeight * funnelHeight + funnelWidth * funnelWidth);
        const angle = Math.atan2(funnelWidth, funnelHeight); // Angle from vertical

        // Left funnel wall
        const leftFunnelGeometry = new THREE.BoxGeometry(0.3, diagonalLength, depth);
        const leftFunnelMesh = new THREE.Mesh(leftFunnelGeometry, material);
        leftFunnelMesh.position.set(-(binEdge + funnelWidth / 2), funnelBottom + funnelHeight / 2, 0);
        leftFunnelMesh.rotation.z = -angle; // Rotate to create slope
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
        rightFunnelMesh.rotation.z = angle; // Rotate opposite direction
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
        return {
            x: (Math.random() - 0.5) * 2, // Spawn in center area with slight variation
            y: 15,
            z: 0  // Always spawn at Z=0 for 2D Planko behavior
        };
    }
}

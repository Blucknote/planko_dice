export const CONFIG = {
    physics: {
        gravity: -20,
        fixedTimeStep: 1 / 120,
        maxSubSteps: 10,
        iterations: 20,
        tolerance: 0.001
    },

    dice: {
        maxDice: 50,
        radius: 0.5,
        mass: 1,
        linearDamping: 0.01,
        angularDamping: 0.01,
        spawnInterval: 300,
        settledTTL: 800,
        material: {
            friction: 0.1,
            restitution: 0.95
        }
    },

    galtonBoard: {
        rows: 10,
        pegRadius: 0.2,
        horizontalSpacing: 2.5,
        verticalSpacing: 1.6,
        pegsInRow: 7,
        startY: 18,
        wallZPosition: 1.5,
        binCount: 8,
        binWidth: 2.0,
        binHeight: 4,
        binDepth: 3,
        material: {
            friction: 0.1,
            restitution: 0.95
        }
    },

    colors: {
        background: 0x1a1a2e,
        ambientLight: 0xffffff,
        dice: 0x2255cc,
        peg: 0xffd700,
        wall: 0x3a3a4e,
        floor: 0x2a2a3e,
        bin: 0x4a4a6e,
        lowNumber: '#6366f1',
        midNumber: '#ffd700',
        highNumber: '#ef4444'
    },

    rendering: {
        antialias: true,
        shadowMapType: 'PCFSoftShadowMap',
        shadowMapSize: 2048,
        maxPixelRatio: 2
    },

    camera: {
        fov: 50,
        near: 0.1,
        far: 1000,
        position: { x: 2, y: 12, z: 35 },
        lookAt: { x: 2, y: 8, z: 0 },
        isometricPosition: { x: 32, y: 45, z: 40 }
    }
};

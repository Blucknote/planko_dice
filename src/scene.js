import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Scene {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.colors.background);

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
        this.isIsometric = false;
        this.setStandardView();
        this.cameraButton = document.getElementById('toggleCamera');
        this.updateCameraButtonText();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: CONFIG.rendering.antialias,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.rendering.maxPixelRatio));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.setupLights();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(CONFIG.colors.ambientLight, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -5;
        dirLight.shadow.mapSize.width = CONFIG.rendering.shadowMapSize;
        dirLight.shadow.mapSize.height = CONFIG.rendering.shadowMapSize;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3);
        fillLight.position.set(-5, 8, -5);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xff88cc, 0.2);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setStandardView() {
        this.camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
        this.camera.lookAt(CONFIG.camera.lookAt.x, CONFIG.camera.lookAt.y, CONFIG.camera.lookAt.z);
        this.isIsometric = false;
    }

    setIsometricView() {
        this.camera.position.set(CONFIG.camera.isometricPosition.x, CONFIG.camera.isometricPosition.y, CONFIG.camera.isometricPosition.z);
        this.camera.lookAt(CONFIG.camera.lookAt.x, CONFIG.camera.lookAt.y, CONFIG.camera.lookAt.z);
        this.isIsometric = true;
    }

    toggleCameraView() {
        if (this.isIsometric) {
            this.setStandardView();
        } else {
            this.setIsometricView();
        }
        this.updateCameraButtonText();
    }

    updateCameraButtonText() {
        if (this.cameraButton) {
            this.cameraButton.textContent = this.isIsometric ? 'Switch to Front View' : 'Switch to Isometric View';
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}

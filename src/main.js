import * as THREE from 'three';
import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';

let scene, camera, renderer, analyser, dataArray, bars, barBorders, uniforms;
let audioElement;
const bins = window.innerWidth > 600 ? 32 : 16;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 1000);
    camera.position.z = 5;
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: document.querySelector(".canvas"),
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Audio setup
    audioElement = new Audio('/audio/shiva.mp3');
    const context = new(window.AudioContext)();
    const source = context.createMediaElementSource(audioElement);
    analyser = context.createAnalyser();
    analyser.fftSize = bins * 2;
    source.connect(analyser);
    analyser.connect(context.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Shader uniforms
    uniforms = [];
    // const vertexShader = `
    //   varying vec2 vUv;
    //   uniform float uAmplitude;
    //   void main() {
    //     vUv = uv;
    //     vec3 newPosition = position;
    //     gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    //   }
    // `;

    // const fragmentShader = `
    //   varying vec2 vUv;
    //   uniform float uAmplitude;
    //   void main() {
    //     vec3 colorStart = vec3(0.0, 0.0, 0.0); // #FF7722 (normalized)
    //     vec3 colorEnd = vec3(1.0,1.0, 1.0);      // Bright red
    //     vec3 baseColor = mix(colorStart, colorEnd, uAmplitude);

    //     // RGB distortion based on amplitude
    //     float distortionAmount = uAmplitude * 0.02; // Adjust distortion intensity
    //     vec2 uvR = vUv + vec2(distortionAmount, 0.0);
    //     vec2 uvG = vUv;
    //     vec2 uvB = vUv - vec2(distortionAmount, 0.0);

    //     // Sample color for each channel with offset UVs
    //     float r = mix(colorStart.r, colorEnd.r, uAmplitude * uvR.y);
    //     float g = mix(colorStart.g, colorEnd.g, uAmplitude * uvG.y);
    //     float b = mix(colorStart.b, colorEnd.b, uAmplitude * uvB.y);

    //     gl_FragColor = vec4(r, g, b, 1.0);
    //   }
    // `;

    // Frequency bars at the bottom
    bars = [];
    barBorders = [];
    const barWidth = window.innerWidth / bins;
    const barMaxHeight = window.innerHeight * 0.7;
    for (let i = 0; i < bins; i++) {
        // Create bar with ShaderMaterial
        const geometry = new THREE.PlaneGeometry(barWidth, 1);
        const barUniforms = {
            uAmplitude: { value: 0.0 }
        };
        const material = new THREE.ShaderMaterial({
            uniforms: barUniforms,
            vertexShader: vertex,
            fragmentShader: fragment
        });
        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(i * barWidth - window.innerWidth / 2 + barWidth / 2, -window.innerHeight / 2 + 0.5, 0);
        scene.add(bar);
        bars.push(bar);
        uniforms.push(barUniforms);
        // Create border for the bar
        const borderGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(barWidth, 1));
        const borderMaterial = new THREE.LineBasicMaterial({ color: "rgb(75, 75, 75)" });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.set(i * barWidth - window.innerWidth / 2 + barWidth / 2, -window.innerHeight / 2 + 0.5, 1);
        scene.add(border);
        barBorders.push(border);
    }

    // Play/pause button and time display
    const playPauseButton = document.getElementById('play-pause');
    const timeDisplay = document.getElementById('time');

    playPauseButton.addEventListener('click', () => {
        if (context.state === 'suspended') context.resume();
        if (audioElement.paused) {
            audioElement.loop = true;
            audioElement.play();
        } else {
            audioElement.pause();
        }
    });

    audioElement.addEventListener('timeupdate', () => {
        const current = formatTime(audioElement.currentTime);
        const duration = formatTime(audioElement.duration || 0);
        timeDisplay.textContent = `${current} // ${duration}`;
    });

    // Apply mix-blend-mode to DOM elements
    playPauseButton.style.mixBlendMode = 'screen';
    timeDisplay.style.mixBlendMode = 'screen';

    window.addEventListener('resize', onWindowResize);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    analyser.getByteFrequencyData(dataArray);

    // Update bars
    const barMaxHeight = window.innerHeight * 0.7;
    bars.forEach((bar, i) => {
        const amplitude = dataArray[i] / 255;
        const height = amplitude * barMaxHeight;
        bar.scale.y = height;
        bar.position.y = -window.innerHeight / 2 + height / 2;

        // Update shader uniform for color and distortion
        uniforms[i].uAmplitude.value = amplitude;

        // Update border position and scale
        const border = barBorders[i];
        border.scale.y = height;
        border.position.y = -window.innerHeight / 2 + height / 2;
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = -window.innerHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Reposition bars
    const barWidth = window.innerWidth / bins;
    const barMaxHeight = window.innerHeight * 0.7;
    bars.forEach((bar, i) => {
        bar.position.x = i * barWidth - window.innerWidth / 2 + barWidth / 2;
        bar.position.y = -window.innerHeight / 2 + bar.scale.y / 2;
        bar.scale.x = barWidth;

        // Update border position and scale
        const border = barBorders[i];
        border.position.x = i * barWidth - window.innerWidth / 2 + barWidth / 2;
        border.position.y = -window.innerHeight / 2 + bar.scale.y / 2;
        border.scale.x = barWidth;
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

window.onload = init;
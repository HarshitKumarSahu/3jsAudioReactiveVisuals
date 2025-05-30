varying vec2 vUv;
    uniform float uAmplitude;
    void main() {
      vec3 colorStart = vec3(0.0, 0.0, 0.0); // #FF7722 (normalized)
      // vec3 colorEnd = vec3(1.0,1.0, 1.0);  
      vec3 colorEnd = vec3(0.6);
      vec3 baseColor = mix(colorStart, colorEnd, uAmplitude);

      // RGB distortion based on amplitude
      float distortionAmount = uAmplitude * 0.02; // Adjust distortion intensity
      vec2 uvR = vUv + vec2(distortionAmount, 0.0);
      vec2 uvG = vUv;
      vec2 uvB = vUv - vec2(distortionAmount, 0.0);

      // Sample color for each channel with offset UVs
      float r = mix(colorStart.r, colorEnd.r, uAmplitude * uvR.y);
      float g = mix(colorStart.g, colorEnd.g, uAmplitude * uvG.y);
      float b = mix(colorStart.b, colorEnd.b, uAmplitude * uvB.y);

      gl_FragColor = vec4(r, g, b, 1.0);
    }
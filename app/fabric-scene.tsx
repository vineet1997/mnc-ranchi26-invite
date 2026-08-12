"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ClothSimulation } from "./cloth-simulation";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uImageAspect;
  uniform float uViewportAspect;

  varying vec2 vUv;
  varying vec3 vNormal;

  vec2 coverUv(vec2 sourceUv) {
    vec2 mappedUv = sourceUv;
    if (uViewportAspect > uImageAspect) {
      float visibleHeight = uImageAspect / uViewportAspect;
      mappedUv.y = (mappedUv.y - 0.5) * visibleHeight + 0.5;
    } else {
      float visibleWidth = uViewportAspect / uImageAspect;
      mappedUv.x = (mappedUv.x - 0.5) * visibleWidth + 0.5;
    }
    return mappedUv;
  }

  void main() {
    vec3 source = texture2D(uTexture, coverUv(vUv)).rgb;
    source = pow(source, vec3(0.86));
    float sourceLuma = dot(source, vec3(0.2126, 0.7152, 0.0722));
    vec3 softened = mix(vec3(sourceLuma), source, 0.68);
    vec3 bone = vec3(0.945, 0.905, 0.835);
    vec3 cloth = mix(softened, bone, 0.41);

    vec3 normal = normalize(vNormal);
    if (normal.z < 0.0) normal *= -1.0;
    vec3 lightDirection = normalize(vec3(-0.54, 0.62, 0.96));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float grazing = pow(1.0 - max(normal.z, 0.0), 2.15);

    vec3 color = cloth * (0.87 + diffuse * 0.23);
    color += vec3(1.0, 0.875, 0.69) * grazing * 0.075;

    float readingLight = (1.0 - smoothstep(0.24, 0.94, vUv.x))
      * exp(-pow(vUv.y - 0.34, 2.0) * 7.5);
    color = mix(color, vec3(0.95, 0.91, 0.84), readingLight * 0.17);

    float lowerEdge = smoothstep(0.0, 0.016, vUv.y);
    gl_FragColor = vec4(color, lowerEdge);
  }
`;

const shadowFragmentShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    float lowerEdge = smoothstep(0.0, 0.035, vUv.y);
    float sideEdge = smoothstep(0.0, 0.02, vUv.x) * smoothstep(0.0, 0.02, 1.0 - vUv.x);
    gl_FragColor = vec4(0.13, 0.075, 0.045, 0.13 * lowerEdge * sideEdge);
  }
`;

type FabricSceneProps = {
  startAt: number | null;
  onReady: (usableForOpening: boolean) => void;
  onComplete: () => void;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const smoothstep = (from: number, to: number, value: number) => {
  const progress = clamp01((value - from) / (to - from));
  return progress * progress * (3 - 2 * progress);
};

export function FabricScene({ startAt, onReady, onComplete }: FabricSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startAtRef = useRef(startAt);
  const onReadyRef = useRef(onReady);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    startAtRef.current = startAt;
  }, [startAt]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onReadyRef.current(false);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      onReadyRef.current(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10);
    camera.position.z = 3;

    const uniforms = {
      uTexture: { value: null as THREE.Texture | null },
      uImageAspect: { value: 960 / 1280 },
      uViewportAspect: { value: 1 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const shadowMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: shadowFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    const shadowMesh = new THREE.Mesh(new THREE.BufferGeometry(), shadowMaterial);
    mesh.frustumCulled = false;
    shadowMesh.frustumCulled = false;
    shadowMesh.position.set(0, -0.045, -0.1);
    scene.add(shadowMesh, mesh);

    let simulation: ClothSimulation | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let positionAttribute: THREE.BufferAttribute | null = null;
    let renderPositions: Float32Array | null = null;
    let texture: THREE.Texture | null = null;
    let frame = 0;
    let disposed = false;
    let lastFrameTime: number | null = null;
    let contentStartedAt: number | null = null;
    let completeSent = false;
    let simulationAspect = 1;
    const sourceImage = new Image();
    sourceImage.decoding = "async";
    sourceImage.fetchPriority = "high";

    const setTimelineVariables = (simulationTime: number, contentProgress: number) => {
      const loaderRelease = smoothstep(0.06, 0.72, simulationTime);
      const brand = smoothstep(0.0, 0.27, contentProgress);
      const headline = smoothstep(0.14, 0.62, contentProgress);
      const details = smoothstep(0.52, 0.82, contentProgress);
      const actions = smoothstep(0.76, 1.0, contentProgress);

      host.style.setProperty("--loader-release", String(loaderRelease));
      host.style.setProperty("--brand-opacity", String(brand));
      host.style.setProperty("--headline-opacity", String(headline));
      host.style.setProperty("--headline-shift", String((1 - headline) * 0.55));
      host.style.setProperty("--details-opacity", String(details));
      host.style.setProperty("--actions-opacity", String(actions));
      host.style.setProperty("--actions-shift", String((1 - actions) * 0.4));
    };

    const resizeRenderer = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      const aspect = width / height;
      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      uniforms.uViewportAspect.value = aspect;

      if (simulation) {
        const scale = aspect / simulationAspect;
        mesh.scale.x = scale;
        shadowMesh.scale.x = scale;
      }
    };

    const createCloth = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      const aspect = width / height;
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const isCompact = width <= 620;

      simulationAspect = aspect;
      simulation = new ClothSimulation({
        columns: isCompact ? 18 : 28,
        rows: isCompact ? 28 : 24,
        width: visibleHeight * aspect * 1.28,
        height: visibleHeight * 1.2,
      });

      renderPositions = new Float32Array(simulation.positions);
      geometry?.dispose();
      geometry = new THREE.BufferGeometry();
      positionAttribute = new THREE.BufferAttribute(renderPositions, 3);
      positionAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("position", positionAttribute);
      geometry.setAttribute("uv", new THREE.BufferAttribute(simulation.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(simulation.indices, 1));
      geometry.computeVertexNormals();
      mesh.geometry = geometry;
      shadowMesh.geometry = geometry;
    };

    const render = (now: number) => {
      if (disposed || !simulation || !positionAttribute || !renderPositions) return;

      const openingStart = startAtRef.current;
      if (openingStart === null) {
        lastFrameTime = now;
        setTimelineVariables(0, 0);
      } else {
        const delta = lastFrameTime === null ? 0 : (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        const clothFrame = simulation.advance(delta);

        if (clothFrame.contentReady && contentStartedAt === null) {
          contentStartedAt = now;
        }

        const contentElapsed = contentStartedAt === null ? 0 : (now - contentStartedAt) / 1000;
        const contentProgress = clamp01(contentElapsed / 1.55);
        setTimelineVariables(clothFrame.time, contentProgress);

        simulation.writeInterpolatedPositions(renderPositions, clothFrame.alpha);
        positionAttribute.needsUpdate = true;
        geometry?.computeVertexNormals();

        if (clothFrame.settled && contentProgress >= 1 && !completeSent) {
          completeSent = true;
          onCompleteRef.current();
        }
      }

      renderer.render(scene, camera);
      if (!completeSent) frame = window.requestAnimationFrame(render);
    };

    const prepare = async () => {
      try {
        sourceImage.src = "/fabric-ivory-original.jpg";
        await Promise.all([sourceImage.decode(), document.fonts.ready]);
        if (disposed) return;

        texture = new THREE.Texture(sourceImage);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        texture.needsUpdate = true;
        uniforms.uTexture.value = texture;

        resizeRenderer();
        createCloth();
        renderer.initTexture(texture);
        await renderer.compileAsync(scene, camera);
        if (disposed) return;

        renderer.render(scene, camera);
        canvas.classList.add("is-prepared");
        onReadyRef.current(true);
        frame = window.requestAnimationFrame(render);
      } catch {
        if (!disposed) onReadyRef.current(false);
      }
    };

    void prepare();
    window.addEventListener("resize", resizeRenderer, { passive: true });

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resizeRenderer);
      sourceImage.src = "";
      texture?.dispose();
      geometry?.dispose();
      material.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="fabric-canvas" aria-hidden="true" />;
}

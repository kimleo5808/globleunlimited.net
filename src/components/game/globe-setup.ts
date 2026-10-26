// The 3D globe both globe games share: satellite texture, bright even
// lighting, idle auto-rotation and a square canvas that follows its mount.
// Each game adds its own layers (polygon colours, points, arcs) on top.
import Globe from 'globe.gl';
import type { GlobeInstance } from 'globe.gl';
import * as THREE from 'three';

export const GLOBE_TEXTURE = '/assets/textures/earth-day-4k.jpg'; // vivid daytime satellite map
export const WORLD_GEO_URL = '/assets/data/world.geo.json';
/** Camera altitude for the resting view; lower = globe fills more of the frame. */
export const HOME_ALTITUDE = 1.85;


export interface SharedGlobe {
  globe: GlobeInstance;
  controls: any;
  prefersReduced: boolean;
  /** Swing the camera to a point; instant when the visitor prefers less motion. */
  lookAt(lat: number, lng: number, altitude?: number): void;
  /** Back to the resting view, auto-rotation on. */
  home(): void;
}

export function createGlobe(mount: HTMLElement): SharedGlobe {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const globe = new Globe(mount)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#cfe6ff')
    .atmosphereAltitude(0.22)
    .globeImageUrl(GLOBE_TEXTURE)
    .polygonAltitude(0.008)
    .polygonSideColor(() => 'rgba(0,0,0,0.10)');

  // controls: auto-rotate when idle, zoom on
  const controls = globe.controls() as any;
  controls.enableZoom = true;
  controls.autoRotate = !prefersReduced;
  controls.autoRotateSpeed = 0.55;
  controls.minDistance = 180;
  controls.maxDistance = 520;
  controls.addEventListener('start', () => (controls.autoRotate = false));

  // Bright, even lighting so the whole globe stays vivid (no dark night side).
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(1, 0.6, 1);
  globe.lights([new THREE.AmbientLight(0xffffff, 2.7), keyLight]);

  // Slightly richer texture rendering.
  const mat = globe.globeMaterial() as THREE.MeshPhongMaterial;
  mat.shininess = 6;
  mat.specular = new THREE.Color(0x111418);

  function fitSize() {
    const w = mount.clientWidth;
    globe.width(w).height(w);
  }
  fitSize();
  new ResizeObserver(fitSize).observe(mount);
  globe.pointOfView({ lat: 20, lng: 0, altitude: HOME_ALTITUDE }, 0);

  return {
    globe,
    controls,
    prefersReduced,
    lookAt(lat, lng, altitude = 1.9) {
      globe.pointOfView({ lat, lng, altitude }, prefersReduced ? 0 : 700);
    },
    home() {
      globe.pointOfView({ lat: 20, lng: 0, altitude: HOME_ALTITUDE }, prefersReduced ? 0 : 700);
      if (!prefersReduced) controls.autoRotate = true;
    },
  };
}

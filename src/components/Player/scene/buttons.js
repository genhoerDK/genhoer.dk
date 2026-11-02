/**
 * Black rubber push buttons (modelled on the 1911 button used at the exhibition) for the 3D
 * players: a bezel with two ridges and a cap that sinks and lightens while held. A button can
 * carry a label printed on its cap: a number, or a play / pause symbol.
 */

import * as THREE from 'three';
import { colors } from '@/styles/colors';

export const BUTTON_SIZE = 0.05;          // bezel diameter (metres)
export const BUTTON_SPACING = 0.072;
const CAP_TRAVEL = 0.009;
const CAP_TOP = 0.0255;

/** Rubber bezel with two ridges */
function bezelGeometry() {
    const p = [
        [0.0175, 0], [0.025, 0], [0.025, 0.003], [0.0225, 0.004], [0.022, 0.006], [0.0235, 0.007],
        [0.0235, 0.0095], [0.0215, 0.0105], [0.021, 0.0125], [0.0222, 0.0135], [0.0222, 0.016],
        [0.0195, 0.017], [0.0175, 0.017],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(p, 48);
}

function capGeometry() {
    const p = [[0, 0.004], [0.017, 0.004], [0.017, 0.022], [0.0163, 0.0245], [0.0145, CAP_TOP], [0, CAP_TOP]]
        .map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(p, 48);
}

/** Soft round shadow under each button */
function shadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

/** What's printed on a cap: a number, 'play' or 'pause' */
function labelTexture(label) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.paper;
    if (label === 'play') {
        ctx.beginPath();
        ctx.moveTo(size * 0.4, size * 0.3);
        ctx.lineTo(size * 0.72, size * 0.5);
        ctx.lineTo(size * 0.4, size * 0.7);
        ctx.closePath();
        ctx.fill();
    } else if (label === 'pause') {
        ctx.fillRect(size * 0.36, size * 0.31, size * 0.1, size * 0.38);
        ctx.fillRect(size * 0.54, size * 0.31, size * 0.1, size * 0.38);
    } else {
        ctx.font = `300 ${size * 0.5}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), size / 2, size / 2 + size * 0.03);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

/**
 * A row of buttons, facing the viewer: x right, y towards the viewer (the buttons' axis),
 * z down the screen. Put it on a stage's panel.
 *
 * @param {number} count
 * @param {object} [options]
 * @param {(i) => (string|number|null)} [options.label]  What to print on button i's cap
 * @param {(i) => number} [options.x]  Where button i sits along the row
 */
export function createButtonRow(count, { label = () => null, x = (i) => (i - (count - 1) / 2) * BUTTON_SPACING } = {}) {
    const row = new THREE.Group();
    row.rotation.x = Math.PI / 2;

    const bezelGeo = bezelGeometry();
    const capGeo = capGeometry();
    const rubber = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.9 });
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false });
    const shadowGeo = new THREE.PlaneGeometry(BUTTON_SIZE * 1.5, BUTTON_SIZE * 1.5);
    const labelGeo = new THREE.CircleGeometry(0.0135, 32);
    const textures = new Map();
    const textureFor = (l) => {
        if (!textures.has(l)) textures.set(l, labelTexture(l));
        return textures.get(l);
    };
    const capUp = new THREE.Color(colors.ink);
    const capDown = new THREE.Color(colors.dim);

    const buttons = Array.from({ length: count }, (_, i) => {
        const group = new THREE.Group();
        group.position.x = x(i);

        const shadow = new THREE.Mesh(shadowGeo, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0.004, -0.002, 0.006);   // light from the top left

        const bezel = new THREE.Mesh(bezelGeo, rubber);
        const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.7 }));

        const labelMesh = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.y = CAP_TOP + 0.0002;
        labelMesh.visible = false;
        cap.add(labelMesh);

        group.add(shadow, bezel, cap);
        row.add(group);

        const button = {
            group, cap,
            setLabel(l) {
                if (l === button.label) return;
                button.label = l;
                labelMesh.visible = l != null;
                if (l != null) labelMesh.material.map = textureFor(l);
                labelMesh.material.needsUpdate = true;
            },
            /** Ease the cap towards down / up */
            update(dt, down) {
                const target = down ? -CAP_TRAVEL : 0;
                cap.position.y += (target - cap.position.y) * Math.min(1, dt * 40);
                cap.material.color.lerp(down ? capDown : capUp, Math.min(1, dt * 30));
            },
        };
        button.setLabel(label(i));
        return button;
    });

    return { row, buttons, dispose: () => textures.forEach((t) => t.dispose()) };
}

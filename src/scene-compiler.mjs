const COLORS = {
  red: [0.8, 0.03, 0.03, 1],
  blue: [0.03, 0.15, 0.8, 1],
  green: [0.03, 0.65, 0.12, 1],
  yellow: [0.9, 0.7, 0.03, 1],
  orange: [0.95, 0.28, 0.03, 1],
  purple: [0.4, 0.05, 0.65, 1],
  pink: [0.95, 0.2, 0.5, 1],
  white: [0.8, 0.8, 0.8, 1],
  black: [0.015, 0.015, 0.015, 1],
  gray: [0.25, 0.25, 0.25, 1],
  grey: [0.25, 0.25, 0.25, 1],
  gold: [0.83, 0.5, 0.08, 1],
  silver: [0.5, 0.55, 0.6, 1],
};

const TYPES = ['cube', 'sphere', 'cylinder', 'cone', 'plane'];

function sentenceBounds(text, index) {
  const start = Math.max(0, text.lastIndexOf('.', index) + 1);
  const next = text.indexOf('.', index);
  return { start, end: next === -1 ? text.length : next };
}

function colorNear(text, objectIndex) {
  const bounds = sentenceBounds(text, objectIndex);
  let nearest = null;
  for (const [name, rgba] of Object.entries(COLORS)) {
    const expression = new RegExp(`\\b${name}\\b`, 'gi');
    for (const match of text.slice(bounds.start, bounds.end).matchAll(expression)) {
      const colorIndex = bounds.start + match.index;
      const distance = Math.abs(colorIndex - objectIndex);
      if (!nearest || distance < nearest.distance) nearest = { name, rgba, distance };
    }
  }
  return nearest || { name: 'gray', rgba: COLORS.gray };
}

function locationFrom(text, ordinal) {
  const location = [0, 0, 1];
  if (/\bleft\b/i.test(text)) location[0] = -3;
  if (/\bright\b/i.test(text)) location[0] = 3;
  if (/\bfront\b/i.test(text)) location[1] = -2;
  if (/\bback|behind\b/i.test(text)) location[1] = 2;
  if (/\babove|high|top\b/i.test(text)) location[2] = 4;
  if (/\bground|floor|bottom\b/i.test(text)) location[2] = 0;
  if (location[0] === 0 && location[1] === 0 && ordinal > 0) {
    location[0] = (ordinal % 2 ? 1 : -1) * Math.ceil(ordinal / 2) * 2.5;
  }
  return location;
}

function scaleFrom(text, type) {
  if (type === 'plane') return [10, 10, 1];
  if (/\bhuge|giant\b/i.test(text)) return [3, 3, 3];
  if (/\blarge|big\b/i.test(text)) return [1.8, 1.8, 1.8];
  if (/\bsmall|tiny\b/i.test(text)) return [0.55, 0.55, 0.55];
  return [1, 1, 1];
}

function animationFrom(text, endFrame) {
  if (/\bbounce\b/i.test(text)) return { type: 'bounce', startFrame: 1, endFrame, amount: 3 };
  if (/\brise|move up|go up\b/i.test(text)) return { type: 'translate', axis: 'z', amount: 4, startFrame: 1, endFrame };
  if (/\bfall|move down|go down\b/i.test(text)) return { type: 'translate', axis: 'z', amount: -4, startFrame: 1, endFrame };
  if (/\bmove right|travel right\b/i.test(text)) return { type: 'translate', axis: 'x', amount: 6, startFrame: 1, endFrame };
  if (/\bmove left|travel left\b/i.test(text)) return { type: 'translate', axis: 'x', amount: -6, startFrame: 1, endFrame };
  if (/\bspin|rotate|turn\b/i.test(text)) return { type: 'rotate', axis: 'z', degrees: 360, startFrame: 1, endFrame };
  return null;
}

export function compileScene(prompt, requestedMode = 'animatic') {
  const normalized = prompt.trim();
  if (!normalized) throw new Error('Scene description cannot be empty.');

  const durationMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i);
  const fpsMatch = normalized.match(/(\d+)\s*fps\b/i);
  const durationSeconds = Math.min(120, Math.max(1, Number(durationMatch?.[1] ?? 6)));
  const fps = Math.min(60, Math.max(12, Number(fpsMatch?.[1] ?? 24)));
  const endFrame = Math.round(durationSeconds * fps);
  const objects = [];

  const matches = [];
  for (const type of TYPES) {
    const expression = new RegExp(`\\b${type}s?\\b`, 'gi');
    for (const match of normalized.matchAll(expression)) {
      matches.push({ type, index: match.index });
    }
  }
  matches.sort((left, right) => left.index - right.index);

  for (const match of matches) {
    const bounds = sentenceBounds(normalized, match.index);
    const context = normalized.slice(bounds.start, bounds.end).toLowerCase();
    const color = colorNear(normalized, match.index);
    const index = objects.length;
    objects.push({
      id: `${match.type}_${String(index + 1).padStart(2, '0')}`,
      type: match.type,
      location: locationFrom(context, index),
      rotationDegrees: [0, 0, 0],
      scale: scaleFrom(context, match.type),
      material: { name: `${color.name}_${match.type}`, baseColor: color.rgba, metallic: color.name === 'gold' || color.name === 'silver' ? 0.75 : 0, roughness: 0.42 },
      animation: animationFrom(context, endFrame),
    });
  }

  if (objects.length === 0) {
    objects.push({
      id: 'cube_01', type: 'cube', location: [0, 0, 1], rotationDegrees: [0, 0, 0], scale: [1, 1, 1],
      material: { name: 'gray_cube', baseColor: COLORS.gray, metallic: 0, roughness: 0.42 },
      animation: animationFrom(normalized, endFrame),
    });
  }

  const mode = requestedMode === 'final' ? 'final' : 'animatic';
  return {
    schemaVersion: '0.1.0',
    title: normalized.slice(0, 100),
    timeline: { fps, startFrame: 1, endFrame, durationSeconds },
    world: { backgroundColor: [0.025, 0.025, 0.035, 1], strength: 0.3 },
    camera: { location: [10, -14, 9], lensMm: 50, target: [0, 0, 1.5] },
    lights: [
      { id: 'key', type: 'AREA', location: [4, -4, 8], energy: 1200, size: 5 },
      { id: 'fill', type: 'AREA', location: [-5, -1, 4], energy: 650, size: 4 },
    ],
    objects,
    output: { mode, width: mode === 'final' ? 1920 : 1280, height: mode === 'final' ? 1080 : 720, format: 'mp4' },
  };
}

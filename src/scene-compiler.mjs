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
const QUANTITIES = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

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

function nearestWord(text, index, words, maxDistance = Infinity) {
  const bounds = sentenceBounds(text, index);
  let nearest = null;
  for (const word of words) {
    const expression = new RegExp(`\\b${word}\\b`, 'gi');
    for (const match of text.slice(bounds.start, bounds.end).matchAll(expression)) {
      const distance = Math.abs(bounds.start + match.index - index);
      if (!nearest || distance < nearest.distance) nearest = { word, distance };
    }
  }
  return nearest && nearest.distance <= maxDistance ? nearest.word : undefined;
}

function locationFrom(text, objectIndex, ordinal) {
  const location = [0, 0, 1];
  const horizontal = nearestWord(text, objectIndex, ['left', 'right', 'center', 'centered', 'middle']);
  const depth = nearestWord(text, objectIndex, ['front', 'back', 'behind']);
  const height = nearestWord(text, objectIndex, ['above', 'high', 'top', 'ground', 'floor', 'bottom']);
  if (horizontal === 'left') location[0] = -3;
  if (horizontal === 'right') location[0] = 3;
  if (depth === 'front') location[1] = -2;
  if (depth === 'back' || depth === 'behind') location[1] = 2;
  if (['above', 'high', 'top'].includes(height)) location[2] = 4;
  if (['ground', 'floor', 'bottom'].includes(height)) location[2] = 0;
  if (!horizontal && location[1] === 0 && ordinal > 0) {
    location[0] = (ordinal % 2 ? 1 : -1) * Math.ceil(ordinal / 2) * 2.5;
  }
  return location;
}

function scaleFrom(text, objectIndex, type) {
  if (type === 'plane') return [10, 10, 1];
  const size = nearestWord(text, objectIndex, ['huge', 'giant', 'large', 'big', 'small', 'tiny'], 32);
  if (size === 'huge' || size === 'giant') return [3, 3, 3];
  if (size === 'large' || size === 'big') return [1.8, 1.8, 1.8];
  if (size === 'small' || size === 'tiny') return [0.55, 0.55, 0.55];
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
    const prefix = normalized.slice(Math.max(bounds.start, match.index - 70), match.index).toLowerCase();
    if (/\bthe(?:\s+\w+){0,3}\s*$/.test(prefix)) continue;
    const color = colorNear(normalized, match.index);
    const quantityMatch = prefix.match(/\b(one|two|three|four|five|six|seven|eight|\d+)\b(?:\s+\w+){0,5}\s*$/);
    const quantity = Math.min(12, Number(quantityMatch?.[1]) || QUANTITIES[quantityMatch?.[1]] || 1);
    for (let occurrence = 0; occurrence < quantity; occurrence += 1) {
      const index = objects.length;
      const typeIndex = objects.filter((item) => item.type === match.type).length + 1;
      const location = locationFrom(normalized, match.index, index);
      if (quantity > 1 && /\btwo rows?\b/.test(context)) {
        location[0] = (occurrence % 3 - 1) * 3;
        location[1] = Math.floor(occurrence / 3) * 3 - 1.5;
      } else if (quantity > 1 && /\bleft\b/.test(context) && /\bright\b/.test(context)) {
        location[0] = occurrence % 2 === 0 ? -3 : 3;
      } else if (quantity > 1) {
        location[0] += (occurrence - (quantity - 1) / 2) * 2.5;
      }
      objects.push({
        id: `${match.type}_${String(typeIndex).padStart(2, '0')}`,
        type: match.type,
        location,
        rotationDegrees: [0, 0, 0],
        scale: scaleFrom(normalized, match.index, match.type),
        material: { name: `${color.name}_${match.type}`, baseColor: color.rgba, metallic: color.name === 'gold' || color.name === 'silver' ? 0.75 : 0, roughness: 0.42 },
        animation: animationFrom(context, endFrame),
      });
    }
  }

  for (const sentence of normalized.split('.')) {
    for (const type of TYPES) {
      if (!new RegExp(`\\bthe\\s+${type}\\b`, 'i').test(sentence)) continue;
      const animation = animationFrom(sentence, endFrame);
      if (animation) {
        const referenced = objects.find((item) => item.type === type);
        if (referenced) referenced.animation = animation;
      }
    }
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
    camera: { location: [10, -14, 9], lensMm: /\bwide\b/i.test(normalized) ? 35 : 50, target: [0, 0, 1.5] },
    lights: [
      { id: 'key', type: 'AREA', location: [4, -4, 8], energy: 1200, size: 5 },
      { id: 'fill', type: 'AREA', location: [-5, -1, 4], energy: 650, size: 4 },
    ],
    objects,
    output: { mode, width: mode === 'final' ? 1920 : 1280, height: mode === 'final' ? 1080 : 720, format: 'mp4' },
  };
}

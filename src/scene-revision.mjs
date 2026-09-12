export function compileDeterministicPatch(parent, request) {
  const changes = [];
  const lens = request.match(/(?:lens|camera)\D{0,20}(\d+)\s*mm/i);
  if (lens) changes.push({ section: 'camera', value: { lensMm: Number(lens[1]) } });
  const color = request.match(/\b(red|blue|green|yellow|orange|purple|pink|white|black|gray|grey|gold|silver)\b/i);
  const lowered = request.toLowerCase();
  const target = parent.objects.find((object) => lowered.includes(object.id.toLowerCase()))
    || parent.objects.find((object) => lowered.includes(object.type));
  const id = target?.id;
  const rgba = { red:[.8,.03,.03,1], blue:[.03,.15,.8,1], green:[.03,.65,.12,1], yellow:[.9,.7,.03,1], orange:[.95,.28,.03,1], purple:[.4,.05,.65,1], pink:[.95,.2,.5,1], white:[.8,.8,.8,1], black:[.015,.015,.015,1], gray:[.25,.25,.25,1], grey:[.25,.25,.25,1], gold:[.83,.5,.08,1], silver:[.5,.55,.6,1] };
  if (color && id) {
    const object = parent.objects.find((item) => item.id === id);
    changes.push({ section: 'object', id, value: { material: { ...object.material, baseColor: rgba[color[1].toLowerCase()] } } });
  }
  if (!changes.length) throw new Error('Deterministic revision parser could not safely isolate this change.');
  return { schemaVersion: '0.1.0-patch', changes };
}

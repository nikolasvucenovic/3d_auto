const system = `Return JSON only. Build a Blender scene plan using only cube,sphere,cylinder,cone,plane. Schema 0.1.0 keys: schemaVersion,title,timeline{fps,startFrame,endFrame,durationSeconds},world{backgroundColor[4],strength},camera{location[3],lensMm,target[3]},lights[{id,type:"AREA",location[3],energy,size}],objects[{id,type,location[3],rotationDegrees[3],scale[3],material{name,baseColor[4],metallic,roughness},animation:null|{type:"rotate"|"translate"|"bounce",axis?,degrees?,amount?,startFrame,endFrame}}],output{mode:"animatic",width,height,format:"mp4"}. IDs unique. Floor plane rotation is [0,0,0]. Keep multi-object cameras 10+ units from target with margins. "Rises" means translate +z, not bounce. Use numbers, no code.`;

function parseJson(content) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(trimmed);
}

function canonicalizePlan(value) {
  const plan = structuredClone(value); const normalizations = [];
  if (plan.timeline?.startFrame === 0) { plan.timeline.startFrame = 1; normalizations.push('timeline.startFrame: 0 -> 1'); }
  for (const object of plan.objects || []) {
    if (typeof object.type === 'string' && object.type !== object.type.toLowerCase()) { object.type = object.type.toLowerCase(); normalizations.push(`${object.id}.type -> lowercase`); }
    if (object.animation?.axis && object.animation.axis !== object.animation.axis.toLowerCase()) { object.animation.axis = object.animation.axis.toLowerCase(); normalizations.push(`${object.id}.animation.axis -> lowercase`); }
    if (object.animation?.type && object.animation.type !== object.animation.type.toLowerCase()) { object.animation.type = object.animation.type.toLowerCase(); normalizations.push(`${object.id}.animation.type -> lowercase`); }
  }
  for (const light of plan.lights || []) {
    if (typeof light.type === 'string' && light.type !== light.type.toUpperCase()) { light.type = light.type.toUpperCase(); normalizations.push(`${light.id}.type -> uppercase`); }
  }
  return { plan, normalizations };
}

async function completion(endpoint, messages, maxTokens) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local', temperature: 0, max_tokens: maxTokens, messages, response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error(`Local planner returned HTTP ${response.status}.`);
  const data = await response.json();
  const raw = data.choices[0].message.content;
  return { value: parseJson(raw), raw, usage: data.usage || {} };
}

export async function compileLocalScene(prompt, { endpoint = 'http://127.0.0.1:8080', maxTokens = 1400 } = {}) {
  const result = await completion(endpoint, [{ role: 'system', content: system }, { role: 'user', content: prompt }], maxTokens);
  const normalized = canonicalizePlan(result.value);
  return { ...result, value: normalized.plan, normalizations: normalized.normalizations };
}

export async function compileLocalPatch(parent, request, editable, { endpoint = 'http://127.0.0.1:8080', maxTokens = 500 } = {}) {
  const context = Object.fromEntries(editable.map((key) => [key, parent[key]]));
  const instruction = `Return {"schemaVersion":"0.1.0-patch","changes":[...]}. Each change is {"section":"camera|timeline|world|lights|output","value":{...}} or {"section":"object","id":"existing_id","value":{...}}. Only modify: ${editable.join(',')}. Current: ${JSON.stringify(context)} Request: ${request}`;
  return completion(endpoint, [{ role: 'system', content: 'Return one minimal JSON patch only. Preserve all unspecified values.' }, { role: 'user', content: instruction }], maxTokens);
}

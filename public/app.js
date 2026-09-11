const readiness = document.querySelector('#readiness');
const prompt = document.querySelector('#prompt');
const create = document.querySelector('#create');
const result = document.querySelector('#result');
const modeButtons = [...document.querySelectorAll('.mode-button')];
let outputMode = 'animatic';

modeButtons.forEach((button) => button.addEventListener('click', () => {
  outputMode = button.dataset.mode;
  modeButtons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
}));

fetch('/api/readiness')
  .then((response) => response.json())
  .then((data) => {
    readiness.textContent = data.blender.available ? '● Blender ready' : '○ Blender not configured';
    readiness.classList.toggle('ready', data.blender.available);
  })
  .catch(() => { readiness.textContent = 'Readiness unavailable'; });

create.addEventListener('click', async () => {
  if (!prompt.value.trim()) return;
  create.disabled = true;
  create.textContent = outputMode === 'animatic' ? 'Building animatic…' : 'Rendering…';
  result.classList.add('hidden');
  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value, outputMode }),
    });
    const data = await response.json();
    if (!response.ok && data.status !== 'failed') throw new Error(data.message || 'Job could not be created.');
    result.innerHTML = `
      <h2>${data.status === 'rendered' ? 'Render complete' : data.status === 'planned' ? 'Scene plan saved' : 'Render needs attention'}</h2>
      <p>Version <code>${escapeHtml(data.id)}</code></p>
      <p>${escapeHtml(data.message || `${data.plan.objects.length} objects · ${data.plan.timeline.durationSeconds}s · ${data.plan.timeline.fps} fps`)}</p>
    `;
    result.classList.remove('hidden');
  } catch (error) {
    result.innerHTML = `<h2>Could not create version</h2><p>${escapeHtml(error.message)}</p>`;
    result.classList.remove('hidden');
  } finally {
    create.disabled = false;
    create.textContent = 'Create version';
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}


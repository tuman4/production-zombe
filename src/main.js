const hero = document.querySelector('.hero');
const bg = document.querySelector('.hero-bg');
if (hero && bg) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    bg.style.transform = `translate(${x * -10}px, ${y * -7}px) scale(1.012)`;
  });
  hero.addEventListener('pointerleave', () => bg.style.transform = 'translate(0,0) scale(1)');
}

const box = document.querySelector('.lightbox');
const boxImg = box.querySelector('img');
const caption = box.querySelector('.lightbox-caption');
document.querySelectorAll('.work-card').forEach(card => {
  card.addEventListener('click', () => {
    const img = card.querySelector('img');
    const title = card.querySelector('figcaption span').textContent;
    boxImg.src = img.src;
    boxImg.alt = img.alt;
    caption.textContent = title;
    box.classList.add('open');
    box.setAttribute('aria-hidden','false');
  });
});
function closeBox(){box.classList.remove('open');box.setAttribute('aria-hidden','true')}
box.querySelector('.lightbox-close').addEventListener('click',closeBox);
box.addEventListener('click',e=>{if(e.target===box)closeBox()});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeBox()});

const obs = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) entry.target.animate([
    {opacity:0, transform:'translateY(28px)'},
    {opacity:1, transform:'translateY(0)'}
  ], {duration:650, easing:'cubic-bezier(.2,.8,.2,1)', fill:'both'});
}), {threshold:.12});
document.querySelectorAll('.work-card,.about-grid,.reel-frame,.contact-content').forEach(el=>obs.observe(el));

// Music player for the uploaded track. Playback starts only after a user gesture,
// which keeps the site compatible with browser autoplay policies.
const audioRig = document.querySelector('.audio-rig');
const soundButton = document.querySelector('.sound-toggle');
const soundState = document.querySelector('.sound-state');
const vizCanvas = document.querySelector('.audio-viz');
const vizCtx = vizCanvas?.getContext('2d');
const track = new Audio('rest-in-bass.mp3');
track.loop = true;
track.preload = 'metadata';
track.volume = 0.58;

let audioCtx, analyser, sourceNode;
let vizFrame = 0;

function initTrackGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = .86;
  sourceNode = audioCtx.createMediaElementSource(track);
  sourceNode.connect(analyser).connect(audioCtx.destination);
  drawViz();
}

async function setSound(on) {
  initTrackGraph();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (on) {
    try { await track.play(); } catch (e) { console.warn('Audio playback blocked:', e); return; }
  } else {
    track.pause();
  }
  audioRig.classList.toggle('sound-on', on);
  soundButton.setAttribute('aria-pressed', String(on));
  soundState.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  localStorage.setItem('zombe-sound', on ? 'on' : 'off');
}

soundButton?.addEventListener('click', () => {
  const on = soundButton.getAttribute('aria-pressed') !== 'true';
  setSound(on);
});

function drawViz() {
  if (!vizCtx || !analyser) return;
  cancelAnimationFrame(vizFrame);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = vizCanvas.getBoundingClientRect();
  vizCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  vizCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  vizCtx.setTransform(dpr,0,0,dpr,0,0);
  const w = rect.width, h = rect.height;
  const render = () => {
    analyser.getByteFrequencyData(data);
    vizCtx.clearRect(0,0,w,h);
    const grad = vizCtx.createLinearGradient(0,0,w,0);
    grad.addColorStop(0,'rgba(114,239,255,.25)');
    grad.addColorStop(.55,'rgba(255,255,255,.55)');
    grad.addColorStop(1,'rgba(167,139,250,.34)');
    vizCtx.strokeStyle = grad;
    vizCtx.lineWidth = 1;
    vizCtx.beginPath();
    const step = w / Math.max(1, data.length - 1);
    data.forEach((v,i)=>{
      const y = h - (v/255) * h * .9 - 1;
      if (i===0) vizCtx.moveTo(0,y); else vizCtx.lineTo(i*step,y);
    });
    vizCtx.stroke();
    vizFrame = requestAnimationFrame(render);
  };
  render();
}

// Sound remains off on page load; browsers require a click/tap before playback.

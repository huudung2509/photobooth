// ===== STATE MANAGEMENT =====
const state = {
  isInitialized: false,
  hands: [],
  frameActive: false,
  frameBox: null,
  shutterTriggered: false,
  photoCount: 0,
  photos: [],
  particles: [],
  lastPhotoTime: 0,
  hiFrames: 0,
  frameFrames: 0,
  countdownInterval: null,
  frameBoxes: [],
  maxPhotos: 4,
  currentCountdownIndex: 0,
  currentFilterIndex: 0,
  history: [],
  faces: [],
  currentARFilterIndex: 'none',
  retakeIndex: null,
  lastCaptureType: "full"
};

let mediaRecorder = null;
let recordedChunks = [];
let isRecordingVideo = false;

const COUNTDOWNS = [3, 5, 7, 10];

function toggleCountdown() {
  state.currentCountdownIndex = (state.currentCountdownIndex + 1) % COUNTDOWNS.length;
  const seconds = COUNTDOWNS[state.currentCountdownIndex];
  document.getElementById('countdownBtn').innerText = `⏱️ ${seconds}s`;
}

const FILTERS = [
  { name: 'Mặc định', css: 'none', ar: 'none' },
  { name: 'Kính Râm Đen', css: 'none', ar: 'sunglasses2' },
  { name: 'Hàn Quốc', css: 'sepia(10%) saturate(150%) hue-rotate(330deg)', ar: 'none' },
  { name: 'Mùa thu', css: 'sepia(40%) saturate(140%) hue-rotate(-10deg)', ar: 'none' },
  { name: 'Tươi tắn', css: 'saturate(200%) contrast(110%)', ar: 'none' },
  { name: 'Đen trắng', css: 'grayscale(100%)', ar: 'none' }
];

function toggleFilter() {
  state.currentFilterIndex = (state.currentFilterIndex + 1) % FILTERS.length;
  const filter = FILTERS[state.currentFilterIndex];
  state.currentARFilterIndex = filter.ar;
  
  const status = document.getElementById('statusText');
  if (status) {
    status.style.display = "block";
    status.innerText = `✨ Filter: ${filter.name}`;
    status.style.background = "rgba(255, 150, 50, 0.9)";
  }
  setTimeout(() => updateStatus(), 2000);
}

function setFilter(index) {
  state.currentFilterIndex = index;
  const filter = FILTERS[state.currentFilterIndex];
  state.currentARFilterIndex = filter.ar;
  
  const status = document.getElementById('statusText');
  if (status) {
    status.style.display = "block";
    status.innerText = `✨ Filter: ${filter.name}`;
    status.style.background = "rgba(255, 150, 50, 0.9)";
  }
  setTimeout(() => updateStatus(), 2000);
}

const config = {
  cuteEmojis: ["😊", "🥰", "✨", "🌟", "💖", "🎉", "🎈", "🌸", "🦋", "💕"],
  photoCaptureDelay: 500,
};

// Shutter sound setup using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playShutterSound() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// ===== CANVAS SETUP =====
const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");

function resizeCanvas() {
  if (video && video.videoWidth && video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
if (video) {
  video.addEventListener("loadedmetadata", resizeCanvas);
  video.addEventListener("playing", resizeCanvas);
}

// ===== MEDIAPIPE HANDS SETUP =====
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults(onHandsResults);

// ===== MEDIAPIPE FACEMESH SETUP =====
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 2,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults((results) => {
  state.faces = results.multiFaceLandmarks || [];
});

let camera;

// ===== HAND DETECTION CALLBACK =====
function onHandsResults(results) {
  state.hands = results.multiHandLandmarks || [];
  updateHandTracking();
}

// ===== PARTICLE SYSTEM =====
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10 - 2;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.01;
    this.size = Math.random() * 6 + 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.color = `hsl(${310 + Math.random() * 50}, 100%, 60%)`;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15;
    this.life -= this.decay;
    this.rotation += 0.2;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function createParticleExplosion(x, y, count = 40) {
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y));
  }
}

// Check gestures
function isIndexCurled(hand) {
  const indexTip = hand[8];
  const indexPIP = hand[6];
  return indexTip.y > indexPIP.y;
}

function getHandState(hand) {
  const tips = [4, 8, 12, 16, 20];
  const pips = [3, 6, 10, 14, 18];

  let extendedCount = 0;
  for (let i = 0; i < tips.length; i++) {
    if (hand[tips[i]].y < hand[pips[i]].y) {
      extendedCount++;
    }
  }

  if (extendedCount === 0) return "fist";
  if (extendedCount === 5) return "open";
  return "partial";
}

function updateHandTracking() {
  if (state.hands.length === 0) {
    state.frameActive = false;
    state.hiFrames = 0;
    state.frameFrames = 0;
    return;
  }

  const mirrorHand = (hand) =>
    hand.map((lm) => ({ x: 1 - lm.x, y: lm.y, z: lm.z }));

  const hand1M = mirrorHand(state.hands[0]);
  const hand2M = state.hands.length > 1 ? mirrorHand(state.hands[1]) : null;

  const handState1 = getHandState(hand1M);
  const handState2 = hand2M ? getHandState(hand2M) : "none";

  const isMobile = window.innerWidth <= 768;

  if (hand2M && !isMobile) {
    // Check for L-shape frame (thumbs and index fingers)
    const thumb1 = hand1M[4];
    const index1 = hand1M[8];
    const thumb2 = hand2M[4];
    const index2 = hand2M[8];

    const dist = Math.hypot(thumb1.x - thumb2.x, thumb1.y - thumb2.y);
    const minDist = 0.05;
    const maxDist = 0.4;

    state.frameActive = dist > minDist && dist < maxDist;

    if (state.frameActive) {
      state.frameBox = calculateFrameBoundingBox(thumb1, index1, thumb2, index2);

      // Check for shutter gesture (index finger curl)
      if (isIndexCurled(hand1M) || isIndexCurled(hand2M)) {
        if (!state.shutterTriggered && Date.now() - state.lastPhotoTime > config.photoCaptureDelay) {
          capturePhoto();
          state.shutterTriggered = true;
        }
      } else {
        state.shutterTriggered = false;
      }
    }
  } else {
    state.frameActive = false;
  }

  if (!state.frameActive) {
    state.frameFrames = 0;
      // Check for "Hi" gesture to capture full screen (1 or 2 hands)
    if (handState1 === "open" || handState2 === "open") {
      state.hiFrames++;
      if (state.hiFrames > 15 && !state.countdownInterval && (state.photoCount < state.maxPhotos || state.retakeIndex !== null)) {
        startCountdown("full");
        state.hiFrames = 0;
      }
    } else {
      state.hiFrames = 0;
    }
  } else {
    state.hiFrames = 0;
  }
}

function calculateFrameBoundingBox(thumb1, index1, thumb2, index2) {
  const minX = Math.min(thumb1.x, index1.x, thumb2.x, index2.x);
  const maxX = Math.max(thumb1.x, index1.x, thumb2.x, index2.x);
  const minY = Math.min(thumb1.y, index1.y, thumb2.y, index2.y);
  const maxY = Math.max(thumb1.y, index1.y, thumb2.y, index2.y);

  return {
    x: Math.max(0, minX - 0.05),
    y: Math.max(0, minY - 0.05),
    width: Math.min(1, maxX + 0.05) - Math.max(0, minX - 0.05),
    height: Math.min(1, maxY + 0.05) - Math.max(0, minY - 0.05),
  };
}

function startCountdown(captureType = "full") {
  if (state.countdownInterval) return;
  
  state.lastCaptureType = captureType;
  
  if (state.photoCount === 0 && state.retakeIndex === null) {
    // Bắt đầu quay video
    recordedChunks = [];
    const stream = canvas.captureStream(30); // 30 FPS
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.start();
    isRecordingVideo = true;
  }
  
  let count = COUNTDOWNS[state.currentCountdownIndex];
  const countdownEl = document.getElementById("countdownText");
  countdownEl.style.display = "block";
  countdownEl.textContent = count;
  
  countdownEl.style.animation = "none";
  void countdownEl.offsetWidth;
  countdownEl.style.animation = "zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";

  updateStatus();

  state.countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      countdownEl.style.animation = "none";
      void countdownEl.offsetWidth;
      countdownEl.style.animation = "zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
    } else {
      clearInterval(state.countdownInterval);
      state.countdownInterval = null;
      countdownEl.style.display = "none";
      if (captureType === "frame" && state.frameBox) {
        capturePhoto();
      } else {
        captureFullScreenPhoto();
      }
    }
  }, 1000);
}

function captureFullScreenPhoto() {
  if (state.retakeIndex === null && state.photoCount >= state.maxPhotos) return;

  const pixelWidth = video.videoWidth;
  const pixelHeight = video.videoHeight;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = pixelWidth;
  tempCanvas.height = pixelHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';

  tempCtx.save();
  tempCtx.translate(pixelWidth, 0);
  tempCtx.scale(-1, 1);
  
  if (FILTERS[state.currentFilterIndex].css !== 'none') {
    tempCtx.filter = FILTERS[state.currentFilterIndex].css;
  }
  
  tempCtx.drawImage(video, 0, 0, pixelWidth, pixelHeight);
  tempCtx.restore();

  drawARFilters(tempCtx, pixelWidth, pixelHeight);

  const photoData = tempCanvas.toDataURL("image/png");
  savePhoto(photoData);
}

function capturePhoto() {
  if ((state.retakeIndex === null && state.photoCount >= state.maxPhotos) || !state.frameBox) return;

  const frameBox = state.frameBox;
  const pixelWidth = frameBox.width * video.videoWidth;
  const pixelHeight = frameBox.height * video.videoHeight;

  // Draw full screen photo first
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = video.videoWidth;
  fullCanvas.height = video.videoHeight;
  const fullCtx = fullCanvas.getContext("2d");
  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';

  fullCtx.save();
  fullCtx.translate(video.videoWidth, 0);
  fullCtx.scale(-1, 1);
  if (FILTERS[state.currentFilterIndex].css !== 'none') {
    fullCtx.filter = FILTERS[state.currentFilterIndex].css;
  }
  fullCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  fullCtx.restore();

  drawARFilters(fullCtx, video.videoWidth, video.videoHeight);

  // Crop to tempCanvas
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = pixelWidth;
  tempCanvas.height = pixelHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';

  const screenX = frameBox.x * video.videoWidth;
  const screenY = frameBox.y * video.videoHeight;
  
  tempCtx.drawImage(fullCanvas, screenX, screenY, pixelWidth, pixelHeight, 0, 0, pixelWidth, pixelHeight);

  const photoData = tempCanvas.toDataURL("image/png");
  savePhoto(photoData);
}

function savePhoto(photoData) {
  if (state.retakeIndex !== null) {
    state.photos[state.retakeIndex] = photoData;
    
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.children[state.retakeIndex]) {
      sidebar.children[state.retakeIndex].src = photoData;
    }
    
    state.retakeIndex = null;
    state.lastPhotoTime = Date.now();
    playShutterSound();
    createPhotoTakenEffects();
    updateStatus();
    
    setTimeout(showPhotoStrip, 1000);
  } else {
    state.photos.push(photoData);
    state.photoCount++;
    state.lastPhotoTime = Date.now();
    
    playShutterSound();
    createPhotoTakenEffects();
    addThumbnail(photoData);
    updateStatus();
    
    if (state.photoCount >= state.maxPhotos) {
      if (isRecordingVideo && mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        isRecordingVideo = false;
      }
    }
    
    setTimeout(() => {
      if (state.photoCount === state.maxPhotos) {
        setTimeout(showPhotoStrip, 1000);
      } else {
        // Automatically start the next countdown
        startCountdown(state.lastCaptureType || "full");
      }
    }, 1500); // 1.5 seconds delay between photos
  }
}

function createPhotoTakenEffects() {
  const flash = document.createElement("div");
  flash.id = "flashOverlay";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);

  const emoji = config.cuteEmojis[Math.floor(Math.random() * config.cuteEmojis.length)];
  const emojiEl = document.createElement("div");
  emojiEl.className = "emoji-pop";
  emojiEl.textContent = emoji;
  emojiEl.style.left = canvas.width / 2 + "px";
  emojiEl.style.top = canvas.height / 2 + "px";
  document.body.appendChild(emojiEl);
  setTimeout(() => emojiEl.remove(), 1000);

  createParticleExplosion(canvas.width / 2, canvas.height / 2, 40);
}

function addThumbnail(photoData) {
  const sidebar = document.getElementById("sidebar");
  const thumb = document.createElement("img");
  thumb.src = photoData;
  thumb.className = "thumbnail";
  thumb.onclick = () => {
    const modal = document.getElementById("photoStripModal");
    if (modal.style.display === "flex") {
      modal.style.display = "none";
    }
  };
  sidebar.appendChild(thumb);
}

function updateStatus() {
  const statusEl = document.getElementById("statusText");
  const countEl = document.getElementById("photoCount");
  countEl.style.display = "block";
  countEl.textContent = `📸 ${state.photoCount}/${state.maxPhotos}`;
  statusEl.style.background = "rgba(255, 100, 200, 0.9)";

  if (state.retakeIndex === null && state.photoCount === state.maxPhotos) {
    statusEl.style.display = "block";
    statusEl.textContent = "✨ Đã hoàn thành!";
  } else if (state.countdownInterval) {
    statusEl.style.display = "block";
    statusEl.textContent = "📸 Chuẩn bị cười lên nào!";
  } else if (state.frameActive) {
    statusEl.style.display = "block";
    statusEl.textContent = "👆 Gập ngón trỏ để chụp khung";
  } else {
    if (window.innerWidth <= 768) {
      statusEl.style.display = "none";
    } else {
      statusEl.style.display = "block";
      statusEl.textContent = "🖐️ Giơ 'Hi' chụp full | 🔲 2 tay 'L' tạo khung";
    }
  }
}

// ===== PHOTO STRIP GENERATION =====
function showPhotoStrip() {
  const stripCanvas = document.getElementById("photoStripCanvas");
  const stripCtx = stripCanvas.getContext("2d");
  const customFrame = document.getElementById("customFrame");

  if (customFrame && customFrame.complete && customFrame.naturalWidth > 0) {
    const stripWidth = customFrame.naturalWidth;
    const stripHeight = customFrame.naturalHeight;
    stripCanvas.width = stripWidth;
    stripCanvas.height = stripHeight;
    stripCtx.imageSmoothingEnabled = true;
    stripCtx.imageSmoothingQuality = 'high';

    const src = customFrame.src || customFrame.getAttribute('src') || '';
    const isTransparentFrame = src.includes('frame4.png') || src.includes('frame5.png') || src.includes('frame6.png') || src.includes('frame7.png') || src.includes('frame8.png') || src.includes('frame9.png');

    // Draw the custom frame as background if not transparent
    if (!isTransparentFrame) {
      stripCtx.drawImage(customFrame, 0, 0);
    }

    let frameBoxes = state.frameBoxes;
    if (!frameBoxes || frameBoxes.length === 0) {
      if (src.includes('frame2.jpg')) {
        frameBoxes = [
          {x: 73, y: 98, w: 216, h: 155},
          {x: 72, y: 283, w: 217, h: 164},
          {x: 73, y: 475, w: 216, h: 171},
          {x: 71, y: 677, w: 218, h: 169},
          {x: 384, y: 226, w: 292, h: 426}
        ];
      } else if (src.includes('frame3.jpg')) {
        frameBoxes = [
          {x: 249, y: 147, w: 238, h: 154},
          {x: 249, y: 318, w: 238, h: 155},
          {x: 249, y: 490, w: 238, h: 155},
          {x: 249, y: 662, w: 238, h: 155}
        ];
      } else if (src.includes('frame4.png')) {
        frameBoxes = [
          {x: 160, y: 241, w: 256, h: 212},
          {x: 163, y: 461, w: 254, h: 212},
          {x: 164, y: 680, w: 255, h: 212}
        ];
      } else if (src.includes('frame5.png')) {
        frameBoxes = [
          [{x: 66, y: 49, w: 269, h: 185}, {x: 426, y: 49, w: 269, h: 185}],
          [{x: 66, y: 244, w: 269, h: 185}, {x: 426, y: 244, w: 269, h: 185}],
          [{x: 66, y: 440, w: 269, h: 196}, {x: 426, y: 440, w: 269, h: 196}],
          [{x: 66, y: 646, w: 269, h: 179}, {x: 426, y: 646, w: 269, h: 179}]
        ];
      } else if (src.includes('frame6.png')) {
        frameBoxes = [
          [{x: 94, y: 131, w: 235, h: 173}, {x: 405, y: 131, w: 234, h: 173}],
          [{x: 94, y: 322, w: 235, h: 173}, {x: 405, y: 323, w: 234, h: 172}],
          [{x: 94, y: 513, w: 235, h: 174}, {x: 405, y: 514, w: 234, h: 173}]
        ];
      } else {
        frameBoxes = [
          {x: 71, y: 120, w: 594, h: 311},
          {x: 86, y: 550, w: 582, h: 393},
          {x: 66, y: 1010, w: 600, h: 385},
          {x: 65, y: 1456, w: 602, h: 393}
        ];
      }
    }

    let loaded = 0;
    const target = Math.min(state.photos.length, frameBoxes.length);

    state.photos.forEach((photoData, index) => {
      const img = new Image();
      img.onload = () => {
        if (index < frameBoxes.length) {
          const boxOrBoxes = frameBoxes[index];
          const boxesToDraw = Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
          
          boxesToDraw.forEach(box => {
            // Crop image proportionally to avoid squishing
            const imgRatio = img.width / img.height;
            const boxRatio = box.w / box.h;
            let sWidth = img.width, sHeight = img.height, sx = 0, sy = 0;
            
            if (imgRatio > boxRatio) {
              sWidth = img.height * boxRatio;
              sx = (img.width - sWidth) / 2;
            } else {
              sHeight = img.width / boxRatio;
              sy = (img.height - sHeight) / 2;
            }
            
            if (!isTransparentFrame) {
              stripCtx.globalCompositeOperation = 'multiply';
            }
            stripCtx.drawImage(img, sx, sy, sWidth, sHeight, box.x, box.y, box.w, box.h);
            if (!isTransparentFrame) {
              stripCtx.globalCompositeOperation = 'source-over';
            }
          });
        }
        loaded++;
        if (loaded === target) {
          if (isTransparentFrame) {
            stripCtx.drawImage(customFrame, 0, 0);
          }
          state.history.push(stripCanvas.toDataURL("image/png"));
        }
      };
      img.src = photoData;
    });

    stripCanvas.style.cursor = "pointer";
    stripCanvas.title = "Bấm vào ảnh để chụp lại";
    stripCanvas.onclick = (e) => {
      const rect = stripCanvas.getBoundingClientRect();
      const scaleX = stripCanvas.width / rect.width;
      const scaleY = stripCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      for (let i = 0; i < frameBoxes.length; i++) {
        const boxOrBoxes = frameBoxes[i];
        const boxesToCheck = Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
        
        let clicked = false;
        for (const box of boxesToCheck) {
          if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
            clicked = true;
            break;
          }
        }
        
        if (clicked) {
          if (i < state.photos.length) {
            if (confirm(`Bạn có muốn chụp lại bức ảnh thứ ${i + 1} không?`)) {
              state.retakeIndex = i;
              document.getElementById("photoStripModal").style.display = "none";
              const statusEl = document.getElementById("statusText");
              statusEl.style.display = "block";
              statusEl.textContent = `📸 Đang chụp lại ảnh ${i + 1}... Giơ tay (L hoặc Hi) để chụp!`;
              statusEl.style.background = "rgba(255, 150, 50, 0.9)";
            }
          }
          break;
        }
      }
    };

    document.getElementById("photoStripModal").style.display = "flex";
    return;
  }

  // Fallback
  const stripWidth = 500;
  const photoHeight = 400;
  const padding = 40;
  const stripHeight = photoHeight * 3 + padding * 4 + 120;
  stripCanvas.width = stripWidth;
  stripCanvas.height = stripHeight;

  const gradient = stripCtx.createLinearGradient(0, 0, stripWidth, stripHeight);
  gradient.addColorStop(0, "#ffd4e5");
  gradient.addColorStop(0.5, "#e5d4ff");
  gradient.addColorStop(1, "#d4e5ff");
  stripCtx.fillStyle = gradient;
  stripCtx.fillRect(0, 0, stripWidth, stripHeight);

  stripCtx.fillStyle = "rgba(255, 100, 200, 0.15)";
  for (let i = 0; i < stripWidth; i += 40) {
    for (let j = 0; j < stripHeight; j += 40) {
      stripCtx.beginPath();
      stripCtx.arc(i + 20, j + 20, 8, 0, Math.PI * 2);
      stripCtx.fill();
    }
  }

  stripCtx.font = 'bold 48px "Pacifico", cursive';
  stripCtx.fillStyle = "#ff66cc";
  stripCtx.textAlign = "center";
  stripCtx.fillText("📸 Photobooth", stripWidth / 2, 40);

  const now = new Date();
  const timestamp = now.toLocaleString("vi-VN");
  stripCtx.font = '14px "Nunito", sans-serif';
  stripCtx.fillStyle = "#666";
  stripCtx.textAlign = "center";
  stripCtx.fillText(timestamp, stripWidth / 2, stripHeight - 30);
  stripCtx.fillText("Made with 💖 Cute AI Photobooth", stripWidth / 2, stripHeight - 10);

  let loaded = 0;
  const target = Math.min(state.photos.length, 3);

  state.photos.slice(0, 3).forEach((photoData, index) => {
    const yPos = padding + index * (photoHeight + padding);
    const img = new Image();
    img.onload = () => {
      stripCtx.fillStyle = "#ffffff";
      stripCtx.fillRect(padding / 2, yPos - 10, stripWidth - padding, photoHeight + 20);

      const shadowColors = ["rgba(255, 100, 200, 0.3)", "rgba(100, 200, 255, 0.3)", "rgba(100, 255, 200, 0.3)"];
      stripCtx.fillStyle = shadowColors[index];
      stripCtx.shadowColor = shadowColors[index];
      stripCtx.shadowBlur = 20;
      stripCtx.fillRect(padding, yPos, stripWidth - padding * 2, photoHeight);

      stripCtx.shadowColor = "transparent";
      
      const targetWidth = stripWidth - padding * 2;
      const targetHeight = photoHeight;
      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;

      let sWidth = img.width, sHeight = img.height, sx = 0, sy = 0;
      if (imgRatio > targetRatio) {
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        sHeight = img.width / targetRatio;
        sy = (img.height - sHeight) / 2;
      }
      stripCtx.drawImage(img, sx, sy, sWidth, sHeight, padding, yPos, targetWidth, targetHeight);
      
      const emoji = config.cuteEmojis[Math.floor(Math.random() * config.cuteEmojis.length)];
      stripCtx.font = "40px Arial";
      stripCtx.textAlign = "center";
      stripCtx.fillText(emoji, stripWidth / 2, yPos + photoHeight + 35);

      loaded++;
      if (loaded === target) {
        state.history.push(stripCanvas.toDataURL("image/png"));
      }
    };
    img.src = photoData;
  });

  document.getElementById("photoStripModal").style.display = "flex";
}

// --- Photo Strip Download ---
function downloadPhotoStrip() {
  const canvas = document.getElementById("photoStripCanvas");
  const link = document.createElement("a");
  link.download = `photobooth_${new Date().getTime()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function downloadVideo() {
  if (recordedChunks.length === 0) {
    alert("Không có dữ liệu video!");
    return;
  }
  
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `photobooth_video_${new Date().getTime()}.webm`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Photo Strip Print ---
function printPhotoStrip() {
  const canvas = document.getElementById("photoStripCanvas");
  const dataUrl = canvas.toDataURL("image/png");
  
  // Create an iframe to print from
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Print Photobooth</title>
        <style>
          @page { margin: 0; }
          body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); setTimeout(() => window.parent.document.body.removeChild(window.frameElement), 1000);" />
      </body>
    </html>
  `);
  doc.close();
}

function openGallery() {
  const container = document.getElementById('galleryContainer');
  container.innerHTML = '';
  
  if (state.history.length === 0) {
    container.innerHTML = '<p style="text-align:center; width:100%; color:#999; font-family:\'Nunito\', sans-serif;">Chưa có ảnh nào được chụp!</p>';
  } else {
    state.history.forEach((dataUrl, index) => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'center';
      item.style.gap = '10px';
      item.style.background = '#f9f9f9';
      item.style.padding = '10px';
      item.style.borderRadius = '15px';
      item.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
      
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = '100%';
      img.style.borderRadius = '10px';
      img.style.objectFit = 'contain';
      
      const dlBtn = document.createElement('button');
      dlBtn.innerText = '📥 Tải xuống';
      dlBtn.style.padding = '8px 15px';
      dlBtn.style.background = '#66ccff';
      dlBtn.style.color = 'white';
      dlBtn.style.border = 'none';
      dlBtn.style.borderRadius = '10px';
      dlBtn.style.cursor = 'pointer';
      dlBtn.style.fontWeight = 'bold';
      dlBtn.onclick = () => {
        const link = document.createElement("a");
        link.download = `photobooth_gallery_${index + 1}.png`;
        link.href = dataUrl;
        link.click();
      };
      
      item.appendChild(img);
      item.appendChild(dlBtn);
      container.appendChild(item);
    });
  }
  
  document.getElementById('galleryModal').style.display = 'flex';
}

function closeGallery() {
  document.getElementById('galleryModal').style.display = 'none';
}

function resetPhotobooth() {
  state.photoCount = 0;
  state.photos = [];
  state.hiFrames = 0;
  state.frameFrames = 0;
  if (state.countdownInterval) {
     clearInterval(state.countdownInterval);
     state.countdownInterval = null;
  }
  const countdownEl = document.getElementById("countdownText");
  if (countdownEl) countdownEl.style.display = "none";

  document.getElementById("photoStripModal").style.display = "none";
  document.getElementById("photoCount").style.display = "none";
  document.getElementById("sidebar").innerHTML = "";

  updateStatus();
}

// ===== DRAWING LOOP =====
function draw() {
  ctx.fillStyle = "#0a0015";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  
  if (FILTERS[state.currentFilterIndex].css !== 'none') {
    ctx.filter = FILTERS[state.currentFilterIndex].css;
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  ctx.filter = 'none';
  ctx.restore();

  drawARFilters(ctx, canvas.width, canvas.height);

  const vignetteGradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
  );
  vignetteGradient.addColorStop(0, "rgba(0,0,0,0)");
  vignetteGradient.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.frameActive && state.frameBox) {
    drawVirtualFrame();
  }

  state.particles = state.particles.filter((p) => p.life > 0);
  state.particles.forEach((p) => {
    p.update();
    p.draw(ctx);
  });

  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
  ];

  state.hands.forEach((hand) => {
    ctx.strokeStyle = "rgba(255, 100, 200, 0.5)";
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = hand[startIdx];
      const end = hand[endIdx];
      
      ctx.beginPath();
      ctx.moveTo((1 - start.x) * canvas.width, start.y * canvas.height);
      ctx.lineTo((1 - end.x) * canvas.width, end.y * canvas.height);
      ctx.stroke();
    });

    hand.forEach((landmark) => {
      ctx.fillStyle = "rgba(255, 200, 255, 0.9)";
      ctx.shadowColor = "rgba(255, 100, 200, 0.8)";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc((1 - landmark.x) * canvas.width, landmark.y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });
  });

  requestAnimationFrame(draw);
}

function drawVirtualFrame() {
  const box = state.frameBox;
  const x = box.x * canvas.width;
  const y = box.y * canvas.height;
  const w = box.width * canvas.width;
  const h = box.height * canvas.height;

  ctx.save();
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, "rgba(139, 50, 80, 0.15)");
  gradient.addColorStop(1, "rgba(80, 30, 100, 0.15)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  ctx.restore();

  ctx.shadowColor = "rgba(255, 100, 200, 0.5)";
  ctx.shadowBlur = 15;

  ctx.strokeStyle = "rgba(255, 100, 200, 0.6)";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x - 15, y - 15, w + 30, h + 30);

  ctx.strokeStyle = "rgba(255, 150, 220, 0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
  ctx.shadowColor = "transparent";

  // Corners
  function drawElem(x, y, type) {
    ctx.save();
    ctx.shadowColor = "rgba(255, 100, 200, 0.5)";
    ctx.shadowBlur = 10;
    if (type === "heart") {
      ctx.fillStyle = "#ff66cc";
      ctx.translate(x + 8, y + 8);
      ctx.scale(16/100, 16/100);
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.bezierCurveTo(-30, -60, -60, -30, -60, 0);
      ctx.bezierCurveTo(-60, 30, 0, 70, 0, 70);
      ctx.bezierCurveTo(0, 70, 60, 30, 60, 0);
      ctx.bezierCurveTo(60, -30, 30, -60, 0, -30);
      ctx.fill();
    }
    ctx.restore();
  }
  drawElem(x - 28, y - 28, "heart");
  drawElem(x + w + 12, y + h + 12, "heart");

  const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(255, 100, 200, ${pulse * 0.4})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(x - 25, y - 25, w + 50, h + 50);
  ctx.setLineDash([]);
}

// ===== INITIALIZATION =====
async function init() {
  try {
    if (!video || !canvas) throw new Error("Elements missing");

    camera = new Camera(video, {
      onFrame: async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          if (hands) await hands.send({ image: video });
          if (faceMesh) await faceMesh.send({ image: video });
        }
      },
      width: 1920,
      height: 1080,
    });

    await camera.start();

    state.isInitialized = true;
    updateStatus();
    draw();
  } catch (error) {
    console.error("Camera error:", error);
    const statusEl = document.getElementById("statusText");
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent = "❌ Lỗi camera: " + error.message;
    }
  }
}

window.addEventListener("load", () => {
  const dropdown = document.getElementById('filterDropdown');
  if (dropdown) {
    FILTERS.forEach((filter, index) => {
      const btn = document.createElement('button');
      btn.innerText = filter.name;
      btn.style.padding = '8px 15px';
      btn.style.border = 'none';
      btn.style.background = 'transparent';
      btn.style.cursor = 'pointer';
      btn.style.fontFamily = "'Nunito', sans-serif";
      btn.style.fontWeight = 'bold';
      btn.style.color = '#ff9933';
      btn.style.textAlign = 'left';
      btn.style.borderRadius = '10px';
      btn.onmouseover = () => btn.style.background = 'rgba(255, 153, 51, 0.1)';
      btn.onmouseout = () => btn.style.background = 'transparent';
      btn.onclick = () => {
        setFilter(index);
        dropdown.style.display = 'none';
        setTimeout(() => dropdown.style.display = '', 100);
      };
      dropdown.appendChild(btn);
    });
  }
  setTimeout(init, 500);
});

// --- Frame Analysis & Selection ---
function selectFrame(src, element) {
  document.querySelectorAll('.frame-thumb').forEach(el => el.classList.remove('selected'));
  if (element) element.classList.add('selected');
  const img = document.getElementById('customFrame');
  img.src = src;
}

function onFrameLoad() {
  const img = document.getElementById('customFrame');
  if (img.naturalWidth === 0) return;
  
  const src = img.src || img.getAttribute('src') || '';
  
  // Custom hardcoded boxes for the default frames
  if (src.includes('frame.jpg') && !src.includes('frame2.jpg')) {
    state.frameBoxes = [
      {x: 71, y: 120, w: 594, h: 311},
      {x: 86, y: 550, w: 582, h: 393},
      {x: 66, y: 1010, w: 600, h: 385},
      {x: 65, y: 1456, w: 602, h: 393}
    ];
    state.maxPhotos = 4;
  } else if (src.includes('frame2.jpg')) {
    state.frameBoxes = [
      {x: 73, y: 98, w: 216, h: 155},
      {x: 72, y: 283, w: 217, h: 164},
      {x: 73, y: 475, w: 216, h: 171},
      {x: 71, y: 677, w: 218, h: 169},
      {x: 384, y: 226, w: 292, h: 426}
    ];
    state.maxPhotos = 5;
  } else if (src.includes('frame3.jpg')) {
    state.frameBoxes = [
      {x: 249, y: 147, w: 238, h: 154},
      {x: 249, y: 318, w: 238, h: 155},
      {x: 249, y: 490, w: 238, h: 155},
      {x: 249, y: 662, w: 238, h: 155}
    ];
    state.maxPhotos = 4;
  } else if (src.includes('frame4.png')) {
    state.frameBoxes = [
      {x: 160, y: 241, w: 256, h: 212},
      {x: 163, y: 461, w: 254, h: 212},
      {x: 164, y: 680, w: 255, h: 212}
    ];
    state.maxPhotos = 3;
  } else if (src.includes('frame5.png')) {
    state.frameBoxes = [
      [{x: 66, y: 49, w: 269, h: 185}, {x: 426, y: 49, w: 269, h: 185}],
      [{x: 66, y: 244, w: 269, h: 185}, {x: 426, y: 244, w: 269, h: 185}],
      [{x: 66, y: 440, w: 269, h: 196}, {x: 426, y: 440, w: 269, h: 196}],
      [{x: 66, y: 646, w: 269, h: 179}, {x: 426, y: 646, w: 269, h: 179}]
    ];
    state.maxPhotos = 4;
  } else if (src.includes('frame6.png')) {
    state.frameBoxes = [
      [{x: 94, y: 131, w: 235, h: 173}, {x: 405, y: 131, w: 234, h: 173}],
      [{x: 94, y: 322, w: 235, h: 173}, {x: 405, y: 323, w: 234, h: 172}],
      [{x: 94, y: 513, w: 235, h: 174}, {x: 405, y: 514, w: 234, h: 173}]
    ];
    state.maxPhotos = 3;
  } else if (src.includes('frame7.png')) {
    state.frameBoxes = [
      [{x: 27, y: 32, w: 286, h: 213}, {x: 337, y: 32, w: 286, h: 213}],
      [{x: 27, y: 259, w: 286, h: 214}, {x: 337, y: 259, w: 286, h: 214}],
      [{x: 27, y: 486, w: 286, h: 215}, {x: 337, y: 486, w: 286, h: 215}]
    ];
    state.maxPhotos = 3;
  } else if (src.includes('frame8.png')) {
    state.frameBoxes = [
      {x: 160, y: 241, w: 259, h: 212},
      {x: 162, y: 461, w: 258, h: 212},
      {x: 163, y: 679, w: 258, h: 213}
    ];
    state.maxPhotos = 3;
  } else if (src.includes('frame9.png')) {
    state.frameBoxes = [
      {x: 148, y: 56, w: 281, h: 214},
      {x: 151, y: 289, w: 279, h: 215},
      {x: 153, y: 523, w: 280, h: 215}
    ];
    state.maxPhotos = 3;
  } else {
    state.frameBoxes = analyzeFrame(img);
    if (state.frameBoxes.length > 0) {
      state.maxPhotos = state.frameBoxes.length;
    } else {
      // Fallback: Generate a generic layout (2x2 grid or vertical strip)
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      state.frameBoxes = [];
      if (h > w * 1.5) {
         // Vertical strip fallback
         const padding = w * 0.1;
         const boxW = w - padding * 2;
         const boxH = (h - padding * 5) / 4;
         for(let i=0; i<4; i++) {
            state.frameBoxes.push({x: padding, y: padding + i*(boxH + padding), w: boxW, h: boxH});
         }
      } else {
         // 2x2 grid fallback
         const padding = w * 0.05;
         const boxW = (w - padding * 3) / 2;
         const boxH = (h - padding * 3) / 2;
         state.frameBoxes.push({x: padding, y: padding, w: boxW, h: boxH});
         state.frameBoxes.push({x: padding*2 + boxW, y: padding, w: boxW, h: boxH});
         state.frameBoxes.push({x: padding, y: padding*2 + boxH, w: boxW, h: boxH});
         state.frameBoxes.push({x: padding*2 + boxW, y: padding*2 + boxH, w: boxW, h: boxH});
      }
      state.maxPhotos = 4;
    }
  }
  updateStatus();
}

function analyzeFrame(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const isWhite = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) {
      isWhite[i/4] = 1;
    }
  }

  const boxes = [];
  const visited = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y += 5) {
    for (let x = 0; x < width; x += 5) {
      const idx = y * width + x;
      if (isWhite[idx] && !visited[idx]) {
        let minX = x, maxX = x, minY = y, maxY = y;
        const stack = [idx];
        visited[idx] = 1;
        
        while (stack.length > 0) {
          const currIdx = stack.pop();
          const cx = currIdx % width;
          const cy = Math.floor(currIdx / width);
          
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          
          const neighbors = [
            currIdx + 1, currIdx - 1, 
            currIdx + width, currIdx - width
          ];
          
          for (let i = 0; i < 4; i++) {
            const nIdx = neighbors[i];
            if (nIdx >= 0 && nIdx < width * height) {
              if (i === 0 && cx === width - 1) continue;
              if (i === 1 && cx === 0) continue;
              if (isWhite[nIdx] && !visited[nIdx]) {
                visited[nIdx] = 1;
                stack.push(nIdx);
              }
            }
          }
        }
        
        if ((maxX - minX) > width * 0.1 && (maxY - minY) > height * 0.05) {
          boxes.push({x: minX, y: minY, w: maxX - minX, h: maxY - minY});
        }
      }
    }
  }
  
  boxes.sort((a, b) => {
    if (Math.abs(a.y - b.y) > height * 0.1) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
  
  return boxes;
}

function drawARFilters(ctx, w, h) {
  if (!state.faces || state.faces.length === 0 || state.currentARFilterIndex === 'none') return;

  state.faces.forEach((face) => {
    const getPos = (idx) => ({ x: (1 - face[idx].x) * w, y: face[idx].y * h });
    
    const nose = getPos(1);
    const leftEye = getPos(159);
    const rightEye = getPos(386);
    const leftCheek = getPos(234);
    const rightCheek = getPos(454);
    const topHead = getPos(10);
    const bottomChin = getPos(152);

    const faceWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
    const faceHeight = Math.hypot(bottomChin.x - topHead.x, bottomChin.y - topHead.y);

    const eye1 = getPos(159);
    const eye2 = getPos(386);
    const screenLeftEye = eye1.x < eye2.x ? eye1 : eye2;
    const screenRightEye = eye1.x < eye2.x ? eye2 : eye1;

    // Use screen-left and screen-right to calculate angle so it's never upside down
    const angle = Math.atan2(screenRightEye.y - screenLeftEye.y, screenRightEye.x - screenLeftEye.x);

    ctx.save();
    
    if (state.currentARFilterIndex === 'cat') {
      const earSize = faceWidth * 0.4;
      ctx.fillStyle = "#ffb3cc";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      
      const drawEar = (x, y, rot) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + rot);
        ctx.beginPath();
        ctx.moveTo(-earSize/2, 0);
        ctx.lineTo(0, -earSize);
        ctx.lineTo(earSize/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      drawEar(leftEye.x - earSize/2, topHead.y, -0.3);
      drawEar(rightEye.x + earSize/2, topHead.y, 0.3);
      
      ctx.font = `${faceWidth * 0.3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐱", nose.x, nose.y);
      
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nose.x - 20, nose.y); ctx.lineTo(leftCheek.x, nose.y - 10);
      ctx.moveTo(nose.x - 20, nose.y+10); ctx.lineTo(leftCheek.x, nose.y + 10);
      ctx.moveTo(nose.x + 20, nose.y); ctx.lineTo(rightCheek.x, nose.y - 10);
      ctx.moveTo(nose.x + 20, nose.y+10); ctx.lineTo(rightCheek.x, nose.y + 10);
      ctx.stroke();
    } 
    else if (state.currentARFilterIndex === 'thug') {
      const img = document.getElementById('sunglassesImg');
      if (img && img.complete && img.naturalWidth > 0) {
        const cx = (leftEye.x + rightEye.x) / 2;
        // Dịch kính xuống một chút để không che lông mày
        const cy = (leftEye.y + rightEye.y) / 2 + faceHeight * 0.04;
        
        const glassesWidth = faceWidth * 1.15;
        const glassesHeight = glassesWidth * (img.naturalHeight / img.naturalWidth);
        
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.drawImage(img, -glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);
      }
    }
    else if (state.currentARFilterIndex === 'sunglasses2') {
      const img = document.getElementById('sunglasses2Img');
      if (img && img.complete && img.naturalWidth > 0) {
        const cx = (leftEye.x + rightEye.x) / 2;
        // Dịch kính xuống một chút để không che lông mày
        const cy = (leftEye.y + rightEye.y) / 2 + faceHeight * 0.04;
        
        const glassesWidth = faceWidth * 1.15;
        const glassesHeight = glassesWidth * (img.naturalHeight / img.naturalWidth);
        
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.drawImage(img, -glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);
      }
    }
    else if (state.currentARFilterIndex === 'crown') {
      const crownSize = faceWidth * 0.8;
      ctx.translate(topHead.x, topHead.y - crownSize/3);
      ctx.rotate(angle);
      ctx.font = `${crownSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👑", 0, 0);
      
      ctx.fillStyle = "rgba(255, 100, 150, 0.4)";
      ctx.beginPath(); ctx.arc(leftCheek.x, leftCheek.y, faceWidth * 0.15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(rightCheek.x, rightCheek.y, faceWidth * 0.15, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
  });
}


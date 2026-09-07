const CELL_W = 192;
const CELL_H = 208;

const ANIMATIONS = {
  idle: { row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  walkRight: { row: 1, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  walkLeft: { row: 2, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, frames: 4, durations: [140, 140, 140, 280], once: true },
  jumping: { row: 4, frames: 5, durations: [140, 140, 140, 140, 280], once: true },
  failed: { row: 5, frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240], once: true },
  waiting: { row: 6, frames: 6, durations: [150, 150, 150, 150, 150, 260] },
  working: { row: 7, frames: 6, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, frames: 6, durations: [150, 150, 150, 150, 150, 280] },
};

const LOOK_ANGLES = [
  0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5,
  180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5,
];

const canvas = document.getElementById("pet");
const ctx = canvas.getContext("2d");
const sheet = new Image();

const world = {
  x: 0,
  y: 0,
  width: CELL_W,
  height: CELL_H,
  workArea: { x: 0, y: 0, width: 1280, height: 800 },
  cursor: { x: 0, y: 0 },
  overlay: false,
};

const state = {
  scale: 1,
  mode: "wander",
  anim: "idle",
  frame: 0,
  frameElapsed: 0,
  nextDecisionAt: 0,
  lookHoldUntil: 0,
  lookIndex: 0,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  falling: false,
  velocityY: 0,
  walkDir: 1,
  lastTs: 0,
  busy: false,
  lastSync: 0,
  skinId: "",
  sheetReady: false,
};

function applySheetUrl(url) {
  if (!url) return;
  state.sheetReady = false;
  sheet.onload = () => {
    state.sheetReady = true;
  };
  sheet.src = url;
}

function petSize() {
  return {
    width: Math.round(CELL_W * state.scale),
    height: Math.round(CELL_H * state.scale),
  };
}

function currentAnim() {
  return ANIMATIONS[state.anim] || ANIMATIONS.idle;
}

function setAnim(name, { reset = true } = {}) {
  if (state.anim === name && !reset) return;
  state.anim = name;
  if (reset) {
    state.frame = 0;
    state.frameElapsed = 0;
  }
}

function lookIndexFromAngle(degrees) {
  let best = 0;
  let bestDelta = 999;
  for (let i = 0; i < LOOK_ANGLES.length; i += 1) {
    const delta = Math.abs(((degrees - LOOK_ANGLES[i] + 540) % 360) - 180);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

function resizeCanvas() {
  if (world.overlay) {
    canvas.width = Math.max(1, world.workArea.width);
    canvas.height = Math.max(1, world.workArea.height);
    return;
  }
  canvas.width = CELL_W;
  canvas.height = CELL_H;
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.sheetReady || !sheet.complete) return;

  const dest = world.overlay
    ? {
        x: world.x - world.workArea.x,
        y: world.y - world.workArea.y,
        w: petSize().width,
        h: petSize().height,
      }
    : { x: 0, y: 0, w: CELL_W, h: CELL_H };

  let sx = 0;
  let sy = 0;
  if (state.anim === "idle" && performance.now() < state.lookHoldUntil) {
    sy = (state.lookIndex < 8 ? 9 : 10) * CELL_H;
    sx = (state.lookIndex % 8) * CELL_W;
  } else {
    const anim = currentAnim();
    sx = Math.min(state.frame, anim.frames - 1) * CELL_W;
    sy = anim.row * CELL_H;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sheet, sx, sy, CELL_W, CELL_H, dest.x, dest.y, dest.w, dest.h);
}

function groundY() {
  return world.workArea.y + world.workArea.height - petSize().height;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickWanderAction() {
  const roll = Math.random();
  if (roll < 0.42) return state.walkDir >= 0 ? "walkRight" : "walkLeft";
  if (roll < 0.58) return "idle";
  if (roll < 0.68) return "waiting";
  if (roll < 0.78) return "working";
  if (roll < 0.86) return "review";
  if (roll < 0.93) return "waving";
  if (roll < 0.98) return "jumping";
  return "failed";
}

async function syncWorld(force = false) {
  const now = performance.now();
  if (!force && now - state.lastSync < 80) return;
  const snapshot = await window.petBridge.getState();
  state.lastSync = now;
  state.scale = snapshot.scale;
  world.cursor = snapshot.cursor;
  world.workArea = snapshot.workArea;
  if (snapshot.skin?.sheetUrl && snapshot.skin.id !== state.skinId) {
    state.skinId = snapshot.skin.id;
    applySheetUrl(snapshot.skin.sheetUrl);
  }
  if (!state.dragging) {
    world.x = snapshot.bounds.x;
    world.y = snapshot.bounds.y;
    world.width = snapshot.bounds.width;
    world.height = snapshot.bounds.height;
    world.overlay = snapshot.overlay;
    resizeCanvas();
  }
}

async function moveTo(x, y) {
  const next = await window.petBridge.movePet(x, y);
  world.x = next.x;
  world.y = next.y;
  world.workArea = next.workArea;
}

function playAction(name) {
  if (state.dragging || state.falling) return;
  setAnim(name);
  if (name === "walkRight") state.walkDir = 1;
  if (name === "walkLeft") state.walkDir = -1;
  state.nextDecisionAt = performance.now() + randomBetween(1800, 4200);
}

function maybeLookAtCursor(ts, force = false) {
  const size = petSize();
  const centerX = world.x + size.width / 2;
  const centerY = world.y + size.height / 2;
  const dx = world.cursor.x - centerX;
  const dy = world.cursor.y - centerY;
  if (!force && Math.hypot(dx, dy) > 280) return;
  const degrees = (((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;
  state.lookIndex = lookIndexFromAngle(degrees);
  state.lookHoldUntil = ts + 900;
  if (state.anim !== "idle") setAnim("idle", { reset: false });
}

function advanceFrame(dt) {
  const anim = currentAnim();
  state.frameElapsed += dt;
  const duration = anim.durations[state.frame] ?? anim.durations[anim.durations.length - 1];
  if (state.frameElapsed < duration) return false;
  state.frameElapsed = 0;
  if (state.frame + 1 >= anim.frames) {
    if (anim.once) return true;
    state.frame = 0;
    return false;
  }
  state.frame += 1;
  return false;
}

async function tick(ts) {
  if (state.busy) {
    requestAnimationFrame(tick);
    return;
  }
  state.busy = true;
  const dt = state.lastTs ? Math.min(48, ts - state.lastTs) : 16;
  state.lastTs = ts;

  try {
    await syncWorld(state.dragging || state.falling);
    const size = petSize();
    const floor = groundY();

    if (state.dragging) {
      setAnim("waiting", { reset: state.anim !== "waiting" });
      advanceFrame(dt);
      drawFrame();
      return;
    }

    if (state.falling || world.y < floor - 2) {
      state.falling = true;
      setAnim("jumping", { reset: state.anim !== "jumping" });
      state.velocityY += 0.55 * (dt / 16);
      const nextY = Math.min(floor, world.y + state.velocityY);
      await moveTo(world.x, nextY);
      if (nextY >= floor) {
        state.falling = false;
        state.velocityY = 0;
        setAnim("idle");
        state.nextDecisionAt = ts + randomBetween(800, 1600);
      }
      advanceFrame(dt);
      drawFrame();
      return;
    }

    if (state.mode === "follow") {
      const centerX = world.x + size.width / 2;
      const centerY = world.y + size.height / 2;
      const dx = world.cursor.x - centerX;
      const dy = world.cursor.y - centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > 90) {
        const speed = 2.4 * (dt / 16);
        state.walkDir = dx >= 0 ? 1 : -1;
        const desired = state.walkDir > 0 ? "walkRight" : "walkLeft";
        setAnim(desired, { reset: state.anim !== desired });
        await moveTo(world.x + (dx / dist) * speed, Math.min(floor, world.y + (dy / dist) * speed));
      } else {
        maybeLookAtCursor(ts);
      }
    } else if (state.mode === "wander") {
      if (state.anim === "walkRight" || state.anim === "walkLeft") {
        const speed = 1.7 * (dt / 16);
        let nextX = world.x + (state.anim === "walkRight" ? speed : -speed);
        const minX = world.workArea.x;
        const maxX = world.workArea.x + world.workArea.width - size.width;
        if (nextX <= minX) {
          nextX = minX;
          state.walkDir = 1;
          setAnim("walkRight");
        } else if (nextX >= maxX) {
          nextX = maxX;
          state.walkDir = -1;
          setAnim("walkLeft");
        }
        await moveTo(nextX, floor);
      }

      if (ts >= state.nextDecisionAt && !currentAnim().once) {
        const next = pickWanderAction();
        if (next === "walkRight" || next === "walkLeft") {
          state.walkDir = Math.random() < 0.5 ? 1 : -1;
          setAnim(state.walkDir > 0 ? "walkRight" : "walkLeft");
          state.nextDecisionAt = ts + randomBetween(2200, 5200);
        } else {
          setAnim(next);
          state.nextDecisionAt = ts + randomBetween(1600, 4200);
        }
      } else if (!currentAnim().once && Math.random() < 0.003) {
        maybeLookAtCursor(ts, true);
      }
    } else {
      maybeLookAtCursor(ts);
    }

    if (advanceFrame(dt) && currentAnim().once) {
      setAnim("idle");
      state.nextDecisionAt = ts + randomBetween(900, 1800);
    }
    drawFrame();
  } finally {
    state.busy = false;
    requestAnimationFrame(tick);
  }
}

let lastClickAt = 0;
let dragMoved = false;

canvas.addEventListener("mousedown", async (event) => {
  if (event.button !== 0) return;
  dragMoved = false;
  const snapshot = await window.petBridge.beginDrag();
  state.dragging = true;
  world.overlay = true;
  world.workArea = snapshot.workArea;
  world.x = snapshot.bounds.x;
  world.y = snapshot.bounds.y;
  state.scale = snapshot.scale;
  state.dragOffsetX = event.screenX - snapshot.bounds.x;
  state.dragOffsetY = event.screenY - snapshot.bounds.y;
  state.falling = false;
  state.velocityY = 0;
  resizeCanvas();
  setAnim("waiting");
  canvas.classList.add("dragging");
});

window.addEventListener("mousemove", (event) => {
  if (!state.dragging) return;
  dragMoved = true;
  world.x = event.screenX - state.dragOffsetX;
  world.y = event.screenY - state.dragOffsetY;
});

window.addEventListener("mouseup", async (event) => {
  if (!state.dragging || event.button !== 0) return;
  state.dragging = false;
  canvas.classList.remove("dragging");
  const next = await window.petBridge.endDrag(world.x, world.y);
  world.overlay = false;
  world.x = next.x;
  world.y = next.y;
  world.workArea = next.workArea;
  resizeCanvas();

  const floor = groundY();
  if (world.y < floor - 8) {
    state.falling = true;
    state.velocityY = 0;
    setAnim("jumping");
    return;
  }

  const now = performance.now();
  if (!dragMoved) {
    if (now - lastClickAt < 280) playAction("jumping");
    else playAction("waving");
    lastClickAt = now;
  } else {
    setAnim("idle");
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.petBridge.showMenu();
});

window.petBridge.onSetMode((mode) => {
  state.mode = mode;
  state.nextDecisionAt = 0;
  if (mode === "stay") setAnim("idle");
});

window.petBridge.onPlayAction((action) => {
  playAction(action);
});

window.petBridge.onSetScale((scale) => {
  state.scale = scale;
});

window.petBridge.onSetSkin((skin) => {
  if (!skin?.sheetUrl) return;
  state.skinId = skin.id || "";
  applySheetUrl(skin.sheetUrl);
});

(async () => {
  await syncWorld(true);
  if (!sheet.src) {
    ctx.fillStyle = "#89c4ff";
    ctx.fillRect(16, 16, 160, 176);
  }
  state.nextDecisionAt = performance.now() + 1200;
  requestAnimationFrame(tick);
})();

sheet.addEventListener("error", () => {
  state.sheetReady = false;
  ctx.fillStyle = "#89c4ff";
  ctx.fillRect(16, 16, 160, 176);
});

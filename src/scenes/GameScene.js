import Phaser from 'phaser';
import CyberAudio from '../audio/CyberAudio.js';
import { HeatMap, ReplayTrack, clamp, hasLineOfSight, isInVision } from '../game/StealthEngine.js';

const TILE = 48;
const COLS = 20;
const ROWS = 13;
const LOOP_SECONDS = 30;
const GUARD_RANGE = 210;
const GUARD_FOV = Phaser.Math.DegToRad(36);

const pointAt = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.audioBus = data.audioBus || new CyberAudio(); }

  create() {
    this.buildLevel();
    this.createActors();
    this.createHud();
    this.bindControls();
    this.heatmap = new HeatMap(COLS, ROWS);
    this.loopCount = 1;
    this.captureCount = 0;
    this.echoCount = 0;
    this.echoTrack = null;
    this.startNewLoop('INITIALIZE');
  }

  buildLevel() {
    this.wallTiles = new Set();
    const addWall = (x, y) => this.wallTiles.add(`${x},${y}`);
    for (let x = 0; x < COLS; x += 1) { addWall(x, 0); addWall(x, ROWS - 1); }
    for (let y = 0; y < ROWS; y += 1) { addWall(0, y); addWall(COLS - 1, y); }
    [
      [3, 2], [3, 3], [3, 4], [3, 5], [7, 1], [7, 2], [7, 3],
      [7, 6], [7, 7], [7, 8], [7, 9], [11, 3], [11, 4], [11, 5], [11, 6],
      [15, 1], [15, 2], [15, 3], [15, 4], [15, 7], [15, 8], [15, 9], [15, 10],
      [4, 9], [5, 9], [6, 9], [9, 10], [10, 10], [11, 10], [17, 5], [17, 6],
    ].forEach(([x, y]) => addWall(x, y));

    const floor = this.add.graphics();
    floor.fillStyle(0x061125).fillRect(0, 0, this.scale.width, this.scale.height);
    for (let x = 0; x < COLS; x += 1) {
      for (let y = 0; y < ROWS; y += 1) {
        const px = x * TILE;
        const py = y * TILE;
        floor.fillStyle((x + y) % 2 ? 0x0a1d36 : 0x081a30, 0.9).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        floor.lineStyle(1, 0x1a5373, 0.27).strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
      }
    }
    const walls = this.add.graphics();
    this.wallTiles.forEach((value) => {
      const [x, y] = value.split(',').map(Number);
      const px = x * TILE;
      const py = y * TILE;
      walls.fillStyle(0x10264a).fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      walls.fillStyle(0x1c4c72).fillRect(px + 5, py + 5, TILE - 10, 7);
      walls.lineStyle(2, 0x2b7592, 0.85).strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
      walls.lineStyle(1, 0x6beaff, 0.26).lineBetween(px + 8, py + TILE - 9, px + TILE - 8, py + TILE - 9);
    });
    this.heatGraphics = this.add.graphics();
    this.coneGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();
    const start = pointAt(1, 10);
    const corePoint = pointAt(17, 2);
    const exitPoint = pointAt(17, 10);
    this.add.text(start.x, start.y - 26, 'ENTRY', { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#73b5d6' }).setOrigin(0.5);
    this.add.text(corePoint.x, corePoint.y - 30, 'QUANTUM CORE', { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#ffd68e' }).setOrigin(0.5);
    this.add.text(exitPoint.x, exitPoint.y + 28, 'EXTRACT', { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8cffc9' }).setOrigin(0.5);
  }

  createActors() {
    const start = pointAt(1, 10);
    this.player = this.add.sprite(start.x, start.y, 'player').setDepth(7);
    this.player.facing = 0;
    this.player.setScale(0.92);
    this.echo = this.add.sprite(start.x, start.y, 'echo').setDepth(5).setVisible(false).setAlpha(0.68);
    this.core = this.add.sprite(...Object.values(pointAt(17, 2)), 'core').setDepth(4);
    this.exit = this.add.sprite(...Object.values(pointAt(17, 10)), 'exit').setDepth(3);
    this.exitLocked = this.add.text(this.exit.x, this.exit.y - 33, 'LOCKED', { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#ff6c92' }).setOrigin(0.5);
    this.tweens.add({ targets: this.core, y: this.core.y - 4, duration: 680, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.echo, alpha: { from: 0.35, to: 0.78 }, duration: 420, yoyo: true, repeat: -1 });

    this.guards = [
      this.createGuard(9, 2, [[9, 2], [13, 2], [13, 7], [9, 7]], 106),
      // The initial leg heads away from the entry point, giving a new infiltrator a fair start.
      this.createGuard(5, 10, [[5, 10], [5, 6], [2, 8], [8, 10]], 98),
      this.createGuard(16, 9, [[16, 9], [12, 9], [12, 11], [17, 11]], 94),
    ];
  }

  createGuard(tx, ty, route, speed) {
    const at = pointAt(tx, ty);
    const sprite = this.add.sprite(at.x, at.y, 'guard').setDepth(6).setScale(0.9);
    return {
      sprite,
      route: route.map(([x, y]) => pointAt(x, y)),
      routeIndex: 1,
      state: 'PATROL',
      speed,
      facing: 0,
      lastSeen: null,
      chaseTime: 0,
      echoTime: 0,
      searchTarget: null,
      heard: false,
    };
  }

  createHud() {
    this.add.rectangle(480, 26, 940, 46, 0x061023, 0.88).setDepth(20).setStrokeStyle(1, 0x1680aa, 0.6);
    this.loopText = this.add.text(17, 12, '', { fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#a9eff9' }).setDepth(21);
    this.objectiveText = this.add.text(17, 32, '', { fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#d9edff' }).setDepth(21);
    this.statusText = this.add.text(943, 12, '', { fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#ffb5c6', align: 'right' }).setOrigin(1, 0).setDepth(21);
    this.heatText = this.add.text(943, 32, '', { fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#eeb5ff', align: 'right' }).setOrigin(1, 0).setDepth(21);
    this.helpText = this.add.text(480, 608, 'WASD MOVE · SHIFT SPRINT (NOISY) · R REWIND · P PAUSE · M MUTE', { fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#9dbcd1', backgroundColor: '#061023cc', padding: { x: 9, y: 5 } }).setOrigin(0.5).setDepth(21);
    this.toast = this.add.text(480, 82, '', { fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: '#ffffff', backgroundColor: '#14234be6', padding: { x: 12, y: 8 } }).setOrigin(0.5).setDepth(22).setVisible(false);
    this.pausePanel = this.add.container(480, 312).setDepth(40).setVisible(false);
    this.pausePanel.add([
      this.add.rectangle(0, 0, 400, 180, 0x050817, 0.94).setStrokeStyle(2, 0x71eefa, 0.9),
      this.add.text(0, -34, 'TIMELINE PAUSED', { fontFamily: 'Orbitron, sans-serif', fontSize: '23px', color: '#c7fbff' }).setOrigin(0.5),
      this.add.text(0, 16, 'P  RESUME     R  REWIND     M  MUTE', { fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#b4d6e9' }).setOrigin(0.5),
    ]);
  }

  bindControls() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      rewind: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
      mute: Phaser.Input.Keyboard.KeyCodes.M,
    });
    this.input.keyboard.on('keydown-R', () => { if (!this.paused) this.startNewLoop('MANUAL REWIND'); });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-M', () => {
      this.audioBus.setMuted(!this.audioBus.muted);
      this.showToast(this.audioBus.muted ? 'AUDIO MUTED' : 'AUDIO ONLINE', 900);
    });
  }

  startNewLoop(reason) {
    if (this.recording?.length > 5) {
      this.echoTrack = new ReplayTrack(this.recording);
      this.echoCount += 1;
    }
    this.recording = [];
    this.recordTimer = 0;
    this.heatTimer = 0;
    this.elapsed = 0;
    this.echoElapsed = 0;
    this.timeRemaining = LOOP_SECONDS;
    this.hasCore = false;
    this.core.setVisible(true);
    this.exitLocked.setText('LOCKED').setColor('#ff6c92');
    const start = pointAt(1, 10);
    this.player.setPosition(start.x, start.y).setAlpha(1);
    this.player.facing = 0;
    this.echo.setVisible(Boolean(this.echoTrack));
    if (this.echoTrack) this.echo.setPosition(start.x, start.y);
    this.guards.forEach((guard) => {
      const origin = guard.route[0];
      guard.sprite.setPosition(origin.x, origin.y).setTint(0xffffff);
      guard.routeIndex = 1;
      guard.state = 'PATROL';
      guard.facing = 0;
      guard.lastSeen = null;
      guard.chaseTime = 0;
      guard.echoTime = 0;
      guard.searchTarget = null;
    });
    this.audioBus.rewind();
    if (reason !== 'INITIALIZE') this.showToast(`${reason}: ECHO STORED`, 1250);
    this.recordPlayer();
  }

  update(time, deltaMs) {
    if (this.paused || this.ended) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.elapsed += dt;
    this.timeRemaining -= dt;
    this.updatePlayer(dt);
    this.updateEcho(dt);
    this.updateHeatmap(dt);
    this.updateGuards(dt);
    this.checkObjectives();
    this.renderIntel();
    this.updateHud();
    if (this.timeRemaining <= 0) {
      this.loopCount += 1;
      this.startNewLoop('LOOP EXPIRED');
    }
  }

  updatePlayer(dt) {
    let dx = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    let dy = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
    const moving = dx !== 0 || dy !== 0;
    const sprinting = moving && this.keys.sprint.isDown;
    if (moving) {
      const magnitude = Math.hypot(dx, dy);
      dx /= magnitude; dy /= magnitude;
      this.player.facing = Math.atan2(dy, dx);
      const speed = sprinting ? 235 : 150;
      this.tryMove(this.player, dx * speed * dt, dy * speed * dt);
      this.player.setRotation(this.player.facing + Math.PI / 2);
      this.stepTimer = (this.stepTimer || 0) - dt;
      if (this.stepTimer <= 0) { this.audioBus.step(); this.stepTimer = sprinting ? 0.16 : 0.27; }
      if (sprinting) this.addNoise();
    }
    this.recordTimer += dt;
    if (this.recordTimer >= 0.075) { this.recordTimer = 0; this.recordPlayer(); }
  }

  recordPlayer() {
    this.recording.push({ t: Number(this.elapsed.toFixed(3)), x: this.player.x, y: this.player.y, facing: this.player.facing });
  }

  updateEcho(dt) {
    if (!this.echoTrack) return;
    this.echoElapsed += dt;
    const point = this.echoTrack.sample(this.echoElapsed);
    if (!point) return;
    this.echo.setPosition(point.x, point.y).setRotation(point.facing + Math.PI / 2).setVisible(true);
  }

  updateHeatmap(dt) {
    this.heatTimer += dt;
    if (this.heatTimer >= 0.4) {
      this.heatTimer = 0;
      this.heatmap.add(this.player.x / TILE, this.player.y / TILE, this.keys.sprint.isDown ? 1.8 : 1);
      this.heatmap.cool(0.03);
    }
  }

  addNoise() {
    this.fxGraphics.clear();
    this.fxGraphics.lineStyle(1, 0xff71c9, 0.34).strokeCircle(this.player.x, this.player.y, 31);
  }

  updateGuards(dt) {
    this.anyChase = false;
    this.guards.forEach((guard) => {
      const observer = { x: guard.sprite.x, y: guard.sprite.y, facing: guard.facing };
      const sees = (target) => target && isInVision(observer, target, GUARD_RANGE, GUARD_FOV) && hasLineOfSight(observer, target, (x, y) => this.isBlockedPixel(x, y));
      const seesPlayer = sees(this.player);
      const seesEcho = this.echoTrack && sees(this.echo);
      let target = null;
      if (seesPlayer) {
        guard.state = 'CHASE';
        guard.lastSeen = { x: this.player.x, y: this.player.y };
        guard.chaseTime = 3.2;
        target = this.player;
        this.anyChase = true;
        guard.sprite.setTint(0xffd2db);
        if (!guard.alertSoundAt || this.elapsed - guard.alertSoundAt > 1.1) { this.audioBus.alert(); guard.alertSoundAt = this.elapsed; }
      } else if (guard.state === 'CHASE') {
        guard.chaseTime -= dt;
        target = guard.lastSeen;
        this.anyChase = true;
        if (guard.chaseTime <= 0 || distance(guard.sprite, target) < 12) {
          guard.state = 'SEARCH';
          const hotspot = this.heatmap.hottest([{ x: Math.floor(guard.sprite.x / TILE), y: Math.floor(guard.sprite.y / TILE) }]);
          guard.searchTarget = pointAt(hotspot.x, hotspot.y);
          guard.sprite.setTint(0xffe6ab);
        }
      } else if (seesEcho) {
        guard.state = 'SEARCH';
        guard.echoTime = 2.6;
        target = this.echo;
        guard.sprite.setTint(0xdfb3ff);
      } else if (guard.state === 'SEARCH') {
        guard.echoTime -= dt;
        if (guard.echoTime > 0 && this.echoTrack) target = this.echo;
        else target = guard.searchTarget;
        if (!target || distance(guard.sprite, target) < 14) {
          guard.state = 'PATROL';
          guard.sprite.clearTint();
        }
      }
      if (guard.state === 'PATROL') {
        target = guard.route[guard.routeIndex];
        if (distance(guard.sprite, target) < 7) {
          guard.routeIndex = (guard.routeIndex + 1) % guard.route.length;
          target = guard.route[guard.routeIndex];
        }
      }
      if (target) this.moveGuard(guard, target, dt);
      if (distance(guard.sprite, this.player) < 22) this.capturePlayer();
    });
  }

  moveGuard(guard, target, dt) {
    const dx = target.x - guard.sprite.x;
    const dy = target.y - guard.sprite.y;
    const length = Math.hypot(dx, dy) || 1;
    guard.facing = Math.atan2(dy, dx);
    const multiplier = guard.state === 'CHASE' ? 1.35 : guard.state === 'SEARCH' ? 1.12 : 1;
    const step = Math.min(length, guard.speed * multiplier * dt);
    this.tryMove(guard.sprite, (dx / length) * step, (dy / length) * step);
    guard.sprite.setRotation(guard.facing + Math.PI / 2);
  }

  tryMove(sprite, dx, dy) {
    if (this.canOccupy(sprite.x + dx, sprite.y, 13)) sprite.x += dx;
    if (this.canOccupy(sprite.x, sprite.y + dy, 13)) sprite.y += dy;
  }

  canOccupy(x, y, radius) {
    return ![
      [x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius],
    ].some(([px, py]) => this.isBlockedPixel(px, py));
  }

  isBlockedPixel(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || this.wallTiles.has(`${tx},${ty}`);
  }

  checkObjectives() {
    if (!this.hasCore && distance(this.player, this.core) < 28) {
      this.hasCore = true;
      this.core.setVisible(false);
      this.exitLocked.setText('OPEN').setColor('#8cffc9');
      this.audioBus.pickup();
      this.showToast('QUANTUM CORE ACQUIRED — EXTRACT NOW', 1600);
    }
    if (this.hasCore && distance(this.player, this.exit) < 30) this.finish(true);
  }

  capturePlayer() {
    if (this.captureLocked) return;
    this.captureLocked = true;
    this.captureCount += 1;
    this.audioBus.alert();
    this.cameras.main.shake(160, 0.012);
    if (this.captureCount >= 3) {
      this.time.delayedCall(260, () => this.finish(false));
      return;
    }
    this.showToast(`TRACE LOCKED — TIMELINE REWIND ${this.captureCount}/3`, 900);
    this.time.delayedCall(650, () => {
      this.loopCount += 1;
      this.captureLocked = false;
      this.startNewLoop('CAPTURED');
    });
  }

  renderIntel() {
    this.coneGraphics.clear();
    this.guards.forEach((guard) => {
      const { x, y } = guard.sprite;
      const color = guard.state === 'CHASE' ? 0xff315c : guard.state === 'SEARCH' ? 0xc46bff : 0xff5e82;
      const a = guard.facing - GUARD_FOV;
      const b = guard.facing + GUARD_FOV;
      this.coneGraphics.fillStyle(color, guard.state === 'CHASE' ? 0.18 : 0.115);
      this.coneGraphics.fillTriangle(x, y, x + Math.cos(a) * GUARD_RANGE, y + Math.sin(a) * GUARD_RANGE, x + Math.cos(b) * GUARD_RANGE, y + Math.sin(b) * GUARD_RANGE);
      this.coneGraphics.lineStyle(1, color, 0.43).lineBetween(x, y, x + Math.cos(a) * GUARD_RANGE, y + Math.sin(a) * GUARD_RANGE).lineBetween(x, y, x + Math.cos(b) * GUARD_RANGE, y + Math.sin(b) * GUARD_RANGE);
    });
    this.heatGraphics.clear();
    this.heatmap.values.forEach((row, y) => row.forEach((value, x) => {
      if (value < 0.55 || this.wallTiles.has(`${x},${y}`)) return;
      this.heatGraphics.fillStyle(0xc65cff, Math.min(0.26, value * 0.035)).fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
    }));
    if (!this.keys.sprint.isDown) this.fxGraphics.clear();
  }

  updateHud() {
    const seconds = Math.max(0, this.timeRemaining).toFixed(1).padStart(4, '0');
    this.loopText.setText(`LOOP ${String(this.loopCount).padStart(2, '0')}  //  ${seconds}s`);
    this.objectiveText.setText(this.hasCore ? 'OBJECTIVE: ESCAPE THROUGH THE GREEN EXTRACT DOOR' : 'OBJECTIVE: STEAL THE QUANTUM CORE');
    this.statusText.setText(this.anyChase ? 'ALERT // HUNTING' : 'STATUS // HIDDEN').setColor(this.anyChase ? '#ff9bb5' : '#9fffe2');
    const heat = this.heatmap.hottest().value;
    this.heatText.setText(`ROUTE HEAT ${Math.round(clamp(heat * 12, 0, 100))}%  //  ECHO ${this.echoTrack ? 'ACTIVE' : 'EMPTY'}`);
  }

  showToast(message, duration = 1000) {
    this.toast.setText(message).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: duration, duration: 250, onComplete: () => this.toast.setVisible(false) });
  }

  togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    this.pausePanel.setVisible(this.paused);
  }

  finish(won) {
    if (this.ended) return;
    this.ended = true;
    if (won) this.audioBus.win();
    else this.audioBus.rewind();
    this.audioBus.stopAmbient();
    const heat = Math.round(clamp(this.heatmap.hottest().value * 12, 0, 100));
    this.time.delayedCall(420, () => this.scene.start('Result', { won, loops: this.loopCount, echoes: this.echoCount, heat }));
  }
}

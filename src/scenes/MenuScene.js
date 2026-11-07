import Phaser from 'phaser';
import CyberAudio from '../audio/CyberAudio.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor('#050817');
    this.audioBus = new CyberAudio();
    const { width, height } = this.scale;
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x14577b, 0.38);
    for (let x = 0; x <= width; x += 48) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 48) grid.lineBetween(0, y, width, y);
    this.add.rectangle(width / 2, height / 2, width, height, 0x160927, 0.22);
    this.add.text(width / 2, 108, 'ECHO HEIST', { fontFamily: 'Orbitron, sans-serif', fontSize: '64px', fontStyle: '900', color: '#e7feff', stroke: '#00cce6', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(width / 2, 168, 'AI', { fontFamily: 'Orbitron, sans-serif', fontSize: '32px', color: '#ff63c8', letterSpacing: 14 }).setOrigin(0.5);
    this.add.text(width / 2, 232, 'EVERY MISTAKE LEAVES AN ECHO.', { fontFamily: 'JetBrains Mono', fontSize: '16px', color: '#8feefa' }).setOrigin(0.5);

    const briefing = [
      'INFILTRATE THE AURORA VAULT',
      'STEAL THE QUANTUM CORE',
      'ESCAPE BEFORE THE LOOP COLLAPSES',
      '',
      'GUARDS LEARN THE ROUTES YOU REPEAT.',
      'YOUR PREVIOUS LOOP RETURNS AS AN ECHO.',
    ].join('\n');
    this.add.text(width / 2, 312, briefing, { fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#bfd4e7', align: 'center', lineSpacing: 7 }).setOrigin(0.5);

    const start = this.add.text(width / 2, 450, '[ START INFILTRATION ]', { fontFamily: 'Orbitron, sans-serif', fontSize: '23px', color: '#10172b', backgroundColor: '#7dfff0', padding: { x: 20, y: 12 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on('pointerover', () => start.setStyle({ backgroundColor: '#ffffff' }));
    start.on('pointerout', () => start.setStyle({ backgroundColor: '#7dfff0' }));
    const controls = this.add.text(width / 2, 536, 'WASD  MOVE     SHIFT  SPRINT     R  REWIND     P  PAUSE     M  MUTE', { fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#9bb6ca' }).setOrigin(0.5);
    this.add.text(width / 2, 584, 'Click Start or press ENTER', { fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#6e88a2' }).setOrigin(0.5);
    const startGame = () => {
      this.audioBus.unlock();
      this.audioBus.startAmbient();
      this.scene.start('Game', { audioBus: this.audioBus });
    };
    start.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);
    this.tweens.add({ targets: [start, controls], alpha: { from: 0.55, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
  }
}

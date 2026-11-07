import Phaser from 'phaser';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) { this.result = data; }

  create() {
    const { width, height } = this.scale;
    const won = this.result.won;
    this.add.rectangle(width / 2, height / 2, width, height, won ? 0x06251e : 0x260719, 0.96);
    this.add.text(width / 2, 148, won ? 'HEIST COMPLETE' : 'LOOP COLLAPSED', { fontFamily: 'Orbitron, sans-serif', fontSize: '44px', color: won ? '#85ffd7' : '#ff91b2', stroke: won ? '#12634b' : '#79142e', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(width / 2, 225, won ? 'THE QUANTUM CORE IS YOURS.' : 'THE FACILITY HAS SEALED YOUR TIMELINE.', { fontFamily: 'JetBrains Mono', fontSize: '16px', color: '#e6f5ff' }).setOrigin(0.5);
    const stats = [`LOOPS SURVIVED   ${this.result.loops}`, `ECHO RECORDINGS  ${this.result.echoes}`, `HEAT PROFILE     ${this.result.heat}%`, '', won ? 'MISSION SUCCESS: THE VAULT CAN BE BEATEN.' : 'TIP: YOUR ECHO CAN PULL GUARDS OFF YOUR PATH.'].join('\n');
    this.add.text(width / 2, 338, stats, { fontFamily: 'JetBrains Mono', fontSize: '17px', align: 'center', color: '#b5d5e7', lineSpacing: 8 }).setOrigin(0.5);
    const action = this.add.text(width / 2, 500, '[ RUN A NEW LOOP ]', { fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#0b1628', backgroundColor: '#a1faff', padding: { x: 18, y: 11 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const returnToMenu = () => this.scene.start('Menu');
    action.on('pointerdown', returnToMenu);
    this.input.keyboard.once('keydown-ENTER', returnToMenu);
  }
}

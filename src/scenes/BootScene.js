import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeTextures();
    this.scene.start('Menu');
  }

  makeTextures() {
    const make = (key, draw) => {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      draw(graphics);
      graphics.generateTexture(key, 48, 48);
      graphics.destroy();
    };
    make('player', (g) => {
      g.fillStyle(0x00e5ff, 0.25).fillCircle(24, 24, 21);
      g.fillStyle(0x8cfff4).fillCircle(24, 24, 13);
      g.fillStyle(0x07152a).fillRect(18, 14, 12, 18);
      g.fillStyle(0x00e5ff).fillRect(20, 17, 8, 3);
      g.lineStyle(2, 0xffffff, 0.9).strokeCircle(24, 24, 13);
    });
    make('guard', (g) => {
      g.fillStyle(0xff3864, 0.18).fillCircle(24, 24, 21);
      g.fillStyle(0xff4d78).fillCircle(24, 24, 14);
      g.fillStyle(0x260712).fillRect(17, 16, 14, 13);
      g.fillStyle(0xffbfd0).fillRect(19, 18, 10, 3);
      g.lineStyle(2, 0xffbdd0).strokeCircle(24, 24, 14);
    });
    make('echo', (g) => {
      g.fillStyle(0xc25cff, 0.12).fillCircle(24, 24, 22);
      g.fillStyle(0xb878ff, 0.65).fillCircle(24, 24, 12);
      g.lineStyle(2, 0xf4c5ff, 0.8).strokeCircle(24, 24, 14);
      g.lineStyle(1, 0xf4c5ff, 0.45).strokeCircle(24, 24, 20);
    });
    make('core', (g) => {
      g.fillStyle(0xffd15c, 0.14).fillCircle(24, 24, 22);
      g.fillStyle(0xffd15c).fillTriangle(24, 5, 40, 25, 24, 43);
      g.fillStyle(0xfff4bd).fillTriangle(24, 12, 33, 25, 24, 36);
      g.lineStyle(2, 0xfff4bd).strokeCircle(24, 24, 17);
    });
    make('exit', (g) => {
      g.fillStyle(0x0d2930).fillRect(7, 4, 34, 40);
      g.lineStyle(2, 0x2af7a5).strokeRect(7, 4, 34, 40);
      g.fillStyle(0x2af7a5, 0.35).fillRect(13, 10, 22, 28);
      g.fillStyle(0xd3ffea).fillRect(28, 24, 3, 3);
    });
  }
}

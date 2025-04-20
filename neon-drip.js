registerPaint('neon-drip', class {
  static get inputProperties() {
    return ['--drip-color', '--drip-speed', '--drip-size'];
  }

  paint(ctx, size, properties) {
    const color = properties.get('--drip-color').toString() || '#00ff00';
    const speed = properties.get('--drip-speed') || 1;
    const dropSize = properties.get('--drip-size') || 5;

    ctx.fillStyle = color;

    for (let x = 0; x < size.width; x += 20) {
      const offset = Math.sin(x * 0.1) * 10;
      const height = (Math.sin(x * 0.05 + speed) + 1) * dropSize;
      ctx.fillRect(x, offset, 2, height);
    }
  }
});

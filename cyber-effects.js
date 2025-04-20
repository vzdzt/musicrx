
registerPaint('cyber-effects', class {
  static get inputProperties() {
    return ['--effect-color', '--effect-intensity'];
  }

  paint(ctx, size, properties) {
    const color = properties.get('--effect-color').toString() || '#00ff00';
    const intensity = properties.get('--effect-intensity') || 0.5;
    
    ctx.fillStyle = color;
    ctx.globalAlpha = intensity;
    
    for (let i = 0; i < size.width; i += 20) {
      ctx.fillRect(i, 0, 2, size.height);
    }
  }
});


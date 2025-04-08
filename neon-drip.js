registerPaint('neon-drip', class {
    static get inputProperties() {
        return ['--drip-offset', '--drip-color'];
    }

    paint(ctx, size, properties) {
        const dripOffset = parseFloat(properties.get('--drip-offset')) || 0;
        const dripColor = properties.get('--drip-color').toString() || '#00f7ff';
        const { width, height } = size;

        ctx.shadowColor = dripColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = dripColor;
        ctx.globalAlpha = 0.6;

        // Reduced number of drips and simplified effects
        const spacing = Math.max(20, width / 20);
        for (let x = 0; x < width; x += spacing) {
            const wave = Math.sin(x * 0.03 + dripOffset) * 15;
            const y = height / 2 + wave;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, y);
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
});

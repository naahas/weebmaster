// ============================================
// MODE SURVIE - Canvas Aura Engine
// Shared between admin and player
// ============================================

const AURA_COLORS = [
    { core: '#ff6b6b', glow: 'rgba(255,107,107,' },
    { core: '#4ecdc4', glow: 'rgba(78,205,196,' },
    { core: '#f39c12', glow: 'rgba(243,156,18,' },
    { core: '#9b59b6', glow: 'rgba(155,89,182,' },
    { core: '#3498db', glow: 'rgba(52,152,219,' },
    { core: '#2ecc71', glow: 'rgba(46,204,113,' },
    { core: '#e91e63', glow: 'rgba(233,30,99,' },
    { core: '#00bcd4', glow: 'rgba(0,188,212,' },
    { core: '#ff9800', glow: 'rgba(255,152,0,' },
    { core: '#e74c3c', glow: 'rgba(231,76,60,' },
];

class SurvieAura {
    constructor(twitchId, username, colorIndex, x, y) {
        this.twitchId = twitchId;
        this.username = username;
        this.color = AURA_COLORS[colorIndex % AURA_COLORS.length];
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.size = 14;
    }

    updatePosition(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx || 0;
        this.vy = vy || 0;
    }

    update(dt, canvasW, canvasH) {
        this.pulsePhase += dt * 3;

        // Trail
        const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (vel > 0.3) {
            this.trail.push({ x: this.x, y: this.y, age: 0, vel: Math.min(vel, 8) });
        }

        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].age += dt;
            if (this.trail[i].age > 1.2) {
                this.trail.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        const pulse = Math.sin(this.pulsePhase) * 0.15 + 1;
        const g = this.color.glow;

        // Trail
        for (let i = 1; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = (1 - t.age / 1.2) * 0.4 * (t.vel / 8);
            const size = this.size * 0.6 * (1 - t.age / 1.2);
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fillStyle = g + alpha + ')';
            ctx.fill();
        }

        // Outer glow
        const grad1 = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4 * pulse);
        grad1.addColorStop(0, g + '0.15)');
        grad1.addColorStop(0.4, g + '0.06)');
        grad1.addColorStop(1, g + '0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad1;
        ctx.fill();

        // Mid glow
        const grad2 = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2 * pulse);
        grad2.addColorStop(0, g + '0.35)');
        grad2.addColorStop(0.5, g + '0.12)');
        grad2.addColorStop(1, g + '0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad2;
        ctx.fill();

        // Core
        const coreGrad = ctx.createRadialGradient(
            this.x, this.y - this.size * 0.2, this.size * 0.2,
            this.x, this.y, this.size * pulse
        );
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, this.color.core);
        coreGrad.addColorStop(1, g + '0.3)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Orbiting particles
        for (let i = 0; i < 4; i++) {
            const angle = this.pulsePhase + (Math.PI * 2 * i / 4);
            const dist = this.size * 2.2 + Math.sin(this.pulsePhase * 1.5 + i) * 6;
            const px = this.x + Math.cos(angle) * dist;
            const py = this.y + Math.sin(angle) * dist;
            const pSize = 1.5 + Math.sin(this.pulsePhase * 2 + i * 1.3) * 0.8;
            const pAlpha = 0.3 + Math.sin(this.pulsePhase * 1.8 + i) * 0.2;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fillStyle = g + pAlpha + ')';
            ctx.fill();
        }

        // Name
        ctx.font = '600 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(this.username, this.x, this.y + this.size * 2.5 + 8);
    }
}

class SurvieCanvas {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.auras = new Map(); // twitchId -> SurvieAura
        this.localTwitchId = options.localTwitchId || null;
        this.isAdmin = options.isAdmin || false;
        this.keys = {};
        this.running = false;
        this.lastTime = 0;
        this.positionCallback = options.onPosition || null;
        this.sendInterval = 0;
        this.gridSize = 60;
        this.speed = 130; // Reduced from 200

        this._onKeyDown = (e) => { this.keys[e.key.toLowerCase()] = true; };
        this._onKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
        this._onResize = () => this.resize();
    }

    start() {
        this.resize();
        window.addEventListener('resize', this._onResize);
        if (!this.isAdmin) {
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
        }
        this.running = true;
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }

    stop() {
        this.running = false;
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = rect.width;
        this.h = rect.height;
    }

    addPlayer(twitchId, username, colorIndex) {
        const x = this.w ? (0.2 + Math.random() * 0.6) * this.w : 400;
        const y = this.h ? (0.2 + Math.random() * 0.6) * this.h : 300;
        const aura = new SurvieAura(twitchId, username, colorIndex, x, y);
        this.auras.set(twitchId, aura);
        return aura;
    }

    removePlayer(twitchId) {
        this.auras.delete(twitchId);
    }

    updateRemotePlayer(twitchId, x, y, vx, vy) {
        const aura = this.auras.get(twitchId);
        if (!aura) return;
        // Convert normalized coords to canvas coords
        aura.updatePosition(x * this.w, y * this.h, vx, vy);
    }

    _loop(now) {
        if (!this.running) return;
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        // Background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.w, this.h);

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.w; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.h);
            ctx.stroke();
        }
        for (let y = 0; y < this.h; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.w, y);
            ctx.stroke();
        }

        // Update local player
        if (this.localTwitchId && !this.isAdmin) {
            const local = this.auras.get(this.localTwitchId);
            if (local) {
                const friction = 0.88;
                if (this.keys['z'] || this.keys['arrowup']) local.vy -= this.speed * dt;
                if (this.keys['s'] || this.keys['arrowdown']) local.vy += this.speed * dt;
                if (this.keys['q'] || this.keys['arrowleft']) local.vx -= this.speed * dt;
                if (this.keys['d'] || this.keys['arrowright']) local.vx += this.speed * dt;

                local.vx *= friction;
                local.vy *= friction;
                local.x += local.vx * dt * 60;
                local.y += local.vy * dt * 60;

                // Bounds
                const m = 30;
                local.x = Math.max(m, Math.min(this.w - m, local.x));
                local.y = Math.max(m, Math.min(this.h - m, local.y));

                // Send position (throttled ~15fps)
                this.sendInterval += dt;
                if (this.sendInterval > 0.066 && this.positionCallback) {
                    this.sendInterval = 0;
                    this.positionCallback(
                        local.x / this.w,
                        local.y / this.h,
                        local.vx,
                        local.vy
                    );
                }
            }
        }

        // Update & draw all auras
        this.auras.forEach(aura => {
            aura.update(dt, this.w, this.h);
            aura.draw(ctx);
        });

        requestAnimationFrame((t) => this._loop(t));
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SurvieCanvas = SurvieCanvas;
    window.AURA_COLORS = AURA_COLORS;
}

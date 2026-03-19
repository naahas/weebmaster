// ============================================
// MODE SURVIE - Canvas Aura Engine
// Large map with camera follow + click-to-move
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

// Map dimensions (world space)
const MAP_WIDTH = 38000;
const MAP_HEIGHT = 24000;

class SurvieAura {
    constructor(twitchId, username, colorIndex, x, y) {
        this.twitchId = twitchId;
        this.username = username;
        this.color = AURA_COLORS[colorIndex % AURA_COLORS.length];
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.targetX = null;
        this.targetY = null;
        this.trail = [];
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.size = 18;
        this.speed = 220;
        // Remote interpolation
        this.remoteTargetX = null;
        this.remoteTargetY = null;
        this.isRemote = false;
        this._firstUpdate = true; // Teleport on first position update
        // Spawn animation
        this.spawnedAt = performance.now();
        // Boost state
        this.boosted = false;
    }

    updatePosition(x, y, vx, vy) {
        // Clamp to map bounds
        const cx = Math.max(30, Math.min(MAP_WIDTH - 30, x));
        const cy = Math.max(30, Math.min(MAP_HEIGHT - 30, y));
        if (this.isRemote) {
            // Teleport on first update (avoid lerp from 0,0)
            if (this._firstUpdate) {
                this._firstUpdate = false;
                this.x = cx;
                this.y = cy;
                this.trail = [];
            }
            this.remoteTargetX = cx;
            this.remoteTargetY = cy;
            this.vx = vx || 0;
            this.vy = vy || 0;
        } else {
            this.x = cx;
            this.y = cy;
            this.vx = vx || 0;
            this.vy = vy || 0;
        }
    }

    moveToward(dt) {
        if (this.targetX === null || this.targetY === null) {
            this.vx *= 0.88;
            this.vy *= 0.88;
            return;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.targetX = null;
            this.targetY = null;
            this.vx *= 0.88;
            this.vy *= 0.88;
            return;
        }

        // Normalize and apply speed
        const nx = dx / dist;
        const ny = dy / dist;
        this.vx += nx * this.speed * dt;
        this.vy += ny * this.speed * dt;
        this.vx *= 0.88;
        this.vy *= 0.88;
    }

    update(dt) {
        this.pulsePhase += dt * 3;

        // Remote player interpolation
        if (this.isRemote && this.remoteTargetX !== null) {
            const dx = this.remoteTargetX - this.x;
            const dy = this.remoteTargetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Teleport if too far (avoid long trails)
            if (dist > 800) {
                this.x = this.remoteTargetX;
                this.y = this.remoteTargetY;
                this.trail = [];
            } else {
                const lerpSpeed = 0.18;
                this.x += dx * lerpSpeed;
                this.y += dy * lerpSpeed;
            }
            
            // Calculate actual velocity for trail
            this.vx = dx * 0.18;
            this.vy = dy * 0.18;
        } else {
            // Apply velocity (local player)
            this.x += this.vx * dt * 60;
            this.y += this.vy * dt * 60;
        }

        // Clamp to map bounds
        const m = 30;
        this.x = Math.max(m, Math.min(MAP_WIDTH - m, this.x));
        this.y = Math.max(m, Math.min(MAP_HEIGHT - m, this.y));

        // Trail (shorter for remote players)
        const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxTrail = this.isRemote ? 12 : 30;
        if (vel > 0.3) {
            this.trail.push({ x: this.x, y: this.y, age: 0, vel: Math.min(vel, 8) });
            if (this.trail.length > maxTrail) this.trail.shift();
        }

        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].age += dt;
            if (this.trail[i].age > 1.2) {
                this.trail.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Spawn animation (1.2s — glow burst + ring shockwave + scale)
        const spawnElapsed = (performance.now() - this.spawnedAt) / 1000;
        const spawnDuration = 1.2;
        const isSpawning = spawnElapsed < spawnDuration;
        
        if (isSpawning) {
            const t = spawnElapsed / spawnDuration;
            // Ease out quart
            const ease = 1 - Math.pow(1 - t, 4);
            // Slight overshoot for scale
            const scaleEase = t < 0.7 ? (ease / 0.7 * 1.08) : (1.08 - 0.08 * ((t - 0.7) / 0.3));
            const finalScale = Math.min(scaleEase, 1.08) * (0.15 + 0.85 * Math.min(ease * 1.2, 1));
            
            ctx.save();
            ctx.globalAlpha = Math.min(ease * 2, 1); // Fade in faster
            ctx.translate(this.x, this.y);
            ctx.scale(finalScale, finalScale);
            ctx.translate(-this.x, -this.y);
            
            // Ring shockwave (expands and fades out)
            if (t < 0.8) {
                const ringT = t / 0.8;
                const ringRadius = this.size * (3 + ringT * 12);
                const ringAlpha = (1 - ringT) * 0.4;
                const ringWidth = 2.5 * (1 - ringT * 0.7);
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = this.color.glow + ringAlpha + ')';
                ctx.lineWidth = ringWidth;
                ctx.stroke();
            }
            
            // Bright flash at start
            if (t < 0.3) {
                const flashT = t / 0.3;
                const flashAlpha = (1 - flashT) * 0.5;
                const flashRadius = this.size * (1 + flashT * 6);
                const flashGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, flashRadius);
                flashGrad.addColorStop(0, 'rgba(255, 255, 255, ' + flashAlpha + ')');
                flashGrad.addColorStop(0.3, this.color.glow + (flashAlpha * 0.6) + ')');
                flashGrad.addColorStop(1, this.color.glow + '0)');
                ctx.beginPath();
                ctx.arc(this.x, this.y, flashRadius, 0, Math.PI * 2);
                ctx.fillStyle = flashGrad;
                ctx.fill();
            }
        }

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

        // Boost speed effect (speed lines + blue-tinted outer ring)
        if (this.boosted) {
            // Pulsing blue ring
            const bPulse = Math.sin(this.pulsePhase * 3) * 0.15 + 0.85;
            const bRing = this.size * 3.5 * bPulse;
            ctx.beginPath();
            ctx.arc(this.x, this.y, bRing, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 180, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Speed streaks
            for (let i = 0; i < 6; i++) {
                const a = this.pulsePhase * 2 + (Math.PI * 2 / 6) * i;
                const innerR = this.size * 2.5;
                const outerR = this.size * 4 * bPulse;
                const sa = 0.15 + Math.sin(this.pulsePhase * 4 + i * 1.5) * 0.1;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(a) * innerR, this.y + Math.sin(a) * innerR);
                ctx.lineTo(this.x + Math.cos(a + 0.08) * outerR, this.y + Math.sin(a + 0.08) * outerR);
                ctx.strokeStyle = `rgba(140, 210, 255, ${sa})`;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }

        // Name
        ctx.font = '600 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.isRemote ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.6)';
        ctx.fillText(this.isRemote ? this.username : 'Vous', this.x, this.y + this.size * 2.5 + 8);
        
        // End spawn animation
        if (isSpawning) {
            ctx.restore();
        }
    }
}

class SurvieCanvas {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.auras = new Map();
        this.localTwitchId = options.localTwitchId || null;
        this.isAdmin = options.isAdmin || false;
        this.running = false;
        this.lastTime = 0;
        this.positionCallback = options.onPosition || null;
        this.sendInterval = 0;
        this.gridSize = 60;

        // Camera (centered on local player)
        this.camX = 0;
        this.camY = 0;
        
        // Mobile / responsive detection
        this.isMobile = ('ontouchstart' in window) || window.innerWidth < 900;
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.is2K = window.innerWidth > 1920;
        this.zoom = this.isMobile ? 0.6 : (this.is2K ? 0.95 : 0.65);
        this.npcScale = this.isMobile ? 0.7 : (this.is2K ? 1.2 : 1.0);

        // Click-to-move
        this.mouseDown = false;
        this.mouseScreenX = 0;
        this.mouseScreenY = 0;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;

        // Click indicator
        this.clickIndicator = null;

        // Impact effects
        this.impacts = [];
        this.collisionCooldowns = new Map();
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // NPCs
        this.npcs = [];
        this.npcImages = new Map(); // url -> Image
        this.nearestNPC = null; // NPC currently in range
        this.dialogueOpen = false; // Whether dialogue is showing
        this.onNPCInteract = options.onNPCInteract || null; // Callback when player interacts
        this.onDialogueClose = options.onDialogueClose || null; // Callback when dialogue closes

        // Ground items
        this.groundItems = [];
        this.groundItemImages = new Map();
        this.onItemPickup = options.onItemPickup || null;

        // Speed boosts
        this.boosts = [];
        this.boostShatters = []; // Active shatter animations
        this.boostActive = false;
        this.boostEndTime = 0;
        this.onBoostPickup = options.onBoostPickup || null;

        this._onResize = () => this.resize();
        this._onMouseDown = (e) => this._handleMouseDown(e);
        this._onMouseMove = (e) => this._handleMouseMove(e);
        this._onMouseUp = () => { 
            this.mouseDown = false;
            // Stop movement immediately
            const local = this.auras.get(this.localTwitchId);
            if (local) {
                local.targetX = null;
                local.targetY = null;
                local.vx = 0;
                local.vy = 0;
            }
        };
        this._onContextMenu = (e) => e.preventDefault();

        // Touch handlers (mobile)
        this._onTouchStart = (e) => {
            e.preventDefault();
            // Check if touch is on a nearby NPC (tap to interact on mobile)
            // Tap on item to pick up
            if (this.nearestItem && !this.nearestItem.picked && !this.dialogueOpen) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const tx = (touch.clientX - rect.left) / this.zoom + this.camX;
                const ty = (touch.clientY - rect.top) / this.zoom + this.camY;
                const dx = tx - this.nearestItem.x;
                const dy = ty - this.nearestItem.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.nearestItem.size * 2) {
                    this._triggerItemPickup();
                    return;
                }
            }
            if (this.nearestNPC && !this.dialogueOpen) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const tx = (touch.clientX - rect.left) / this.zoom + this.camX;
                const ty = (touch.clientY - rect.top) / this.zoom + this.camY;
                const dx = tx - this.nearestNPC.x;
                const dy = ty - this.nearestNPC.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.nearestNPC.size * 2) {
                    this._triggerInteraction();
                    return;
                }
            }
            const touch = e.touches[0];
            this._handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        };
        this._onTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this._handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        };
        this._onTouchEnd = (e) => {
            e.preventDefault();
            this.mouseDown = false;
            const local = this.auras.get(this.localTwitchId);
            if (local) {
                local.targetX = null;
                local.targetY = null;
                local.vx = 0;
                local.vy = 0;
            }
        };

        // Keyboard movement (ZQSD + arrows + E for interact)
        this.keysDown = new Set();
        this._onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (['z', 'q', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                this.keysDown.add(key);
                e.preventDefault();
            }
            // E key = interact with nearest NPC or close dialogue
            if (key === 'e') {
                if (this.dialogueOpen) {
                    // Close dialogue
                    if (this.onDialogueClose) {
                        this.onDialogueClose();
                    }
                    this.dialogueOpen = false;
                } else if (this.nearestItem) {
                    // Pickup item (priority over NPC if both in range)
                    this._triggerItemPickup();
                } else if (this.nearestNPC) {
                    this._triggerInteraction();
                }
            }
        };
        this._onKeyUp = (e) => {
            this.keysDown.delete(e.key.toLowerCase());
        };
    }

    _triggerInteraction() {
        if (!this.nearestNPC || this.dialogueOpen) return;
        this.dialogueOpen = true;
        this._dialogueNPC = this.nearestNPC;
        if (this.onNPCInteract) {
            this.onNPCInteract(this.nearestNPC);
        }
    }

    _triggerItemPickup() {
        if (!this.nearestItem || this.nearestItem.picked) return;
        this.nearestItem.picked = true;
        if (this.onItemPickup) {
            this.onItemPickup(this.nearestItem);
        }
    }
    
    closeDialogue() {
        this.dialogueOpen = false;
    }

    start() {
        this.resize();
        window.addEventListener('resize', this._onResize);
        if (!this.isAdmin) {
            this.canvas.addEventListener('mousedown', this._onMouseDown);
            this.canvas.addEventListener('mousemove', this._onMouseMove);
            this.canvas.addEventListener('mouseup', this._onMouseUp);
            this.canvas.addEventListener('mouseleave', this._onMouseUp);
            this.canvas.addEventListener('contextmenu', this._onContextMenu);
            this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
            this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
            this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
            this.canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
        }
        this.running = true;
        this.lastTime = performance.now();
        this.spawnTime = performance.now(); // For spawn animations
        this._loop(this.lastTime);
    }

    stop() {
        this.running = false;
        window.removeEventListener('resize', this._onResize);
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        this.canvas.removeEventListener('mouseup', this._onMouseUp);
        this.canvas.removeEventListener('mouseleave', this._onMouseUp);
        this.canvas.removeEventListener('contextmenu', this._onContextMenu);
        this.canvas.removeEventListener('touchstart', this._onTouchStart);
        this.canvas.removeEventListener('touchmove', this._onTouchMove);
        this.canvas.removeEventListener('touchend', this._onTouchEnd);
        this.canvas.removeEventListener('touchcancel', this._onTouchEnd);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.keysDown.clear();
    }

    _handleMouseDown(e) {
        this.mouseDown = true;
        this._updateMouseTarget(e);
    }

    _handleMouseMove(e) {
        if (this.mouseDown) {
            this._updateMouseTarget(e);
        }
    }

    _updateMouseTarget(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseScreenX = (e.clientX - rect.left) / this.zoom;
        this.mouseScreenY = (e.clientY - rect.top) / this.zoom;
        this.mouseWorldX = this.mouseScreenX + this.camX;
        this.mouseWorldY = this.mouseScreenY + this.camY;

        const local = this.auras.get(this.localTwitchId);
        if (local) {
            local.targetX = this.mouseWorldX;
            local.targetY = this.mouseWorldY;
        }

        this.clickIndicator = { x: this.mouseWorldX, y: this.mouseWorldY, age: 0 };
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
        
        // Recalculate mobile state on resize/orientation change
        this.isMobile = ('ontouchstart' in window) || window.innerWidth < 900;
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.is2K = window.innerWidth > 1920;
        this.zoom = this.isMobile ? 0.6 : (this.is2K ? 0.95 : 0.65);
        this.npcScale = this.isMobile ? 0.7 : (this.is2K ? 1.2 : 1.0);
    }

    addPlayer(twitchId, username, colorIndex, posX, posY) {
        let x, y;
        if (posX !== undefined && posY !== undefined && posX !== null && posY !== null) {
            x = posX * MAP_WIDTH;
            y = posY * MAP_HEIGHT;
        } else {
            // Spawn au centre de la map
            x = MAP_WIDTH / 2;
            y = MAP_HEIGHT / 2;
        }
        const aura = new SurvieAura(twitchId, username, colorIndex, x, y);
        aura.isRemote = (twitchId !== this.localTwitchId);
        this.auras.set(twitchId, aura);
        return aura;
    }

    removePlayer(twitchId) {
        this.auras.delete(twitchId);
    }

    addNPC(id, name, imageUrl, x, y, size, defaultDialogues, questDialogues, isStructure) {
        const npc = {
            id: id,
            name: name,
            imageUrl: imageUrl,
            x: x !== undefined ? x : (0.1 + Math.random() * 0.8) * MAP_WIDTH,
            y: y !== undefined ? y : (0.1 + Math.random() * 0.8) * MAP_HEIGHT,
            size: size || 120,
            defaultDialogues: defaultDialogues || ["..."],
            questDialogues: questDialogues || {},
            isStructure: isStructure || false,
            pulsePhase: Math.random() * Math.PI * 2,
            spawnIndex: this.npcs.length, // For staggered spawn animation
            image: null,
            loaded: false
        };

        // Load image
        if (!this.npcImages.has(imageUrl)) {
            const img = new Image();
            img.onload = () => {
                npc.loaded = true;
                npc.image = img;
                this.npcImages.set(imageUrl, img);
            };
            img.src = imageUrl;
        } else {
            npc.image = this.npcImages.get(imageUrl);
            npc.loaded = true;
        }

        this.npcs.push(npc);
        return npc;
    }

    removeNPC(id) {
        this.npcs = this.npcs.filter(n => n.id !== id);
    }

    addGroundItem(id, imageUrl, x, y, size) {
        const item = {
            id, imageUrl, x, y,
            size: size || 50,
            bobPhase: Math.random() * Math.PI * 2,
            image: null,
            loaded: false,
            picked: false,
        };
        
        const fullUrl = '/tracepic/' + imageUrl;
        if (!this.groundItemImages.has(fullUrl)) {
            const img = new Image();
            img.onload = () => {
                item.loaded = true;
                item.image = img;
                this.groundItemImages.set(fullUrl, img);
            };
            img.src = fullUrl;
        } else {
            item.image = this.groundItemImages.get(fullUrl);
            item.loaded = true;
        }
        
        this.groundItems.push(item);
    }

    removeGroundItem(id) {
        const item = this.groundItems.find(i => i.id === id);
        if (item) item.picked = true;
    }

    addBoost(id, x, y) {
        this.boosts.push({
            id, x, y,
            phase: Math.random() * Math.PI * 2,
            picked: false,
        });
    }

    _drawBoosts(ctx, dt) {
        const local = this.auras.get(this.localTwitchId);
        const VISIBLE_RANGE = 1100;
        const FADE_RANGE = 300;
        const PICKUP_RANGE = 100; // Auto-pickup when walking over/near
        const now = performance.now();

        // Check boost active state
        if (this.boostActive && now > this.boostEndTime) {
            this.boostActive = false;
            // Reset speed
            if (local) {
                local.speed = 220;
                local.boosted = false;
            }
        }

        // Draw shatters first (behind everything)
        for (let i = this.boostShatters.length - 1; i >= 0; i--) {
            const s = this.boostShatters[i];
            const elapsed = (now - s.time) / 1000;
            if (elapsed > 0.7) { this.boostShatters.splice(i, 1); continue; }

            const t = elapsed / 0.7;
            ctx.save();
            ctx.translate(s.x, s.y);

            // Shockwave ring — fast and bright
            const ringR = t * 250;
            const ringA = (1 - t) * 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(140, 200, 255, ${ringA})`;
            ctx.lineWidth = 4 * (1 - t);
            ctx.stroke();

            // Second inner ring
            if (t < 0.5) {
                const r2 = t * 2 * 150;
                const a2 = (1 - t * 2) * 0.4;
                ctx.beginPath();
                ctx.arc(0, 0, r2, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200, 230, 255, ${a2})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Flash
            if (t < 0.15) {
                const flashA = (1 - t / 0.15) * 0.7;
                const flashG = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
                flashG.addColorStop(0, `rgba(220, 240, 255, ${flashA})`);
                flashG.addColorStop(0.3, `rgba(140, 200, 255, ${flashA * 0.5})`);
                flashG.addColorStop(1, 'rgba(100, 160, 255, 0)');
                ctx.beginPath();
                ctx.arc(0, 0, 120, 0, Math.PI * 2);
                ctx.fillStyle = flashG;
                ctx.fill();
            }

            // Crystal shards flying out
            for (let j = 0; j < s.shards.length; j++) {
                const sh = s.shards[j];
                const d = t * sh.speed;
                const px = Math.cos(sh.angle) * d;
                const py = Math.sin(sh.angle) * d - t * 40; // slight upward drift
                const pa = (1 - t) * 0.85;
                const ss = sh.size * (1 - t * 0.6);
                const rot = t * sh.rotSpeed;

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(rot);
                ctx.globalAlpha = pa;

                // Diamond shard
                ctx.beginPath();
                ctx.moveTo(0, -ss);
                ctx.lineTo(ss * 0.5, 0);
                ctx.lineTo(0, ss);
                ctx.lineTo(-ss * 0.5, 0);
                ctx.closePath();
                ctx.fillStyle = sh.color;
                ctx.fill();

                ctx.restore();
            }

            // Sparkle particles
            for (let j = 0; j < 10; j++) {
                const a = (Math.PI * 2 / 10) * j + j * 0.5;
                const d = t * (120 + j * 15);
                const px = Math.cos(a) * d;
                const py = Math.sin(a) * d;
                const pa = (1 - t) * 0.6;
                const ps = 3 * (1 - t);
                ctx.beginPath();
                ctx.arc(px, py, ps, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 220, 255, ${pa})`;
                ctx.fill();
            }

            ctx.restore();
        }

        // Draw boost crystals
        this.boosts.forEach(boost => {
            if (boost.picked) return;

            boost.phase += dt * 2.5;

            // Distance-based visibility
            let alpha = 1;
            if (local) {
                const dx = local.x - boost.x;
                const dy = local.y - boost.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > VISIBLE_RANGE) { alpha = 0; }
                else if (dist > VISIBLE_RANGE - FADE_RANGE) {
                    alpha = 1 - (dist - (VISIBLE_RANGE - FADE_RANGE)) / FADE_RANGE;
                }

                // Auto-pickup on walk-over
                if (!this.isAdmin && dist < PICKUP_RANGE && !this.boostActive) {
                    boost.picked = true;
                    this.boostActive = true;
                    this.boostEndTime = now + 10000; // 10s
                    local.speed = 440;
                    local.boosted = true;

                    // Trigger shatter
                    const shardColors = [
                        'rgba(180, 220, 255, 0.9)', 'rgba(140, 180, 255, 0.8)',
                        'rgba(200, 240, 255, 0.9)', 'rgba(100, 200, 255, 0.8)',
                        'rgba(160, 140, 255, 0.7)', 'rgba(220, 200, 255, 0.8)',
                    ];
                    const shards = [];
                    for (let k = 0; k < 14; k++) {
                        shards.push({
                            angle: (Math.PI * 2 / 14) * k + (Math.random() - 0.5) * 0.4,
                            speed: 150 + Math.random() * 200,
                            size: 5 + Math.random() * 7,
                            rotSpeed: 6 + Math.random() * 10,
                            color: shardColors[k % shardColors.length],
                        });
                    }
                    this.boostShatters.push({ x: boost.x, y: boost.y, time: now, shards });

                    // Screen shake
                    this.shakeIntensity = 6;
                    this.shakeDuration = 0.25;
                    this.shakeTime = 0;

                    if (this.onBoostPickup) this.onBoostPickup(boost);
                    return;
                }
            } else if (!this.localTwitchId) {
                alpha = 1; // Admin spectator sees all
            }

            if (alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;

            const cx = boost.x;
            const cy = boost.y;
            const bob = Math.sin(boost.phase) * 5;
            const pulse = Math.sin(boost.phase * 1.6) * 0.1 + 1;

            // Outer prismatic glow
            const g1 = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, 55 * pulse);
            g1.addColorStop(0, `rgba(140, 200, 255, 0.2)`);
            g1.addColorStop(0.5, `rgba(100, 160, 255, 0.06)`);
            g1.addColorStop(1, 'rgba(80, 140, 255, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy + bob, 55 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = g1;
            ctx.fill();

            // Ground glow
            const gg = ctx.createRadialGradient(cx, cy + 20, 0, cx, cy + 20, 40);
            gg.addColorStop(0, 'rgba(100, 180, 255, 0.12)');
            gg.addColorStop(1, 'rgba(100, 180, 255, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy + 20, 40, 0, Math.PI * 2);
            ctx.fillStyle = gg;
            ctx.fill();

            // Crystal body (static diamond, no rotation)
            const cSize = 22 * pulse;
            const cg = ctx.createLinearGradient(cx, cy + bob - cSize, cx, cy + bob + cSize);
            cg.addColorStop(0, 'rgba(200, 235, 255, 0.92)');
            cg.addColorStop(0.5, 'rgba(130, 190, 255, 0.75)');
            cg.addColorStop(1, 'rgba(160, 130, 255, 0.65)');

            ctx.beginPath();
            ctx.moveTo(cx, cy + bob - cSize);
            ctx.lineTo(cx + cSize * 0.58, cy + bob);
            ctx.lineTo(cx, cy + bob + cSize);
            ctx.lineTo(cx - cSize * 0.58, cy + bob);
            ctx.closePath();
            ctx.fillStyle = cg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Inner facet highlight
            ctx.beginPath();
            ctx.moveTo(cx, cy + bob - cSize);
            ctx.lineTo(cx + cSize * 0.28, cy + bob - cSize * 0.2);
            ctx.lineTo(cx, cy + bob + cSize * 0.15);
            ctx.lineTo(cx - cSize * 0.28, cy + bob - cSize * 0.2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();

            // Core bright point
            const coreG = ctx.createRadialGradient(cx, cy + bob - 3, 1, cx, cy + bob, 8);
            coreG.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            coreG.addColorStop(1, 'rgba(150, 200, 255, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy + bob, 8, 0, Math.PI * 2);
            ctx.fillStyle = coreG;
            ctx.fill();

            // Orbiting sparkles
            for (let i = 0; i < 5; i++) {
                const a = boost.phase * 1.3 + (Math.PI * 2 / 5) * i;
                const d = 30 + Math.sin(boost.phase * 1.8 + i * 1.5) * 6;
                const sx = cx + Math.cos(a) * d;
                const sy = cy + bob + Math.sin(a) * d;
                const sa = 0.35 + Math.sin(boost.phase * 2.5 + i * 2) * 0.25;
                const ss = 1.8 + Math.sin(boost.phase * 2 + i) * 0.8;
                ctx.beginPath();
                ctx.arc(sx, sy, ss, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 220, 255, ${sa})`;
                ctx.fill();
            }

            ctx.restore();
        });
    }

    _drawGroundItems(ctx, dt) {
        const local = this.auras.get(this.localTwitchId);
        const VISIBLE_RANGE = 1100;
        const FADE_RANGE = 300;
        const INTERACT_RANGE = 120;
        
        // Track nearest item for pickup
        let closestItem = null;
        let closestItemDist = Infinity;
        
        this.groundItems.forEach(item => {
            if (item.picked || !item.loaded) return;
            
            item.bobPhase += dt * 2.5;
            
            const sx = item.x;
            const sy = item.y;
            
            // Distance-based visibility
            let alpha = 1;
            let proximity = 0;
            if (local) {
                const dx = local.x - sx;
                const dy = local.y - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > VISIBLE_RANGE) {
                    alpha = 0;
                } else if (dist > VISIBLE_RANGE - FADE_RANGE) {
                    alpha = 1 - (dist - (VISIBLE_RANGE - FADE_RANGE)) / FADE_RANGE;
                }
                
                // Track proximity for interaction hint
                if (dist < INTERACT_RANGE) {
                    proximity = 1 - (dist / INTERACT_RANGE);
                    if (dist < closestItemDist) {
                        closestItemDist = dist;
                        closestItem = item;
                    }
                }
            } else if (!this.localTwitchId) {
                alpha = 1;
            }
            
            if (alpha <= 0) return;
            
            // Smooth proximity
            if (item._proxSmooth === undefined) item._proxSmooth = 0;
            item._proxSmooth += (proximity - item._proxSmooth) * 0.08;
            const p = item._proxSmooth;
            
            // Bob animation
            const bob = Math.sin(item.bobPhase) * 5;
            const size = item.size * this.npcScale * (1 + p * 0.08);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Glow circle on ground (brighter when close)
            const glowRadius = size * 0.9 + p * 10;
            const glowAlpha = 0.12 + p * 0.1;
            const glowGrad = ctx.createRadialGradient(sx, sy + size * 0.3, 0, sx, sy + size * 0.3, glowRadius);
            glowGrad.addColorStop(0, `rgba(255, 200, 80, ${glowAlpha})`);
            glowGrad.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.beginPath();
            ctx.arc(sx, sy + size * 0.3, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = glowGrad;
            ctx.fill();
            
            // Draw item sprite
            if (item.image) {
                const aspect = item.image.width / item.image.height;
                const drawH = size;
                const drawW = drawH * aspect;
                ctx.drawImage(item.image, sx - drawW / 2, sy - drawH / 2 + bob - size * 0.2, drawW, drawH);
            }
            
            // "!" icon + "E pour ramasser" hint when close (same style as NPCs)
            if (p > 0.15) {
                const t = Math.min(1, (p - 0.15) / 0.1);
                const elastic = t < 1 
                    ? 1 + Math.sin(t * Math.PI * 3) * (1 - t) * 0.4
                    : 1;
                const popScale = t * elastic;
                const iconAlpha = Math.min(1, t * 1.5);
                
                const iconX = sx;
                const iconY = sy - size * 1.1 + bob;
                const fontSize = 24 * popScale;
                
                ctx.save();
                ctx.globalAlpha = alpha * iconAlpha;
                
                // Soft glow behind !
                const excGlowGrad = ctx.createRadialGradient(iconX, iconY, 0, iconX, iconY, fontSize * 1.2);
                excGlowGrad.addColorStop(0, 'rgba(255, 200, 50, 0.2)');
                excGlowGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
                ctx.beginPath();
                ctx.arc(iconX, iconY, fontSize * 1.2, 0, Math.PI * 2);
                ctx.fillStyle = excGlowGrad;
                ctx.fill();
                
                // "!" with dark outline then gold fill
                ctx.font = `900 ${fontSize}px "Segoe UI", Impact, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 4 * popScale;
                ctx.lineJoin = 'round';
                ctx.strokeText('!', iconX, iconY);
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('!', iconX, iconY);
                
                // White inner highlight
                ctx.globalAlpha = alpha * iconAlpha * 0.3;
                ctx.fillStyle = '#fff';
                ctx.fillText('!', iconX - 0.5, iconY - 0.5);
                
                // "E pour ramasser" below !
                ctx.globalAlpha = alpha * iconAlpha * 0.8;
                const hintSize = 16 * popScale;
                ctx.font = `600 ${hintSize}px "Rajdhani", "Segoe UI", sans-serif`;
                ctx.fillStyle = '#ffcc00';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 3 * popScale;
                const hintText = this.isMobile ? 'TAP' : 'E pour ramasser';
                ctx.strokeText(hintText, iconX, iconY + fontSize * 1.05);
                ctx.fillText(hintText, iconX, iconY + fontSize * 1.05);
                
                ctx.restore();
            }
            
            // Sparkle particles
            ctx.globalAlpha = alpha;
            for (let i = 0; i < 3; i++) {
                const angle = item.bobPhase * 0.8 + (Math.PI * 2 * i / 3);
                const dist = size * 0.5 + Math.sin(item.bobPhase + i) * 4;
                const px = sx + Math.cos(angle) * dist;
                const py = sy + Math.sin(angle) * dist * 0.5 + bob - size * 0.1;
                const sparkleSize = 1.5 + Math.sin(item.bobPhase * 2 + i) * 0.5;
                const sparkleAlpha = 0.3 + Math.sin(item.bobPhase * 1.5 + i) * 0.15;
                ctx.beginPath();
                ctx.arc(px, py, sparkleSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 80, ${sparkleAlpha})`;
                ctx.fill();
            }
            
            ctx.restore();
        });
        
        // Store nearest item for E key pickup
        this.nearestItem = closestItem;
    }

    _drawNPCs(ctx, dt) {
        const local = this.auras.get(this.localTwitchId);
        
        // Visibility range — fixed world distance (not affected by browser zoom)
        const VISIBLE_RANGE = 1100;
        const FADE_RANGE = 300;
        
        // Track nearest interactable NPC
        let closestNPC = null;
        let closestDist = Infinity;
        
        this.npcs.forEach(npc => {
            npc.pulsePhase += dt * 1.2;
            const pulse = Math.sin(npc.pulsePhase) * 0.015 + 1;
            const sx = npc.x;
            const sy = npc.y;
            const baseSize = npc.size * pulse * this.npcScale;

            // Spawn animation (staggered fade-in + scale)
            let spawnAlpha = 1;
            let spawnScale = 1;
            if (this.spawnTime) {
                const spawnDelay = 0.5 + npc.spawnIndex * 0.06; // Stagger: 60ms per NPC
                const spawnElapsed = (performance.now() - this.spawnTime) / 1000 - spawnDelay;
                const spawnDuration = 0.7;
                if (spawnElapsed < 0) {
                    spawnAlpha = 0;
                    spawnScale = 0.3;
                } else if (spawnElapsed < spawnDuration) {
                    const t = spawnElapsed / spawnDuration;
                    const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
                    spawnAlpha = ease;
                    spawnScale = 0.3 + ease * 0.7;
                }
            }

            // Distance-based visibility (only for players, not admin spectator)
            let npcAlpha = 1;
            if (local) {
                const dx = local.x - sx;
                const dy = local.y - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > VISIBLE_RANGE) {
                    npcAlpha = 0;
                } else if (dist > VISIBLE_RANGE - FADE_RANGE) {
                    npcAlpha = 1 - (dist - (VISIBLE_RANGE - FADE_RANGE)) / FADE_RANGE;
                }
            }
            
            // Skip drawing if invisible
            if (npcAlpha <= 0 || spawnAlpha <= 0) return;

            // Check proximity with local player
            const interactDist = baseSize * 1.6;
            let proximity = 0;
            if (local) {
                const dx = local.x - sx;
                const dy = local.y - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < interactDist) {
                    proximity = 1 - (dist / interactDist);
                }
            }
            
            // Smooth transition
            if (npc._proximitySmooth === undefined) npc._proximitySmooth = 0;
            npc._proximitySmooth += (proximity - npc._proximitySmooth) * 0.08;
            const p = npc._proximitySmooth;

            // Mini scale boost on proximity (max +6%)
            const size = baseSize * (1 + p * 0.06);

            // Apply visibility alpha + spawn alpha
            ctx.save();
            ctx.globalAlpha = npcAlpha * spawnAlpha;
            
            // Apply spawn scale (centered on NPC position)
            if (spawnScale < 1) {
                ctx.translate(sx, sy);
                ctx.scale(spawnScale, spawnScale);
                ctx.translate(-sx, -sy);
            }

            // Pedestal (lowered further from sprite)
            const pedestalW = size * 0.55;
            const pedestalH = size * 0.12;
            const pedestalY = sy + size * 0.75;

            // Soft glow under pedestal (brighter when near)
            const glowAlpha = 0.05 + p * 0.12;
            const shadowGrad = ctx.createRadialGradient(sx, pedestalY, 0, sx, pedestalY, pedestalW * 1.2);
            shadowGrad.addColorStop(0, `rgba(255, 200, 100, ${glowAlpha})`);
            shadowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.beginPath();
            ctx.ellipse(sx, pedestalY, pedestalW * 1.2, pedestalH * 1.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = shadowGrad;
            ctx.fill();

            // Pedestal line (brighter when near)
            const lineAlpha = 0.12 + p * 0.25;
            ctx.beginPath();
            ctx.ellipse(sx, pedestalY, pedestalW, pedestalH, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 220, 160, ${lineAlpha})`;
            ctx.lineWidth = 1 + p * 0.5;
            ctx.stroke();

            // Subtle float offset (lifts sprite slightly when near)
            const floatOffset = p * 6;

            // Draw sprite
            if (npc.loaded && npc.image) {
                const imgW = npc.image.naturalWidth || npc.image.width;
                const imgH = npc.image.naturalHeight || npc.image.height;
                const aspect = imgW / (imgH || 1);
                const drawH = size * 2;
                const drawW = drawH * aspect;
                ctx.drawImage(npc.image, sx - drawW / 2, sy - drawH / 2 - size * 0.2 - floatOffset, drawW, drawH);
            } else {
                ctx.beginPath();
                ctx.arc(sx, sy - floatOffset, size * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
                ctx.fill();
            }

            // RPG "!" icon above head — cartoon style
            if (p > 0.15) {
                const t = Math.min(1, (p - 0.15) / 0.1);
                // Elastic bounce (overshoot then settle)
                const elastic = t < 1 
                    ? 1 + Math.sin(t * Math.PI * 3) * (1 - t) * 0.4
                    : 1;
                const popScale = t * elastic;
                const iconAlpha = Math.min(1, t * 1.5);
                
                const iconX = sx;
                const iconY = sy - size * 1.6 - floatOffset;
                const fontSize = 28 * popScale;
                
                ctx.save();
                ctx.globalAlpha = iconAlpha;
                
                // Soft glow behind
                const glowGrad = ctx.createRadialGradient(iconX, iconY, 0, iconX, iconY, fontSize * 1.2);
                glowGrad.addColorStop(0, 'rgba(255, 200, 50, 0.2)');
                glowGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
                ctx.beginPath();
                ctx.arc(iconX, iconY, fontSize * 1.2, 0, Math.PI * 2);
                ctx.fillStyle = glowGrad;
                ctx.fill();
                
                // "!" with dark outline then gold fill
                ctx.font = `900 ${fontSize}px "Segoe UI", Impact, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Dark stroke outline
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 4 * popScale;
                ctx.lineJoin = 'round';
                ctx.strokeText('!', iconX, iconY);
                
                // Gold fill
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('!', iconX, iconY);
                
                // White inner highlight (offset slightly)
                ctx.globalAlpha = iconAlpha * 0.3;
                ctx.fillStyle = '#fff';
                ctx.fillText('!', iconX - 0.5, iconY - 0.5);
                
                // "E pour interagir" hint below "!" (or "TAP" on mobile)
                ctx.globalAlpha = iconAlpha * 0.8;
                const hintSize = 16 * popScale;
                ctx.font = `600 ${hintSize}px "Rajdhani", "Segoe UI", sans-serif`;
                ctx.fillStyle = '#ffcc00';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 3 * popScale;
                const hintText = this.isMobile ? 'TAP' : 'E pour interagir';
                ctx.strokeText(hintText, iconX, iconY + fontSize * 1.05);
                ctx.fillText(hintText, iconX, iconY + fontSize * 1.05);
                
                ctx.restore();
            }
            
            // Track nearest interactable NPC
            if (local && p > 0.15) {
                const dx = local.x - sx;
                const dy = local.y - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestNPC = npc;
                }
            }
            
            // End visibility alpha
            ctx.restore();
        });
        
        // Update nearest NPC reference
        this.nearestNPC = closestNPC;
        
        // Auto-close dialogue if player walked away from NPC (use raw distance, not smooth)
        if (this.dialogueOpen && local && this._dialogueNPC) {
            const dx = local.x - this._dialogueNPC.x;
            const dy = local.y - this._dialogueNPC.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this._dialogueNPC.size * 1.8) {
                this.dialogueOpen = false;
                this._dialogueNPC = null;
                if (this.onDialogueClose) {
                    this.onDialogueClose();
                }
            }
        }
    }

    updateRemotePlayer(twitchId, x, y, vx, vy) {
        const aura = this.auras.get(twitchId);
        if (!aura) return;
        aura.updatePosition(x * MAP_WIDTH, y * MAP_HEIGHT, vx, vy);
    }

    _updateCamera() {
        const local = this.auras.get(this.localTwitchId);
        const vw = this.w / this.zoom;
        const vh = this.h / this.zoom;
        if (!local) {
            // Admin: smooth follow average of all players
            if (this.auras.size > 0) {
                let ax = 0, ay = 0;
                this.auras.forEach(a => { ax += a.x; ay += a.y; });
                ax /= this.auras.size;
                ay /= this.auras.size;
                const targetCamX = ax - vw / 2;
                const targetCamY = ay - vh / 2;
                this.camX += (targetCamX - this.camX) * 0.05;
                this.camY += (targetCamY - this.camY) * 0.05;
            }
        } else {
            // Player: always exactly centered
            this.camX = local.x - vw / 2;
            this.camY = local.y - vh / 2;
        }

        // Clamp camera to map bounds
        this.camX = Math.max(0, Math.min(MAP_WIDTH - vw, this.camX));
        this.camY = Math.max(0, Math.min(MAP_HEIGHT - vh, this.camY));
    }

    _drawGrid() {
        const ctx = this.ctx;
        const vw = this.w / this.zoom;
        const vh = this.h / this.zoom;
        const startX = Math.floor(this.camX / this.gridSize) * this.gridSize - this.camX;
        const startY = Math.floor(this.camY / this.gridSize) * this.gridSize - this.camY;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;

        for (let x = startX; x < vw; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, vh);
            ctx.stroke();
        }
        for (let y = startY; y < vh; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(vw, y);
            ctx.stroke();
        }

        // Map border - thin line
        const bx = -this.camX;
        const by = -this.camY;
        const bw = MAP_WIDTH;
        const bh = MAP_HEIGHT;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);

        // Fog outside map bounds (dark overlay)
        ctx.fillStyle = 'rgba(5, 5, 10, 0.8)';
        if (bx > 0) ctx.fillRect(0, 0, bx, vh);
        const rightEdge = bx + bw;
        if (rightEdge < vw) ctx.fillRect(rightEdge, 0, vw - rightEdge, vh);
        if (by > 0) ctx.fillRect(bx, 0, bw, by);
        const bottomEdge = by + bh;
        if (bottomEdge < vh) ctx.fillRect(bx, bottomEdge, bw, vh - bottomEdge);
    }

    _drawClickIndicator(dt) {
        if (!this.clickIndicator) return;
        this.clickIndicator.age += dt;
        if (this.clickIndicator.age > 0.5) {
            this.clickIndicator = null;
            return;
        }

        const ctx = this.ctx;
        const ci = this.clickIndicator;
        const sx = ci.x - this.camX;
        const sy = ci.y - this.camY;
        const alpha = 1 - ci.age / 0.5;
        const radius = 6 + ci.age * 20;

        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _checkCollisions() {
        const auraList = Array.from(this.auras.values());
        const now = Date.now();
        const cooldownMs = 800;
        const collisionDist = 30;

        for (let i = 0; i < auraList.length; i++) {
            for (let j = i + 1; j < auraList.length; j++) {
                const a = auraList[i];
                const b = auraList[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < collisionDist) {
                    const key = [a.twitchId, b.twitchId].sort().join('-');
                    const lastImpact = this.collisionCooldowns.get(key) || 0;
                    if (now - lastImpact < cooldownMs) continue;

                    this.collisionCooldowns.set(key, now);

                    const mx = (a.x + b.x) / 2;
                    const my = (a.y + b.y) / 2;
                    this.impacts.push({
                        x: mx,
                        y: my,
                        age: 0,
                        colorA: a.color,
                        colorB: b.color
                    });

                    // Screen shake only for players involved
                    if (this.localTwitchId && 
                        (a.twitchId === this.localTwitchId || b.twitchId === this.localTwitchId)) {
                        this.shakeIntensity = 8;
                        this.shakeDuration = 0.3;
                        this.shakeTime = 0;
                    }
                }
            }
        }
    }

    _updateAndDrawImpacts(ctx, dt) {
        for (let i = this.impacts.length - 1; i >= 0; i--) {
            const imp = this.impacts[i];
            imp.age += dt;

            if (imp.age > 1.0) {
                this.impacts.splice(i, 1);
                continue;
            }

            const progress = imp.age / 1.0;
            const alpha = 1 - progress;
            const sx = imp.x - this.camX;
            const sy = imp.y - this.camY;

            // Shockwave ring 1 (color A) — big
            const r1 = 12 + progress * 80;
            ctx.beginPath();
            ctx.arc(sx, sy, r1, 0, Math.PI * 2);
            ctx.strokeStyle = imp.colorA.glow + (alpha * 0.6) + ')';
            ctx.lineWidth = 3 * (1 - progress);
            ctx.stroke();

            // Shockwave ring 2 (color B) — slightly smaller, delayed
            if (imp.age > 0.04) {
                const p2 = Math.max(0, (imp.age - 0.04) / 0.96);
                const a2 = 1 - p2;
                const r2 = 10 + p2 * 70;
                ctx.beginPath();
                ctx.arc(sx, sy, r2, 0, Math.PI * 2);
                ctx.strokeStyle = imp.colorB.glow + (a2 * 0.5) + ')';
                ctx.lineWidth = 2.5 * (1 - p2);
                ctx.stroke();
            }

            // Third ring — white, fastest
            const r3 = 15 + progress * 100;
            ctx.beginPath();
            ctx.arc(sx, sy, r3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Center flash — big and bright
            if (imp.age < 0.2) {
                const flashProgress = imp.age / 0.2;
                const flashAlpha = (1 - flashProgress) * 0.8;
                const flashSize = 15 + flashProgress * 30;
                const flashGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, flashSize);
                flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                flashGrad.addColorStop(0.3, imp.colorA.glow + (flashAlpha * 0.6) + ')');
                flashGrad.addColorStop(0.6, imp.colorB.glow + (flashAlpha * 0.3) + ')');
                flashGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.beginPath();
                ctx.arc(sx, sy, flashSize, 0, Math.PI * 2);
                ctx.fillStyle = flashGrad;
                ctx.fill();
            }

            // Sparks — more and faster
            if (imp.age < 0.3) {
                const sparkProgress = imp.age / 0.3;
                const sparkCount = 10;
                for (let s = 0; s < sparkCount; s++) {
                    const angle = (Math.PI * 2 * s / sparkCount) + s * 0.3;
                    const sDist = 8 + sparkProgress * 70;
                    const spx = sx + Math.cos(angle) * sDist;
                    const spy = sy + Math.sin(angle) * sDist;
                    const sAlpha = (1 - sparkProgress) * 0.7;
                    const sSize = (2.5 + Math.random()) * (1 - sparkProgress);
                    const sColor = s % 2 === 0 ? imp.colorA : imp.colorB;
                    ctx.beginPath();
                    ctx.arc(spx, spy, sSize, 0, Math.PI * 2);
                    ctx.fillStyle = sColor.glow + sAlpha + ')';
                    ctx.fill();
                }
            }

            // Glow halo that lingers
            if (imp.age > 0.1 && imp.age < 0.6) {
                const haloProgress = (imp.age - 0.1) / 0.5;
                const haloAlpha = (1 - haloProgress) * 0.12;
                const haloSize = 30 + haloProgress * 40;
                const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloSize);
                haloGrad.addColorStop(0, imp.colorA.glow + haloAlpha + ')');
                haloGrad.addColorStop(1, imp.colorB.glow + '0)');
                ctx.beginPath();
                ctx.arc(sx, sy, haloSize, 0, Math.PI * 2);
                ctx.fillStyle = haloGrad;
                ctx.fill();
            }
        }
    }

    _loop(now) {
        if (!this.running) return;
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        const ctx = this.ctx;

        // Update local player movement
        if (this.localTwitchId && !this.isAdmin) {
            const local = this.auras.get(this.localTwitchId);
            if (local) {
                // Keyboard movement (ZQSD + arrows)
                let kx = 0, ky = 0;
                if (this.keysDown.has('z') || this.keysDown.has('arrowup')) ky = -1;
                if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) ky = 1;
                if (this.keysDown.has('q') || this.keysDown.has('arrowleft')) kx = -1;
                if (this.keysDown.has('d') || this.keysDown.has('arrowright')) kx = 1;
                
                const hasKeyInput = kx !== 0 || ky !== 0;
                
                if (hasKeyInput) {
                    // Normalize diagonal
                    const len = Math.sqrt(kx * kx + ky * ky);
                    kx /= len;
                    ky /= len;
                    local.vx += kx * local.speed * dt;
                    local.vy += ky * local.speed * dt;
                    local.vx *= 0.88;
                    local.vy *= 0.88;
                    // Cancel mouse target while using keyboard
                    local.targetX = null;
                    local.targetY = null;
                } else if (this.mouseDown) {
                    // Mouse: recalculate world target (camera moves!)
                    this.mouseWorldX = this.mouseScreenX + this.camX;
                    this.mouseWorldY = this.mouseScreenY + this.camY;
                    local.targetX = this.mouseWorldX;
                    local.targetY = this.mouseWorldY;
                    local.moveToward(dt);
                } else {
                    local.moveToward(dt);
                }

                // Send position (throttled ~15fps)
                this.sendInterval += dt;
                if (this.sendInterval > 0.066 && this.positionCallback) {
                    this.sendInterval = 0;
                    this.positionCallback(
                        local.x / MAP_WIDTH,
                        local.y / MAP_HEIGHT,
                        local.vx,
                        local.vy
                    );
                }
            }
        }

        // Update all auras
        this.auras.forEach(aura => aura.update(dt));

        // Check collisions
        this._checkCollisions();

        // Update camera
        this._updateCamera();

        // Update screen shake
        if (this.shakeTime < this.shakeDuration) {
            this.shakeTime += dt;
            const shakeProgress = this.shakeTime / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * (1 - shakeProgress);
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Clear
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.fillStyle = '#181820';
        ctx.fillRect(0, 0, this.w, this.h);

        // Apply shake offset to everything
        ctx.save();
        ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

        // Apply zoom
        ctx.scale(this.zoom, this.zoom);

        // Draw grid (with camera offset)
        this._drawGrid();

        // Draw all auras (with camera offset)
        ctx.save();
        ctx.translate(-this.camX, -this.camY);
        
        // Draw boosts (behind ground items)
        this._drawBoosts(ctx, dt);
        
        // Draw ground items (behind NPCs)
        this._drawGroundItems(ctx, dt);
        
        // Draw NPCs (behind auras)
        this._drawNPCs(ctx, dt);
        
        this.auras.forEach(aura => aura.draw(ctx));
        ctx.restore();

        // Draw impacts (screen space)
        this._updateAndDrawImpacts(ctx, dt);

        // Click indicator
        this._drawClickIndicator(dt);

        // End shake offset
        ctx.restore();

        // Controls hint (screen space, always on top)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        if (this.isMobile) {
            // No text on mobile
        } else if (this.is2K) {
            ctx.font = '400 18px "Rajdhani", "Segoe UI", sans-serif';
            ctx.fillText('Déplacez-vous avec la souris, ZQSD ou les flèches', this.w / 2, this.h - 35);
        } else {
            ctx.font = '400 12px "Rajdhani", "Segoe UI", sans-serif';
            ctx.fillText('Déplacez-vous avec la souris, ZQSD ou les flèches', this.w / 2, this.h - 25);
        }
        ctx.restore();

        requestAnimationFrame((t) => this._loop(t));
    }
}

if (typeof window !== 'undefined') {
    window.SurvieCanvas = SurvieCanvas;
    window.AURA_COLORS = AURA_COLORS;
    window.MAP_WIDTH = MAP_WIDTH;
    window.MAP_HEIGHT = MAP_HEIGHT;
}
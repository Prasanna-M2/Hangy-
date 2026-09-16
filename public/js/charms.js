// charms.js - Charm Catalog, Vector Definitions, and Image Cache
// Matches Hangly's CollectionCharmCatalog.swift & BuiltInCharms.swift

const BUILT_IN_CHARMS = {
  // --- The Hangly Collection ---
  clover: {
    id: 'clover',
    name: 'Lucky Clover',
    region: 'Ireland & Worldwide',
    category: 'luck',
    mass: 2.95,
    radius: 34,
    sound: 'glass',
    beadCount: 0,
    svg: '/assets/previews/charm-preview-clover@2x.png',
    preview: '/assets/previews/charm-preview-clover@2x.png',
    cordColor: '#d4af37',
    beadColor: '#2ecc71',
    description: 'A radiant emerald four-leaf clover set in polished gold, the classic symbol of good fortune and serendipity.'
  },
  daruma: {
    id: 'daruma',
    name: 'Daruma',
    region: 'Japan',
    category: 'luck',
    mass: 3.65,
    radius: 34,
    sound: 'wood',
    beadCount: 3,
    svg: '/assets/charms/Daruma.svg',
    preview: '/assets/previews/charm-preview-daruma@2x.png',
    cordColor: '#c49a45',
    beadColor: '#d63031',
    description: 'A round, weighted doll modelled on Bodhidharma. You paint one eye while making a wish and the other when it comes true.'
  },
  nazar: {
    id: 'nazar',
    name: 'Nazar boncuğu',
    region: 'Turkey and the Mediterranean',
    category: 'protection',
    mass: 2.75,
    radius: 32,
    sound: 'glass',
    beadCount: 3,
    svg: '/assets/charms/nazar.svg',
    preview: '/assets/previews/charm-preview-nazar@2x.png',
    cordColor: '#4a69bd',
    beadColor: '#0984e3',
    description: 'A glass eye bead hung to deflect the evil eye, the envious glance believed to bring misfortune.'
  },
  hamsa: {
    id: 'hamsa',
    name: 'Hamsa',
    region: 'Middle East and North Africa',
    category: 'protection',
    mass: 3.05,
    radius: 35,
    sound: 'metal',
    beadCount: 3,
    svg: '/assets/charms/Hamsa.svg',
    preview: '/assets/previews/charm-preview-hamsa@2x.png',
    cordColor: '#bfa054',
    beadColor: '#3c6382',
    description: 'An open right hand, often with an eye in the palm, carried as protection against harm.'
  },
  nimbuMirchi: {
    id: 'nimbuMirchi',
    name: 'Nimbu-mirchi',
    region: 'India',
    category: 'protection',
    mass: 2.85,
    radius: 33,
    sound: 'soft',
    beadCount: 0,
    svg: '/assets/charms/Nimbu-mirchi.svg',
    preview: '/assets/previews/charm-preview-nimbuMirchi@2x.png',
    cordColor: '#f1c40f',
    beadColor: '#2ecc71',
    description: 'A lemon and green chillies strung together to ward off the evil eye and give bad luck something sour to chew on.'
  },
  ghanta: {
    id: 'ghanta',
    name: 'Ghanta',
    region: 'India',
    category: 'ritual',
    mass: 4.05,
    radius: 34,
    sound: 'bell',
    beadCount: 1,
    svg: '/assets/charms/Ghanta.svg',
    preview: '/assets/previews/charm-preview-ghanta@2x.png',
    cordColor: '#d35400',
    beadColor: '#e67e22',
    description: 'The sacred temple bell of worship. Its ring clears the mind and announces presence to the divine.'
  },
  drishtiBommai: {
    id: 'drishtiBommai',
    name: 'Drishti bommai',
    region: 'South India',
    category: 'protection',
    mass: 3.25,
    radius: 36,
    sound: 'wood',
    beadCount: 3,
    svg: '/assets/charms/Dhrishti bomma.svg',
    preview: '/assets/previews/charm-preview-drishtiBommai@2x.png',
    cordColor: '#c0392b',
    beadColor: '#e74c3c',
    description: 'A fierce painted face hung outside homes in Tamil Nadu to draw away harmful gazes.'
  },
  panchangJie: {
    id: 'panchangJie',
    name: 'Pánchángjié',
    region: 'China',
    category: 'luck',
    mass: 2.45,
    radius: 35,
    sound: 'soft',
    beadCount: 3,
    svg: '/assets/charms/panchangJie.svg',
    preview: '/assets/previews/charm-preview-panchangJie@2x.png',
    cordColor: '#e84118',
    beadColor: '#c23616',
    description: 'The endless knot tied from a single red cord. A symbol of longevity, unity and good fortune.'
  },
  manekiNeko: {
    id: 'manekiNeko',
    name: 'Maneki-neko',
    region: 'Japan',
    category: 'luck',
    mass: 3.45,
    radius: 36,
    sound: 'wood',
    beadCount: 2,
    svg: '/assets/charms/Maneki-neko.svg',
    preview: '/assets/previews/charm-preview-manekiNeko@2x.png',
    cordColor: '#e1b12c',
    beadColor: '#f5cd79',
    description: 'The beckoning cat whose raised paw invites good fortune and prosperous tidings.'
  },
  horseshoe: {
    id: 'horseshoe',
    name: 'Horseshoe',
    region: 'Europe and the Americas',
    category: 'luck',
    mass: 3.85,
    radius: 34,
    sound: 'metal',
    beadCount: 2,
    svg: '/assets/charms/Horseshoe.svg',
    preview: '/assets/previews/charm-preview-horseshoe@2x.png',
    cordColor: '#718093',
    beadColor: '#7f8fa6',
    description: 'Iron shaped by fire, nailed above a door for luck. Hung open end up to hold luck in.'
  },
  scarab: {
    id: 'scarab',
    name: 'Scarab',
    region: 'Ancient Egypt',
    category: 'protection',
    mass: 3.15,
    radius: 32,
    sound: 'glass',
    beadCount: 3,
    svg: '/assets/charms/Scarab.svg',
    preview: '/assets/previews/charm-preview-scarab@2x.png',
    cordColor: '#00a8ff',
    beadColor: '#0097e6',
    description: 'Sacred to the sun rebirth in ancient Egypt, rolled across the sky for protection and renewal.'
  },
  himmeli: {
    id: 'himmeli',
    name: 'Himmeli',
    region: 'Finland',
    category: 'ritual',
    mass: 2.35,
    radius: 36,
    sound: 'soft',
    beadCount: 0,
    svg: '/assets/charms/Himmeli.svg',
    preview: '/assets/previews/charm-preview-himmeli@2x.png',
    cordColor: '#fbc531',
    beadColor: '#e1b12c',
    description: 'A geometric mobile of rye straw hung above the table at midwinter in Finland to bless the coming harvest.'
  },

  // --- The Classics ---
  circle: {
    id: 'circle',
    name: 'Glass Bead',
    region: 'Universal',
    category: 'classic',
    mass: 3.0,
    radius: 26,
    sound: 'glass',
    beadCount: 1,
    isClassic: true,
    preview: '/assets/previews/charm-preview-circle@2x.png',
    primaryColor: '#8c7ae6',
    cordColor: '#9c88ff',
    description: 'A plain glass bead, simple, weighty and never out of place.'
  },
  star: {
    id: 'star',
    name: 'Lucky Star',
    region: 'Universal',
    category: 'classic',
    mass: 2.2,
    radius: 28,
    sound: 'bell',
    beadCount: 2,
    isClassic: true,
    preview: '/assets/previews/charm-preview-star@2x.png',
    primaryColor: '#fbc531',
    cordColor: '#e1b12c',
    description: 'Everyone’s first lucky charm. The lightest in the set, swinging the fastest.'
  },
  heart: {
    id: 'heart',
    name: 'Crimson Heart',
    region: 'Universal',
    category: 'classic',
    mass: 2.8,
    radius: 28,
    sound: 'soft',
    beadCount: 2,
    isClassic: true,
    preview: '/assets/previews/charm-preview-heart@2x.png',
    primaryColor: '#e84118',
    cordColor: '#c23616',
    description: 'Worn on the sleeve, or in this case hanging at the edge of the desktop.'
  },
  diamond: {
    id: 'diamond',
    name: 'Ice Diamond',
    region: 'Universal',
    category: 'classic',
    mass: 3.9,
    radius: 29,
    sound: 'glass',
    beadCount: 3,
    isClassic: true,
    preview: '/assets/previews/charm-preview-diamond@2x.png',
    primaryColor: '#00d2d3',
    cordColor: '#01a3a4',
    description: 'Cut, faceted and indestructible. Heavy enough to hang the rope nearly straight.'
  },
  camera: {
    id: 'camera',
    name: 'Retro Camera',
    region: 'Universal',
    category: 'classic',
    mass: 4.2,
    radius: 29,
    sound: 'metal',
    beadCount: 2,
    isClassic: true,
    preview: '/assets/previews/charm-preview-camera@2x.png',
    primaryColor: '#353b48',
    cordColor: '#718093',
    description: 'For photographers and the perpetually nostalgic. The heaviest charm in the box.'
  }
};

class CharmManager {
  constructor() {
    this.charms = { ...BUILT_IN_CHARMS };
    this.imageCache = new Map();
    this.activeCharmId = 'daruma';
    this.customCharms = [];
  }

  get activeCharm() {
    return this.charms[this.activeCharmId] || this.charms.daruma;
  }

  setCharm(id) {
    if (this.charms[id]) {
      this.activeCharmId = id;
      return this.charms[id];
    }
    return this.activeCharm;
  }

  async loadCustomCharms() {
    try {
      const res = await fetch('/api/custom-charms');
      if (res.ok) {
        const customs = await res.json();
        this.customCharms = customs;
        customs.forEach(c => {
          this.charms[c.id] = {
            id: c.id,
            name: c.name,
            region: 'Custom',
            category: 'custom',
            mass: c.mass || 3.0,
            radius: 32,
            sound: c.sound || 'wood',
            beadCount: c.beadCount || 2,
            svg: c.fileName,
            preview: c.fileName,
            isCustom: true,
            description: c.description || 'User created custom charm'
          };
        });
      }
    } catch (e) {
      console.warn('[Charms] Could not load custom charms', e);
    }
  }

  preloadAll() {
    Object.values(this.charms).forEach(charm => {
      if (charm.svg) this.loadImage(charm.svg);
      if (charm.preview) this.loadImage(charm.preview);
    });
  }

  loadImage(src) {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src);
    }
    const img = new Image();
    img.src = src;
    this.imageCache.set(src, img);
    return img;
  }

  // Render charm artwork on canvas at position (x, y) with rotation angle
  renderCharm(ctx, charm, x, y, angle, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    const r = charm.radius;

    if (charm.svg && this.imageCache.has(charm.svg)) {
      const img = this.imageCache.get(charm.svg);
      if (img.complete && img.naturalWidth > 0) {
        const w = r * 2.2;
        const h = (img.naturalHeight / img.naturalWidth) * w;
        // The charm knot sits at top edge
        ctx.drawImage(img, -w / 2, 0, w, h);
        ctx.restore();
        return;
      }
    }

    // Classic Procedural Vector Renderers
    if (charm.id === 'circle') {
      this.drawCircle(ctx, r, charm.primaryColor);
    } else if (charm.id === 'star') {
      this.drawStar(ctx, r, charm.primaryColor);
    } else if (charm.id === 'heart') {
      this.drawHeart(ctx, r, charm.primaryColor);
    } else if (charm.id === 'diamond') {
      this.drawDiamond(ctx, r, charm.primaryColor);
    } else if (charm.id === 'camera') {
      this.drawCamera(ctx, r, charm.primaryColor);
    } else {
      // Fallback preview image or bead
      if (charm.preview && this.imageCache.has(charm.preview)) {
        const img = this.imageCache.get(charm.preview);
        if (img.complete && img.naturalWidth > 0) {
          const w = r * 2.2;
          const h = (img.naturalHeight / img.naturalWidth) * w;
          ctx.drawImage(img, -w / 2, 0, w, h);
          ctx.restore();
          return;
        }
      }
      this.drawCircle(ctx, r, '#e74c3c');
    }

    ctx.restore();
  }

  drawCircle(ctx, r, color) {
    const grad = ctx.createRadialGradient(-r * 0.3, r * 0.7, r * 0.1, 0, r, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, '#1b1464');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, r, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * 0.5, r * 0.4, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStar(ctx, r, color) {
    ctx.save();
    ctx.translate(0, r * 1.1);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.1);
    grad.addColorStop(0, '#fff3b0');
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, '#d35400');

    ctx.fillStyle = grad;
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = r * 1.1;
    const innerRadius = r * 0.45;
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;

    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = Math.cos(rot) * outerRadius;
      let y = Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = Math.cos(rot) * innerRadius;
      y = Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(0, -outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawHeart(ctx, r, color) {
    ctx.save();
    ctx.translate(0, r * 0.3);
    const grad = ctx.createRadialGradient(-r * 0.2, r * 0.5, 2, 0, r * 0.7, r * 1.1);
    grad.addColorStop(0, '#ff7675');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, '#631010');

    ctx.fillStyle = grad;
    ctx.beginPath();
    const d = r * 1.3;
    ctx.moveTo(0, d * 0.3);
    ctx.bezierCurveTo(-d * 0.6, -d * 0.2, -d * 0.7, d * 0.5, 0, d);
    ctx.bezierCurveTo(d * 0.7, d * 0.5, d * 0.6, -d * 0.2, 0, d * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawDiamond(ctx, r, color) {
    ctx.save();
    ctx.translate(0, r);
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, '#e0ffff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, '#005f73');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.2);
    ctx.lineTo(r * 0.9, 0);
    ctx.lineTo(0, r * 1.2);
    ctx.lineTo(-r * 0.9, 0);
    ctx.closePath();
    ctx.fill();

    // Facet lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.2);
    ctx.lineTo(0, r * 1.2);
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.9, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawCamera(ctx, r, color) {
    ctx.save();
    ctx.translate(-r, r * 0.2);
    const w = r * 2.0;
    const h = r * 1.4;

    // Body
    ctx.fillStyle = color;
    ctx.roundRect ? ctx.roundRect(0, 0, w, h, 6) : ctx.rect(0, 0, w, h);
    ctx.fill();

    // Top bump
    ctx.fillStyle = '#636e72';
    ctx.fillRect(w * 0.3, -4, w * 0.4, 4);

    // Lens ring
    ctx.fillStyle = '#b2bec3';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Lens glass
    const lensGrad = ctx.createRadialGradient(w/2 - 2, h/2 - 2, 1, w/2, h/2, r * 0.4);
    lensGrad.addColorStop(0, '#74b9ff');
    lensGrad.addColorStop(0.8, '#0984e3');
    lensGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BUILT_IN_CHARMS, CharmManager };
} else {
  window.BUILT_IN_CHARMS = BUILT_IN_CHARMS;
  window.CharmManager = CharmManager;
}

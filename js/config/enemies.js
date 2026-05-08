export const SHAPES = [
            { type: 'triangle', sides: 3, radius: 12, erratic: false }, { type: 'square', sides: 4, radius: 14, erratic: false },
            { type: 'pentagon', sides: 5, radius: 16, erratic: false }, { type: 'hexagon', sides: 6, radius: 13, erratic: false },
            { type: 'circle', sides: 0, radius: 10, erratic: false }, { type: 'diamond', sides: 4, radius: 12, erratic: true }
        ];

export const TIERS = [
            { color: '#ef4444', name: "Red", hpM: 1, spdM: 1, dmgM: 1, xp: 1 }, { color: '#f97316', name: "Orange", hpM: 1.5, spdM: 1.05, dmgM: 1.2, xp: 2 },
            { color: '#eab308', name: "Yellow", hpM: 2.5, spdM: 1.1, dmgM: 1.5, xp: 3 }, { color: '#22c55e', name: "Green", hpM: 4, spdM: 1.15, dmgM: 2, xp: 4 },
            { color: '#06b6d4', name: "Cyan", hpM: 6, spdM: 1.2, dmgM: 2.5, xp: 5 }, { color: '#3b82f6', name: "Blue", hpM: 9, spdM: 1.25, dmgM: 3, xp: 7 },
            { color: '#a855f7', name: "Purple", hpM: 13, spdM: 1.3, dmgM: 4, xp: 8 }, { color: '#d946ef', name: "Magenta", hpM: 18, spdM: 1.35, dmgM: 5, xp: 10 },
            { color: '#f59e0b', name: "Gold", hpM: 25, spdM: 1.4, dmgM: 6.5, xp: 12 }, { color: '#f8fafc', name: "White", hpM: 35, spdM: 1.5, dmgM: 8, xp: 15 }
        ];

export const ELITE_TYPES = [
            { name: "Juggernaut", hpMult: 10, speedMult: 0.5, dmgMult: 1.5, scale: 2, color: '#991b1b', type: 'hexagon', behavior: 'push' },
            { name: "Sprinter", hpMult: 3, speedMult: 2.0, dmgMult: 1, scale: 1.2, color: '#fde047', type: 'triangle', behavior: 'dodge' },
            { name: "Splitter", hpMult: 5, speedMult: 0.8, dmgMult: 1, scale: 1.5, color: '#c084fc', type: 'square', behavior: 'split' },
            { name: "Vanguard", hpMult: 8, speedMult: 0.7, dmgMult: 1.5, scale: 1.4, color: '#cbd5e1', type: 'pentagon', behavior: 'shield' },
            { name: "Artillery", hpMult: 4, speedMult: 0.4, dmgMult: 1, scale: 1.3, color: '#ea580c', type: 'circle', behavior: 'mortar' }
        ];

export const BOSS_TEMPLATES = [
            { name: 'THE WHITE SHAPE', sides: 4, color: '#ffffff', hpMode: 1500, dmgBase: 25, behavior: 'teleport' },
            { name: 'CATHEDRAL-9', sides: 8, color: '#fcd34d', hpMode: 2500, dmgBase: 15, behavior: 'bullet_hell' },
            { name: 'MOTHER VERTEX', sides: 6, color: '#ec4899', hpMode: 2000, dmgBase: 20, behavior: 'summoner' },
            { name: 'VOID ORB', sides: 0, color: '#581c87', hpMode: 2800, dmgBase: 35, behavior: 'pull' },
            { name: 'OMEGA POLYGON', sides: 12, color: '#f43f5e', hpMode: 4000, dmgBase: 25, behavior: 'omega' }
        ];

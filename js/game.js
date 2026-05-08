        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, deleteField } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { CHARACTERS } from './config/characters.js';
import { SHAPES, TIERS, ELITE_TYPES, BOSS_TEMPLATES } from './config/enemies.js';
import { createUpgradesDb } from './config/upgrades.js';

        // FIREBASE CONFIGURATION (Insert your config here to enable Cloud Saves & Multiplayer on Github Pages)
        const firebaseConfig = {
            apiKey: "AIzaSyD0UDtrpSNGCN4pN4GXt0dQQZSuq76n6cI",
            authDomain: "shapes-22dc1.firebaseapp.com",
            projectId: "shapes-22dc1",
            storageBucket: "shapes-22dc1.firebasestorage.app",
            messagingSenderId: "662824269651",
            appId: "1:662824269651:web:0d67a4a23b7f32a3fed3a6"
        };
        
        let app, db, auth;
        let currentUser = null;
        let isOfflineMode = false;

        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
        } catch(e) {
            console.warn("Firebase failed to initialize. Falling back to Local Mode.", e);
            isOfflineMode = true;
        }

        function showSysMsg(text, colorClass = 'text-sky-400', bgClass = 'bg-sky-500/10 border-sky-500/20') {
            const container = document.getElementById('sys-msg-container');
            const el = document.createElement('div');
            el.className = `font-mono text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-full border backdrop-blur-md transition-all duration-300 translate-y-[-20px] opacity-0 shadow-lg ${colorClass} ${bgClass}`;
            el.innerText = text;
            container.appendChild(el);
            setTimeout(() => { el.classList.remove('translate-y-[-20px]', 'opacity-0'); }, 10);
            setTimeout(() => { el.classList.add('opacity-0'); setTimeout(() => el.remove(), 300); }, 3000);
        }

        const ARTIFACTS = {
            none: { id: 'none', name: 'None', desc: 'No bonus.', apply: () => {} },
            xp_core: { id: 'xp_core', name: 'Memory Crystal', desc: '2x XP gain from all gems.', apply: p => { p.effects.xpMult = Math.max(p.effects.xpMult || 1, 2.0); } },
            alloy_heart: { id: 'alloy_heart', name: 'Alloy Heart', desc: '+150 max HP at run start.', apply: p => { p.stats.maxHp += 150; p.stats.hp += 150; } },
            overclock_seed: { id: 'overclock_seed', name: 'Overclock Seed', desc: '+35% fire rate at run start.', apply: p => { p.stats.fireRate *= 1.35; } },
            magnet_core: { id: 'magnet_core', name: 'Magnet Core', desc: '+80 pickup range at run start.', apply: p => { p.stats.pickupRange += 80; } },
            apex_relic: { id: 'apex_relic', name: 'Apex Relic', desc: 'Start with +30% damage and +30% max HP.', apply: p => { p.stats.damage *= 1.3; p.stats.maxHp *= 1.3; p.stats.hp = p.stats.maxHp; } }
        };

        const OBJECTIVE_POOL = [
            { id: 'kills', title: 'PURGE WAVE', desc: 'Defeat 40 enemies in 60s', target: 40, timer: 60, metric: 'kills' },
            { id: 'xp', title: 'DATA HARVEST', desc: 'Collect 500 XP in 55s', target: 500, timer: 55, metric: 'xp' },
            { id: 'dodge', title: 'GHOST PROTOCOL', desc: 'Take no damage for 30s', target: 30, timer: 30, metric: 'noDamage' }
        ];
        const ASCENSION_MODS = {
            none: { id: 'none', name: 'None', hpMult: 1, dmgMult: 1, spawnMult: 1, shardMult: 1 },
            asc1: { id: 'asc1', name: 'Ascension I', hpMult: 1.25, dmgMult: 1.15, spawnMult: 1.12, shardMult: 1.35 },
            asc2: { id: 'asc2', name: 'Ascension II', hpMult: 1.55, dmgMult: 1.3, spawnMult: 1.22, shardMult: 1.75 }
        };
        const RUN_CONTRACTS = {
            none: { id: 'none', name: 'None', desc: 'No contract.', reward: 0 },
            glass: { id: 'glass', name: 'Glass Hunter', desc: 'Get 220+ kills. -10% max HP.', reward: 220 },
            rush: { id: 'rush', name: 'Speed Runner', desc: 'Reach Layer 3 in under 9 minutes.', reward: 260 },
            clean: { id: 'clean', name: 'Untouched', desc: 'Take <= 180 total damage.', reward: 260 }
        };
        const SKIN_PASSIVES = {
            default: p => {},
            cyber: p => { p.stats.fireRate *= 1.05; },
            wireframe: p => { p.stats.projectileSpeed *= 1.08; },
            blueprint: p => { p.effects.xpMult = (p.effects.xpMult || 1) * 1.08; },
            cosmic: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.03); },
            abyssal: p => { p.stats.maxHp += 35; p.stats.hp += 35; p.stats.armor += 2; }
        };
        const STARTER_MODULES = [
            { id: 'none', name: 'None', desc: 'No starter module.' },
            { id: 'dmg_up', name: 'Hollow Points', desc: 'Start with +16% damage.' },
            { id: 'fire_up', name: 'Overclocked Trigger', desc: 'Start with +18% fire rate.' },
            { id: 'hp_up', name: 'Titanium Plating', desc: 'Start with +80 max HP.' },
            { id: 'spd_up', name: 'Servo Motors', desc: 'Start with +15% move speed.' }
        ];
        const CLASS_MASTERY = {
            default: [
                { title: 'Aggression Node', desc: '+18% damage.', apply: p => p.stats.damage *= 1.18 },
                { title: 'Engine Node', desc: '+16% move speed.', apply: p => p.stats.speed *= 1.16 },
                { title: 'Safeguard Node', desc: '+120 max HP.', apply: p => { p.stats.maxHp += 120; p.stats.hp += 120; } }
            ],
            warden: [
                { title: 'Bulwark', desc: '+8 armor and +120 max HP.', apply: p => { p.stats.armor += 8; p.stats.maxHp += 120; p.stats.hp += 120; } },
                { title: 'Shock Bastion', desc: 'Pulse range +30%, damage +15%.', apply: p => { p.stats.attackRange *= 1.3; p.stats.damage *= 1.15; } },
                { title: 'Guard Drill', desc: '-30% dash cooldown and +10% speed.', apply: p => { p.stats.dashCooldown *= 0.7; p.stats.speed *= 1.1; } }
            ],
            gambler: [
                { title: 'Loaded Dice', desc: '+12% crit chance, +20% crit damage.', apply: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.12); p.stats.critMult += 0.2; } },
                { title: 'High Roller', desc: '+1 projectile and +20% spread.', apply: p => { p.stats.projectiles += 1; p.stats.spread *= 1.2; } },
                { title: 'Double Down', desc: '+25% damage, -10% max HP.', apply: p => { p.stats.damage *= 1.25; p.stats.maxHp *= 0.9; p.stats.hp = Math.min(p.stats.hp, p.stats.maxHp); } }
            ],
            necrosmith: [
                { title: 'Bone Kiln', desc: 'Husk minions gain +40% damage.', apply: p => { p.effects.necroHuskDmg = (p.effects.necroHuskDmg || 1) * 1.4; } },
                { title: 'Soul Rivets', desc: '+18% lifesteal and +20% max HP.', apply: p => { p.stats.lifesteal += 0.018; p.stats.maxHp *= 1.2; p.stats.hp = p.stats.maxHp; } },
                { title: 'Forge Rush', desc: '+35% fire rate.', apply: p => { p.stats.fireRate *= 1.35; } }
            ],
            voltdancer: [
                { title: 'Arc Runner', desc: '+20% move speed and +25% dash speed.', apply: p => { p.stats.speed *= 1.2; p.effects.voltDash = (p.effects.voltDash || 1) + 1; } },
                { title: 'Storm Focus', desc: '+2 chain lightning stacks.', apply: p => { p.effects.lightning = (p.effects.lightning || 0) + 2; } },
                { title: 'Static Guard', desc: '+8 dodge and +12 armor.', apply: p => { p.stats.dodge = Math.min(0.6, p.stats.dodge + 0.08); p.stats.armor += 12; } }
            ],
            architect: [
                { title: 'Combat Firmware', desc: 'Attack drone damage +40%.', apply: p => { p.effects.attackDroneBoost = (p.effects.attackDroneBoost || 1) * 1.4; } },
                { title: 'Harvest Protocol', desc: 'Harvester drone XP boost increased.', apply: p => { p.effects.harvestBoost = (p.effects.harvestBoost || 1.2) + 0.5; } },
                { title: 'Repair Loop', desc: 'Healing drone heals faster.', apply: p => { p.effects.healDroneRate = (p.effects.healDroneRate || 1) + 0.8; } }
            ]
        };
        const CLASS_QUIRKS = {
            ronin: { name: 'Bloodspin', desc: 'Starts with bleed edge and faster dashes for close-range aggression.', apply: p => { p.effects.bleed = (p.effects.bleed || 0) + 1; p.stats.dashCooldown *= 0.88; } },
            lancer: { name: 'Impale Drive', desc: 'Piercing thrusts hit harder and travel faster.', apply: p => { p.stats.projectileSpeed *= 1.2; p.stats.damage *= 1.12; } },
            bruiser: { name: 'Point-Blank Brutality', desc: 'Deals bonus damage to nearby targets.', apply: p => { p.effects.closeRangeBonus = 1; } },
            sniper: { name: 'Cold Focus', desc: 'Higher crit reliability at long range.', apply: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.08); p.stats.attackRange *= 1.08; } },
            bomber: { name: 'Blast Chain', desc: 'Explosions are larger and more punishing.', apply: p => { p.stats.explodeRadius = (p.stats.explodeRadius || 0) + 45; } },
            seeker: { name: 'Swarm Logic', desc: 'Projectiles home harder and travel farther.', apply: p => { p.stats.homing += 0.1; p.stats.attackRange *= 1.1; } },
            paladin: { name: 'Sanctuary Core', desc: 'Converts sustain into frontline durability.', apply: p => { p.stats.regen += 3; p.stats.armor += 6; } },
            ranger: { name: 'Suppressive Barrage', desc: 'Higher sustained fire rate while strafing.', apply: p => { p.stats.fireRate *= 1.18; p.stats.speed *= 1.06; } },
            channeler: { name: 'Arc Conductor', desc: 'Beam tracks deeper and ramps damage faster.', apply: p => { p.stats.attackRange *= 1.12; p.effects.beamRamp = 1; } },
            trapper: { name: 'Target Saturation', desc: 'Orbital strikes cover more area per volley.', apply: p => { p.stats.projectiles += 1; p.stats.explodeRadius = (p.stats.explodeRadius || 0) + 35; } },
            architect: { name: 'Swarm Command', desc: 'Starts with 3 attack drones plus harvester and healer support drones.', apply: p => {} },
            alchemist: { name: 'Catalyst Shell', desc: 'Starts with richer status stacks for proc chains.', apply: p => { p.effects.poison = (p.effects.poison || 0) + 1; p.effects.burn = (p.effects.burn || 0) + 1; } },
            warden: { name: 'Barrier Pulse', desc: 'Pulse attacks restore shield and harden defenses.', apply: p => { p.effects.maxShield = (p.effects.maxShield || 0) + 60; p.stats.armor += 4; } },
            gambler: { name: 'Chamber Roulette', desc: 'Color-coded chamber ring with forced reload loops.', apply: p => {} },
            necrosmith: { name: 'Soul Forge', desc: 'Elite kills forge temporary husk minions.', apply: p => { p.effects.necroForge = 1; } },
            voltdancer: { name: 'Kinetic Arc', desc: 'Moving and dashing chains lightning across packs.', apply: p => { p.effects.voltDash = (p.effects.voltDash || 1) + 1; p.stats.speed *= 1.08; } },
            voidwalker: { name: 'Void Drift', desc: 'Beam pressure with mobility-biased scaling.', apply: p => { p.stats.speed *= 1.1; p.stats.damage *= 1.1; } }
        };
        const ADMIN_KEY = 'bob123';
        const UISounds = {
            open: new Audio('assets/sfx/SFX_UI_OpenMenu.mp3'),
            close: new Audio('assets/sfx/SFX_UI_CloseMenu.mp3'),
            confirm: new Audio('assets/sfx/SFX_UI_Confirm.mp3'),
            cancel: new Audio('assets/sfx/SFX_UI_Cancel.mp3'),
            select: new Audio('assets/sfx/SFX_UI_MenuSelections.mp3'),
            equip: new Audio('assets/sfx/SFX_UI_Equip.mp3'),
            shop: new Audio('assets/sfx/SFX_UI_Shop.mp3')
        };
        const UIIconPool = [
            'fb74.png', 'fb120.png', 'fb188.png', 'fb204.png', 'fb260.png', 'fb311.png',
            'fb333.png', 'fb401.png', 'fb450.png', 'fb505.png', 'fb522.png', 'fb612.png',
            'fb650.png', 'fb704.png', 'fb777.png', 'fb820.png', 'fb901.png', 'fb999.png',
            'fb1200.png', 'fb1337.png', 'fb1500.png', 'fb1700.png', 'fb1822.png', 'fb1999.png'
        ];

        function getUiIconByKey(key) {
            let hash = 0;
            for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
            const index = Math.abs(hash) % UIIconPool.length;
            return `assets/ui/${UIIconPool[index]}`;
        }

        function playUISound(key, volume = 0.35) {
            const snd = UISounds[key];
            if (!snd) return;
            try {
                snd.pause();
                snd.currentTime = 0;
                snd.volume = volume;
                snd.play().catch(() => {});
            } catch (_) {}
        }

        function xpNeededForLevel(level) {
            return Math.floor(50 * Math.pow(1.3, Math.max(0, level - 1)));
        }

        function progressionToPoints(prog) {
            let points = prog.xp || 0;
            for (let lvl = 1; lvl < (prog.level || 1); lvl++) points += xpNeededForLevel(lvl);
            return Math.max(0, points);
        }

        function pointsToProgression(points) {
            let lvl = 1;
            let remaining = Math.max(0, points);
            let req = xpNeededForLevel(lvl);
            while (remaining >= req) {
                remaining -= req;
                lvl++;
                req = xpNeededForLevel(lvl);
            }
            return { level: lvl, xp: remaining, nextXp: req };
        }

        // --- SAVE SYSTEM ---
        const SaveSystem = {
            data: { shards: 0, unlockedChars: ['ronin', 'lancer', 'bruiser', 'sniper', 'bomber', 'seeker'], unlockedSkins: ['default'], unlockedArtifacts: ['none'], selectedArtifact: 'none', starterSlotUnlocked: false, selectedStarterModule: 'none', stats: { totalKills: 0, runsPlayed: 0, bossesDefeated: 0, totalDamage: 0, objectivesCompleted: 0 } },
            async init() {
                // Initialize Local Storage First
                try {
                    const local = localStorage.getItem('bots_save_v6');
                    if (local) {
                        const parsed = JSON.parse(local);
                        this.data = { ...this.data, ...parsed, stats: { ...this.data.stats, ...(parsed.stats || {}) } };
                        if (!Array.isArray(this.data.unlockedArtifacts) || this.data.unlockedArtifacts.length === 0) this.data.unlockedArtifacts = ['none'];
                        if (!this.data.selectedArtifact || !this.data.unlockedArtifacts.includes(this.data.selectedArtifact)) this.data.selectedArtifact = this.data.unlockedArtifacts[0];
                        if (!this.data.selectedStarterModule) this.data.selectedStarterModule = 'none';
                    } else {
                        this.data.shards = 500; // New player bonus!
                        this.saveLocal();
                    }
                } catch(e) {}

                this.updateMenuUI();

                if (isOfflineMode) {
                    const dot = document.getElementById('sys-auth-dot'); const text = document.getElementById('sys-auth-text');
                    dot.classList.remove('bg-emerald-500'); dot.classList.add('bg-rose-500', 'animate-pulse');
                    text.innerText = "LOCAL MODE";
                    return;
                }

                try { await signInAnonymously(auth); } catch(e) { console.warn("Auth failed", e); isOfflineMode = true; return; }

                onAuthStateChanged(auth, async (user) => {
                    currentUser = user;
                    const dot = document.getElementById('sys-auth-dot'); const text = document.getElementById('sys-auth-text');
                    if (user) {
                        dot.classList.remove('bg-rose-500', 'animate-pulse'); dot.classList.add('bg-emerald-500');
                        text.innerText = "CLOUD SYNCED";
                        await this.loadCloud();
                    } else {
                        dot.classList.remove('bg-emerald-500'); dot.classList.add('bg-rose-500', 'animate-pulse');
                        text.innerText = "OFFLINE";
                    }
                });
            },
            saveLocal() {
                try { localStorage.setItem('bots_save_v6', JSON.stringify(this.data)); } catch(e){}
            },
            async loadCloud() {
                if (!currentUser || isOfflineMode) return;
                try {
                    const saveRef = doc(db, 'artifacts', 'bots_v6', 'users', currentUser.uid);
                    const snap = await getDoc(saveRef);
                    if (snap.exists()) {
                        const cloudData = snap.data();
                        // Merge logic: Take the highest shard count and combine arrays to prevent local wipes
                        this.data.shards = Math.max(this.data.shards, cloudData.shards || 0);
                        this.data.unlockedChars = [...new Set([...this.data.unlockedChars, ...(cloudData.unlockedChars || [])])];
                        this.data.unlockedSkins = [...new Set([...this.data.unlockedSkins, ...(cloudData.unlockedSkins || [])])];
                        this.data.unlockedArtifacts = [...new Set([...(this.data.unlockedArtifacts || ['none']), ...(cloudData.unlockedArtifacts || [])])];
                        this.data.selectedArtifact = cloudData.selectedArtifact && this.data.unlockedArtifacts.includes(cloudData.selectedArtifact) ? cloudData.selectedArtifact : (this.data.selectedArtifact || 'none');
                        this.data.starterSlotUnlocked = this.data.starterSlotUnlocked || !!cloudData.starterSlotUnlocked;
                        this.data.selectedStarterModule = cloudData.selectedStarterModule || this.data.selectedStarterModule || 'none';
                        this.data.stats.totalKills = Math.max(this.data.stats.totalKills, cloudData.stats?.totalKills || 0);
                        this.saveLocal();
                    } else {
                        await setDoc(saveRef, this.data);
                    }
                    this.updateMenuUI();
                } catch(e) { console.error("Cloud load failed", e); }
            },
            async save() {
                this.saveLocal();
                if (!currentUser || isOfflineMode) return;
                try {
                    const saveRef = doc(db, 'artifacts', 'bots_v6', 'users', currentUser.uid);
                    await setDoc(saveRef, this.data, { merge: true });
                } catch(e) {}
            },
            awardShards(amount) {
                if(isNaN(amount)) return;
                this.data.shards += amount;
                this.save();
                this.updateMenuUI();
            },
            unlock(type, id, cost) {
                const arr = type === 'char' ? this.data.unlockedChars : this.data.unlockedSkins;
                if (this.data.shards >= cost && !arr.includes(id)) {
                    this.data.shards -= cost;
                    arr.push(id);
                    this.save();
                    this.updateMenuUI();
                    return true;
                }
                return false;
            },
            unlockArtifact(id) {
                if (!ARTIFACTS[id]) return false;
                if (!this.data.unlockedArtifacts.includes(id)) {
                    this.data.unlockedArtifacts.push(id);
                    if (!this.data.selectedArtifact || this.data.selectedArtifact === 'none') this.data.selectedArtifact = id;
                    this.save();
                    this.updateMenuUI();
                    return true;
                }
                return false;
            },
            cycleArtifact() {
                const list = this.data.unlockedArtifacts.filter(id => ARTIFACTS[id]);
                if (!list.length) return;
                const curr = Math.max(0, list.indexOf(this.data.selectedArtifact));
                this.data.selectedArtifact = list[(curr + 1) % list.length];
                this.save();
                this.updateMenuUI();
            },
            cycleStarterModule() {
                if (!this.data.starterSlotUnlocked) {
                    if (this.data.shards < 900) return false;
                    this.data.shards -= 900;
                    this.data.starterSlotUnlocked = true;
                    this.data.selectedStarterModule = 'dmg_up';
                    this.save();
                    this.updateMenuUI();
                    return true;
                }
                const idx = STARTER_MODULES.findIndex(m => m.id === this.data.selectedStarterModule);
                const next = STARTER_MODULES[(Math.max(0, idx) + 1) % STARTER_MODULES.length];
                this.data.selectedStarterModule = next.id;
                this.save();
                this.updateMenuUI();
                return true;
            },
            updateMenuUI() {
                document.getElementById('menu-shards-display').innerText = this.data.shards;
                const selectedArtifact = ARTIFACTS[this.data.selectedArtifact] || ARTIFACTS.none;
                const artifactName = selectedArtifact.name || 'None';
                const artifactEl = document.getElementById('menu-artifact-name');
                if (artifactEl) artifactEl.innerText = artifactName;
                const artifactDescEl = document.getElementById('menu-artifact-desc');
                if (artifactDescEl) artifactDescEl.innerText = selectedArtifact.desc || 'No bonus.';
                const starterNameEl = document.getElementById('menu-starter-name');
                const starterDescEl = document.getElementById('menu-starter-desc');
                if (starterNameEl && starterDescEl) {
                    if (!this.data.starterSlotUnlocked) {
                        starterNameEl.innerText = 'Locked';
                        starterDescEl.innerText = 'Unlock for 900 shards to start each run with a module.';
                    } else {
                        const starter = STARTER_MODULES.find(m => m.id === this.data.selectedStarterModule) || STARTER_MODULES[0];
                        starterNameEl.innerText = starter.name;
                        starterDescEl.innerText = starter.desc;
                    }
                }
                document.querySelectorAll('.char-card').forEach(card => {
                    const id = card.getAttribute('data-char');
                    if (this.data.unlockedChars.includes(id)) {
                        card.classList.remove('locked-item');
                        const overlay = card.querySelector('.locked-overlay');
                        if (overlay) overlay.style.display = 'none';
                    } else { card.classList.add('locked-item'); }
                });
                document.querySelectorAll('.skin-btn').forEach(btn => {
                    const id = btn.getAttribute('data-skin');
                    if (this.data.unlockedSkins.includes(id)) {
                        btn.classList.remove('locked-item');
                        const span = btn.querySelector('span.text-sky-300');
                        if(span) span.remove();
                    } else { btn.classList.add('locked-item'); }
                });
            }
        };

        // --- P2P WEBRTC HYBRID MULTIPLAYER ---
        const Party = {
            id: null, isHost: false, data: null, unsub: null, 
            remotePlayers: {}, // { uid: { x, y, hp, maxHp, charId, skin, name, targetX, targetY, lastUpdate } }
            peer: null, connections: {},
            fallbackInterval: null, useFallback: false,

            generateCode() {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let code = ''; for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                return code;
            },
            getDocRef(code) { return doc(db, 'artifacts', 'bots_v6', 'parties', code); },

            async host() {
                if (isOfflineMode || !currentUser) { showSysMsg("CLOUD CONNECTION REQUIRED FOR CO-OP", "text-rose-400", "bg-rose-500/10"); return; }
                const code = this.generateCode();
                
                this.initPeer(code);

                const charId = document.querySelector('.char-card.selected').getAttribute('data-char');
                const skin = document.querySelector('.skin-btn.selected').getAttribute('data-skin');

                try {
                    await setDoc(this.getDocRef(code), {
                        host: currentUser.uid, status: 'LOBBY', seed: Math.floor(Math.random() * 1000000),
                        players: { [currentUser.uid]: { name: `Host_${code.substring(0,2)}`, charId, skin } }
                    });
                    this.id = code; this.isHost = true; this.startFirebaseListening();
                    this.setupLobbyUI(code, true);
                    showSysMsg("PARTY HOSTED SUCCESSFULLY");
                } catch(e) { showSysMsg("FAILED TO HOST", "text-rose-400", "bg-rose-500/10"); }
            },

            async join(code) {
                if (isOfflineMode || !currentUser || !code) return;
                code = code.toUpperCase();
                
                try {
                    const snap = await getDoc(this.getDocRef(code));
                    if (!snap.exists() || snap.data().status !== 'LOBBY' || Object.keys(snap.data().players).length >= 4) {
                        showSysMsg("SESSION UNAVAILABLE OR FULL", "text-rose-400", "bg-rose-500/10"); return;
                    }

                    this.initPeer(code + "_" + currentUser.uid.substring(0,5));

                    const charId = document.querySelector('.char-card.selected').getAttribute('data-char');
                    const skin = document.querySelector('.skin-btn.selected').getAttribute('data-skin');

                    await updateDoc(this.getDocRef(code), {
                        [`players.${currentUser.uid}`]: { name: `Ally_${currentUser.uid.substring(0,3)}`, charId, skin }
                    });

                    this.id = code; this.isHost = false; this.startFirebaseListening();
                    this.setupLobbyUI(code, false);
                    showSysMsg("JOINED SESSION");
                } catch(e) { showSysMsg("FAILED TO JOIN", "text-rose-400", "bg-rose-500/10"); }
            },

            setupLobbyUI(code, isHost) {
                document.getElementById('party-view-select').classList.add('hidden');
                document.getElementById('party-view-lobby').classList.remove('hidden');
                document.getElementById('lobby-code-display').innerText = code;
                document.getElementById('btn-party-text').innerText = `PARTY: ${code}`;
                document.getElementById('btn-open-party').classList.add('party-active-glow');
                
                if (isHost) {
                    document.getElementById('btn-start-party').classList.remove('hidden');
                    document.getElementById('lobby-status-text').innerText = "Waiting for others to join...";
                } else {
                    document.getElementById('btn-start-party').classList.add('hidden');
                    document.getElementById('lobby-status-text').innerText = "Awaiting Host to start...";
                    document.getElementById('btn-start').innerText = "WAITING FOR HOST...";
                    document.getElementById('btn-start').classList.add('opacity-50', 'pointer-events-none');
                }
            },

            // WebRTC Init
            initPeer(peerId) {
                if (this.peer) this.peer.destroy();
                // Using Google's free STUN servers to bypass NATs
                this.peer = new Peer(peerId, { config: {'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }]} });
                
                this.peer.on('open', (id) => { console.log('My WebRTC ID is: ' + id); });
                this.peer.on('error', (err) => { 
                    console.warn('WebRTC Error:', err); 
                    this.useFallback = true; 
                    showSysMsg("P2P FAILED. USING CLOUD RELAY.", "text-yellow-400", "bg-yellow-500/10");
                });

                this.peer.on('connection', (conn) => {
                    this.connections[conn.peer] = conn;
                    conn.on('data', (data) => this.handleNetworkData(conn.peer, data));
                    conn.on('close', () => delete this.connections[conn.peer]);
                });
            },

            startFirebaseListening() {
                if (this.unsub) this.unsub();
                this.unsub = onSnapshot(this.getDocRef(this.id), (snap) => {
                    if (!snap.exists()) { this.leave(); return; }
                    this.data = snap.data();

                    if (this.data.status === 'CLOSED') { showSysMsg("SESSION CLOSED", "text-yellow-400", "bg-yellow-500/10"); this.leave(); return; }

                    // Update Lobby
                    if (!document.getElementById('party-view-lobby').classList.contains('hidden')) {
                        const list = document.getElementById('lobby-player-list'); list.innerHTML = '';
                        for (let uid in this.data.players) {
                            const p = this.data.players[uid]; const isMe = uid === currentUser.uid; const isH = uid === this.data.host;
                            list.innerHTML += `<li class="flex justify-between items-center bg-white/5 px-3 py-2 rounded border border-white/5">
                                <span class="${isMe ? 'text-sky-400 font-bold' : 'text-slate-300'}">${isH ? '👑 ' : ''}${p.name}</span>
                                <span class="text-xs text-slate-500 uppercase">${p.charId}</span></li>`;
                        }
                    }

                    // Host Triggered Start
                    if (this.data.status === 'PLAYING' && state.status === 'MENU') {
                        document.getElementById('modal-party').classList.add('hidden');
                        
                        // If not host, connect to host WebRTC
                        if (!this.isHost && !this.useFallback) {
                            const conn = this.peer.connect(this.id); // Host ID is always the code
                            conn.on('open', () => {
                                this.connections[this.id] = conn;
                                conn.on('data', (data) => this.handleNetworkData(this.id, data));
                            });
                        }

                        startGame(this.data.seed);
                    }

                    // Handle Cloud Fallback Data (if WebRTC fails)
                    if (state.status === 'PLAYING' && this.useFallback && this.data.live_coords) {
                        for(let uid in this.data.live_coords) {
                            if (uid !== currentUser.uid && this.data.players[uid]) {
                                this.updateRemotePlayer(uid, this.data.players[uid], this.data.live_coords[uid]);
                            }
                        }
                    }

                    if (state.status === 'PLAYING') this.syncSharedXp();
                });
            },

            handleNetworkData(peerId, data) {
                // Determine UID from peerId (Host is code, clients are code_uid)
                let uid = peerId === this.id ? this.data.host : peerId.split('_')[1];
                if (uid && this.data && this.data.players[uid]) {
                    this.updateRemotePlayer(uid, this.data.players[uid], data);
                }
                
                // If Host, relay to other clients
                if (this.isHost) {
                    for(let c in this.connections) {
                        if (c !== peerId) this.connections[c].send(data);
                    }
                }
            },

            updateRemotePlayer(uid, staticData, liveData) {
                if (!this.remotePlayers[uid]) {
                    this.remotePlayers[uid] = { ...staticData, x: liveData.x, y: liveData.y, targetX: liveData.x, targetY: liveData.y, hp: liveData.hp, maxHp: liveData.maxHp, xpPoints: liveData.xpPoints || 0 };
                } else {
                    const rp = this.remotePlayers[uid];
                    rp.targetX = liveData.x; rp.targetY = liveData.y; rp.hp = liveData.hp; rp.maxHp = liveData.maxHp; rp.xpPoints = liveData.xpPoints || rp.xpPoints || 0;
                    rp.lastUpdate = state.gameTime;
                }
                if (state.status === 'PLAYING') this.syncSharedXpRealtime();
                this.updatePartyHUD();
            },

            async triggerStart() {
                if (!this.isHost || !this.id) return;
                try { await updateDoc(this.getDocRef(this.id), { status: 'PLAYING' }); } catch(e){}
            },

            startSyncing() {
                if (!this.id || !currentUser) return;
                
                // Tick interval: 50ms for WebRTC (20fps), 150ms for Cloud Fallback
                const tickRate = this.useFallback ? 150 : 50;

                this.fallbackInterval = setInterval(async () => {
                    if (state.status !== 'PLAYING') return;
                    const payload = {
                        x: Math.floor(state.player.x),
                        y: Math.floor(state.player.y),
                        hp: Math.floor(state.player.stats.hp),
                        maxHp: Math.floor(state.player.stats.maxHp),
                        xpPoints: progressionToPoints(state.player.progression),
                        uid: currentUser.uid
                    };
                    
                    if (!this.useFallback && Object.keys(this.connections).length > 0) {
                        // Blast WebRTC
                        for(let c in this.connections) this.connections[c].send(payload);
                    } else if (this.useFallback) {
                        // Slow Cloud Polling
                        try { await updateDoc(this.getDocRef(this.id), { [`live_coords.${currentUser.uid}`]: payload }); } catch(e) {}
                    }
                }, tickRate);
            },

            syncSharedXp() {
                if (!this.data || !this.data.live_coords || !this.data.players) return;
                const values = [];
                for (let uid in this.data.players) {
                    const live = this.data.live_coords[uid];
                    if (live && typeof live.xpPoints === 'number') values.push(Math.max(0, live.xpPoints));
                }
                if (values.length < 2) return;
                const avg = Math.floor(values.reduce((a, b) => a + b, 0) / values.length);
                applySharedProgression(pointsToProgression(avg));
            },

            syncSharedXpRealtime() {
                const values = [progressionToPoints(state.player.progression)];
                for (let uid in this.remotePlayers) {
                    const rp = this.remotePlayers[uid];
                    if (typeof rp.xpPoints === 'number') values.push(Math.max(0, rp.xpPoints));
                }
                if (values.length < 2) return;
                const avg = Math.floor(values.reduce((a, b) => a + b, 0) / values.length);
                applySharedProgression(pointsToProgression(avg));
            },

            updatePartyHUD() {
                const container = document.getElementById('hud-party-list');
                container.innerHTML = '';
                for (let uid in this.remotePlayers) {
                    const rp = this.remotePlayers[uid];
                    const hpPercent = Math.max(0, rp.hp / rp.maxHp) * 100;
                    container.innerHTML += `
                        <div class="flex flex-col items-end gap-1 mb-1 md:mb-2 bg-black/40 p-1.5 md:p-2 rounded border border-white/10 backdrop-blur-md">
                            <span class="text-[8px] md:text-[10px] font-mono text-purple-300 tracking-widest">${rp.name}</span>
                            <div class="w-16 md:w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div class="h-full bg-purple-500 transition-all duration-300" style="width: ${hpPercent}%"></div>
                            </div>
                        </div>`;
                }
            },

            async leave() {
                if (!this.id || !currentUser) return;
                try {
                    if (this.isHost) await updateDoc(this.getDocRef(this.id), { status: 'CLOSED' });
                    else await updateDoc(this.getDocRef(this.id), { [`players.${currentUser.uid}`]: deleteField() });
                } catch(e) {}
                this.cleanup();
            },

            cleanup() {
                if (this.unsub) this.unsub();
                if (this.fallbackInterval) clearInterval(this.fallbackInterval);
                if (this.peer) this.peer.destroy();
                this.id = null; this.isHost = false; this.data = null; this.remotePlayers = {}; this.connections = {}; this.useFallback = false;
                
                document.getElementById('party-view-select').classList.remove('hidden');
                document.getElementById('party-view-lobby').classList.add('hidden');
                document.getElementById('btn-party-text').innerText = "CO-OP";
                document.getElementById('btn-open-party').classList.remove('party-active-glow');
                document.getElementById('btn-start').innerText = "INITIATE SOLO SEQUENCE →";
                document.getElementById('btn-start').classList.remove('opacity-50', 'pointer-events-none');
                document.getElementById('modal-party').classList.add('hidden');
            }
        };

        // --- GAME ENGINE & LOGIC ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        let vw, vh;

        function resize() { vw = window.innerWidth; vh = window.innerHeight; canvas.width = vw; canvas.height = vh; }
        window.addEventListener('resize', resize); resize();

        function splitmix32(a) {
            return function() {
                a |= 0; a = a + 0x9e3779b9 | 0;
                let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
                t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
                return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
            }
        }
        let seededRandom = Math.random;

        const UI = {
            menu: document.getElementById('screen-menu'), hud: document.getElementById('screen-hud'),
            levelup: document.getElementById('screen-levelup'), gameover: document.getElementById('screen-gameover'),
            tracker: document.getElementById('screen-tracker'), trackerList: document.getElementById('tracker-list'),
            xpFill: document.getElementById('hud-xp-fill'), hpFill: document.getElementById('hud-hp-fill'),
            shieldContainer: document.getElementById('hud-shield-container'), shieldFill: document.getElementById('hud-shield-fill'), 
            dashFill: document.getElementById('hud-dash-fill'),
            levelText: document.getElementById('hud-level'), timeText: document.getElementById('hud-time'), 
            killsText: document.getElementById('hud-kills'), comboText: document.getElementById('hud-combo'), 
            layerText: document.getElementById('hud-layer'), objectiveText: document.getElementById('hud-objective'),
            levelupTitle: document.getElementById('levelup-title'), levelupSubtitle: document.getElementById('levelup-subtitle'),
            upgradeContainer: document.getElementById('upgrade-container'),
            bossContainer: document.getElementById('boss-hp-container'), bossHpFill: document.getElementById('boss-hp-fill'), 
            bossName: document.getElementById('boss-name')
        };

        const UPGRADES_DB = createUpgradesDb(CHARACTERS);

        const MathHelper = {
            dist: (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y),
            angle: (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x),
            lerp: (start, end, amt) => (1 - amt) * start + amt * end,
            rand: (min, max) => seededRandom() * (max - min) + min,
            drawPoly: (ctx, x, y, r, sides, rot) => {
                if(sides === 0) { ctx.arc(x, y, r, 0, Math.PI*2); return; }
                for (let i = 0; i < sides; i++) {
                    const a = rot + (i * 2 * Math.PI / sides);
                    i === 0 ? ctx.moveTo(x + r*Math.cos(a), y + r*Math.sin(a)) : ctx.lineTo(x + r*Math.cos(a), y + r*Math.sin(a));
                }
                ctx.closePath();
            }
        };

        function rollGamblerChambers(maxAmmo) {
            const out = [];
            for (let i = 0; i < maxAmmo; i++) {
                const roll = seededRandom();
                if (roll < 0.58) out.push('white');
                else if (roll < 0.86) out.push('green');
                else out.push('red');
            }
            return out;
        }

        class GameState {
            constructor() { this.status = 'MENU'; }
            reset(charId, skin, seed, runOptions = {}) {
                this.status = 'MENU'; this.gameTime = 0; this.timeScale = 1.0;
                
                if (seed !== undefined) seededRandom = splitmix32(seed);
                else seededRandom = Math.random;

                const baseStat = CHARACTERS[charId] || CHARACTERS['bruiser'];

                this.player = {
                    charId: charId, skin: skin, color: baseStat.color, x: 0, y: 0, radius: 15,
                    stats: JSON.parse(JSON.stringify(baseStat.stats)), 
                    effects: baseStat.effects ? JSON.parse(JSON.stringify(baseStat.effects)) : {}, 
                    summons: {}, upgradesLog: {}, ownedUpgrades: new Set(),
                    progression: { level: 1, xp: 0, nextXp: 50, kills: 0 },
                    lastMoveDirX: 1, lastMoveDirY: 0,
                    lastAttackTime: 0, combo: 1.0, comboTimer: 0,
                    dashActive: 0, dashCooldownTimer: 0, shield: 0, beamTarget: null, shieldRechargeTimer: 0,
                    runStats: { damageDealt: 0, damageTaken: 0, healingReceived: 0, projectilesFired: 0, critsLanded: 0, statusEffectsApplied: 0, dodgesTriggered: 0, highestDps: 0, currentSecDmg: 0, lastSecTime: 0, synergiesActivated: 0, bossKills: 0 },
                    gambler: null
                };
                
                if(charId === 'architect') {
                    this.player.summons.attackDrones = 3;
                    this.player.summons.harvesterDrones = 1;
                    this.player.summons.healDrones = 1;
                }
                if (charId === 'gambler') {
                    this.player.gambler = {
                        maxAmmo: 6,
                        ammo: 6,
                        fireCursor: 0,
                        reloadDuration: 1.65,
                        reloadTimer: 0,
                        reloading: false,
                        ringSpin: 0,
                        chambers: rollGamblerChambers(6)
                    };
                }
                this.player.stats.hp = this.player.stats.maxHp;

                this.enemies = []; this.projectiles = []; this.gems = []; 
                this.particles = []; this.floatingTexts = []; this.orbitals = []; this.drones = []; this.blades = [];
                this.hazards = []; this.blackholes = []; this.orbitalStrikes = [];
                
                this.spawner = { nextSpawn: 0, spawnRate: 1.0, waveMult: 1.0, bossesSpawned: 0, elitesSpawned: 0, lastAnomalyKills: 0 };
                this.camera = { x: 0, y: 0 }; this.bossActive = null;
                this.antiIdle = { timer: 0, lastX: 0, lastY: 0 };
                
                this.obstacles = [];
                for(let i=0; i<40; i++) {
                    let ox = MathHelper.rand(-1800, 1800);
                    let oy = MathHelper.rand(-1800, 1800);
                    if(Math.hypot(ox, oy) > 200) this.obstacles.push({x: ox, y: oy, radius: MathHelper.rand(30, 100)});
                }
                this.worldEvent = { active: null, timer: 0 };
                this.layer = 1;
                this.maxLayer = 8;
                this.layerPhase = 'COMBAT';
                this.visualTheme = 'crimson';
                this.nextBossAtKills = 180;
                this.objective = { active: null, lastRollAt: 0, completed: 0 };
                this.pendingBonusPicks = 0;
                this.ascension = ASCENSION_MODS[runOptions.ascensionId || 'none'] || ASCENSION_MODS.none;
                this.contract = RUN_CONTRACTS[runOptions.contractId || 'none'] || RUN_CONTRACTS.none;
                this.contractComplete = this.contract.id === 'none';
                this.masteryChosen = false;
                this.activeHazard = null;
                this.signalTower = null;
                this.necroHusks = [];
                this.difficulty = { scalar: 1, lastKills: 0, lastCheckAt: 0 };

                const startArtifact = SaveSystem.data.selectedArtifact || 'none';
                this.player.artifactId = startArtifact;
                if (ARTIFACTS[startArtifact]) {
                    ARTIFACTS[startArtifact].apply(this.player);
                }
                if (SKIN_PASSIVES[skin]) SKIN_PASSIVES[skin](this.player);
                if (CLASS_QUIRKS[charId]) CLASS_QUIRKS[charId].apply(this.player);
                if (this.contract.id === 'glass') {
                    this.player.stats.maxHp *= 0.9;
                    this.player.stats.hp = Math.min(this.player.stats.hp, this.player.stats.maxHp);
                }
                const starterModule = SaveSystem.data.starterSlotUnlocked ? SaveSystem.data.selectedStarterModule : 'none';
                if (starterModule && starterModule !== 'none') {
                    const up = UPGRADES_DB.find(u => u.id === starterModule);
                    if (up) {
                        up.apply(this.player);
                        this.player.ownedUpgrades.add(up.id);
                        this.player.upgradesLog[up.title] = (this.player.upgradesLog[up.title] || 0) + 1;
                    }
                }
                this.player.stats.hp = Math.min(this.player.stats.hp, this.player.stats.maxHp);
            }
        }

        const state = new GameState();
        let commandQueue = []; 
        const adminState = { authenticated: false, godMode: false };

        function applySharedProgression(sharedProg) {
            if (!Party.id || !state.player || !sharedProg) return;
            const p = state.player;
            const levelDelta = Math.max(0, sharedProg.level - p.progression.level);
            p.progression.level = sharedProg.level;
            p.progression.xp = sharedProg.xp;
            p.progression.nextXp = sharedProg.nextXp;
            if (levelDelta > 0 && state.status === 'PLAYING') {
                state.pendingBonusPicks += Math.max(0, levelDelta - 1);
                triggerLevelUp();
            }
        }

        const keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowleft: false, arrowdown: false, arrowright: false, " ": false };
        window.addEventListener('keydown', e => { if(!e.key) return; const k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; });
        window.addEventListener('keyup', e => { if(!e.key) return; const k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; });
        window.addEventListener('keydown', e => {
            if((e.key === 'u' || e.key === 'U') && state.status === 'PLAYING') {
                const tr = UI.tracker;
                if(tr.classList.contains('translate-x-full')) { tr.classList.remove('translate-x-full', 'hidden'); updateTrackerUI(); } 
                else { tr.classList.add('translate-x-full'); setTimeout(() => tr.classList.add('hidden'), 500); }
            }
        });

        function clearInputs() {
            for(let k in keys) keys[k] = false;
            commandQueue = [];
        }

        function processInputs() {
            if (state.status !== 'PLAYING') return;
            let dirX = 0, dirY = 0;
            if (keys.w || keys.arrowup) dirY -= 1;
            if (keys.s || keys.arrowdown) dirY += 1;
            if (keys.a || keys.arrowleft) dirX -= 1;
            if (keys.d || keys.arrowright) dirX += 1;

            if (dirX !== 0 && dirY !== 0) { const len = Math.sqrt(dirX*dirX + dirY*dirY); dirX /= len; dirY /= len; }
            if (dirX !== 0 || dirY !== 0) {
                state.player.lastMoveDirX = dirX;
                state.player.lastMoveDirY = dirY;
                commandQueue.push({ type: 'MOVE', dirX, dirY });
            }

            if (keys[" "] && state.player.dashCooldownTimer <= 0 && state.player.stats.dashCooldown > 0) {
                const dashX = (dirX !== 0 || dirY !== 0) ? dirX : state.player.lastMoveDirX;
                const dashY = (dirX !== 0 || dirY !== 0) ? dirY : state.player.lastMoveDirY;
                commandQueue.push({ type: 'DASH', dirX: dashX, dirY: dashY }); 
                keys[" "] = false; 
            }
        }

        function triggerLevelUp() {
            state.status = 'LEVELUP'; UI.levelup.classList.remove('hidden'); UI.upgradeContainer.innerHTML = '';
            UI.levelupTitle.innerText = 'SYSTEM UPGRADE';
            UI.levelupSubtitle.innerText = 'Select augmentation';
            const rarityTable = {
                common: { weight: 1.0, badge: 'COMMON', fx: '' },
                rare: { weight: 0.6, badge: 'RARE', fx: 'border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.2)]' },
                epic: { weight: 0.28, badge: 'EPIC', fx: 'border-fuchsia-400/40 shadow-[0_0_24px_rgba(217,70,239,0.25)]' },
                legendary: { weight: 0.12, badge: 'LEGENDARY', fx: 'border-amber-300/50 shadow-[0_0_26px_rgba(251,191,36,0.3)]' }
            };
            const pullByRarity = (pool) => {
                if (!pool.length) return null;
                let total = 0;
                for (const u of pool) total += (rarityTable[u.rarity || 'common']?.weight || 1);
                let roll = seededRandom() * total;
                for (const u of pool) {
                    roll -= (rarityTable[u.rarity || 'common']?.weight || 1);
                    if (roll <= 0) return u;
                }
                return pool[pool.length - 1];
            };
            
            let validUpgrades = UPGRADES_DB.filter(u => {
                if (u.excludeWeapons && u.excludeWeapons.includes(state.player.stats.weaponType)) return false;
                if (u.reqClass && !u.reqClass.includes(state.player.charId)) return false;
                let reqMet = !u.req || u.req.every(r => state.player.ownedUpgrades.has(r));
                let notMaxed = !u.unique || !state.player.ownedUpgrades.has(u.id);
                return reqMet && notMaxed;
            });
            
            let synergies = validUpgrades.filter(u => u.req && u.req.length > 0 && !u.isForbidden);
            let regulars = validUpgrades.filter(u => !u.req && !u.isForbidden);
            let forbiddens = validUpgrades.filter(u => u.isForbidden);
            
            let shuffledRegs = [...regulars];
            let shuffledSyns = [...synergies].sort(() => 0.5 - seededRandom());
            
            let selected = [];
            if (shuffledSyns.length > 0 && seededRandom() < 0.65) {
                selected.push(shuffledSyns[0]);
                const first = pullByRarity(shuffledRegs); if (first) selected.push(first);
                const remaining = shuffledRegs.filter(u => !selected.includes(u));
                const second = pullByRarity(remaining); if (second) selected.push(second);
            } else {
                const first = pullByRarity(shuffledRegs); if (first) selected.push(first);
                const remaining1 = shuffledRegs.filter(u => !selected.includes(u));
                const second = pullByRarity(remaining1); if (second) selected.push(second);
                const remaining2 = shuffledRegs.filter(u => !selected.includes(u));
                const third = pullByRarity(remaining2); if (third) selected.push(third);
            }

            if(forbiddens.length > 0 && seededRandom() < 0.05) selected[selected.length - 1] = forbiddens[Math.floor(seededRandom() * forbiddens.length)];
            selected.sort(() => 0.5 - seededRandom());

            selected.forEach(upg => {
                const isSyn = upg.req && upg.req.length > 0;
                const rarity = upg.rarity || 'common';
                const rarityData = rarityTable[rarity] || rarityTable.common;
                let cardClasses = `upgrade-card rounded-2xl p-4 md:p-6 cursor-pointer w-[45%] md:w-[30%] flex flex-col items-center text-center shrink-0 `;
                if(upg.isForbidden) cardClasses += `forbidden-card`;
                else if (isSyn) cardClasses += `border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]`;
                else cardClasses += ` ${rarityData.fx}`;

                const btn = document.createElement('div');
                btn.className = cardClasses;
                
                let icon = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>';
                if(isSyn) icon = '<svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
                if(upg.isForbidden) icon = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
                const iconImage = getUiIconByKey(upg.id + upg.title);

                btn.innerHTML = `
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full mb-3 flex items-center justify-center bg-white/5 border border-white/10 ${upg.color} relative overflow-hidden">
                        <img src="${iconImage}" class="upgrade-pixel-icon" alt="">
                        <div class="absolute inset-0 flex items-center justify-center">${icon}</div>
                    </div>
                    ${(!isSyn && !upg.isForbidden) ? `<span class="text-[8px] md:text-[10px] font-bold tracking-widest text-slate-300 mb-2 uppercase bg-white/5 px-2 py-0.5 rounded">${rarityData.badge}</span>` : ''}
                    ${isSyn ? '<span class="text-[8px] md:text-[10px] font-bold tracking-widest text-yellow-400 mb-2 uppercase bg-yellow-500/10 px-2 py-0.5 rounded">Synergy Discovered</span>' : ''}
                    ${upg.isForbidden ? '<span class="text-[8px] md:text-[10px] font-bold tracking-widest text-red-400 mb-2 uppercase bg-red-900/30 px-2 py-0.5 rounded">Anomaly Detected</span>' : ''}
                    <h3 class="text-sm md:text-xl font-bold ${upg.color} mb-1 md:mb-2">${upg.title}</h3>
                    <p class="text-slate-400 text-[9px] md:text-sm font-mono leading-relaxed">${upg.desc}</p>
                `;
                btn.onclick = () => {
                    upg.apply(state.player);
                    state.player.upgradesLog[upg.title] = (state.player.upgradesLog[upg.title] || 0) + 1;
                    state.player.ownedUpgrades.add(upg.id);
                    if(isSyn) state.player.runStats.synergiesActivated++;
                    syncSummons();
                    clearInputs();
                    if (state.pendingBonusPicks > 0) {
                        state.pendingBonusPicks--;
                        triggerLevelUp();
                    } else {
                        state.status = 'PLAYING'; UI.levelup.classList.add('hidden'); updateHUD();
                    }
                };
                UI.upgradeContainer.appendChild(btn);
            });
        }

        function generateBuildName(p) {
            let synCount = p.runStats.synergiesActivated;
            if (p.effects.corrupted && p.stats.maxHp === 1) return "Quantum Butcher";
            if (synCount >= 5) return "Infinite Arsenal";
            if (p.effects.bloodplague && p.stats.weaponType === 'spin') return "Neon Executioner";
            if (p.effects.bloodplague) return "The Blood Engine";
            if (p.effects.singularity >= 3) return "The Walking Singularity";
            if (p.summons.orbitals >= 4) return "Orbital Nightmare";
            if (p.stats.bounce >= 4) return "The Ricochet God";
            if (p.effects.frostfire) return "Frostburn Reactor";
            if (p.stats.weaponType === 'beam' && p.effects.burn) return "Heat Death Protocol";
            if (p.summons.drones >= 3) return "The Swarm King";
            if (p.stats.critChance >= 0.5) return "The Crit Machine";
            if (p.stats.dodge >= 0.3) return "Phantom Walker";
            return "Survivor.exe";
        }

        function startObjective() {
            const pool = OBJECTIVE_POOL.filter(o => !state.objective.active || o.id !== state.objective.active.id);
            const pick = pool[Math.floor(seededRandom() * pool.length)];
            state.objective.active = {
                ...pick,
                progress: 0,
                failOnDamage: pick.metric === 'noDamage',
                baseDamageTaken: state.player.runStats.damageTaken || 0
            };
            showSysMsg(`OBJECTIVE: ${pick.title} - ${pick.desc}`, 'text-amber-300', 'bg-amber-500/10 border-amber-500/20');
        }

        function completeObjective() {
            const obj = state.objective.active;
            if (!obj) return;
            state.objective.completed++;
            state.objective.active = null;
            state.objective.lastRollAt = state.gameTime;
            SaveSystem.data.stats.objectivesCompleted = (SaveSystem.data.stats.objectivesCompleted || 0) + 1;

            const lockedArtifacts = Object.keys(ARTIFACTS).filter(id => id !== 'none' && !SaveSystem.data.unlockedArtifacts.includes(id));
            if (lockedArtifacts.length > 0) {
                const unlocked = lockedArtifacts[Math.floor(seededRandom() * lockedArtifacts.length)];
                SaveSystem.unlockArtifact(unlocked);
                showSysMsg(`ARTIFACT UNLOCKED: ${ARTIFACTS[unlocked].name}`, 'text-fuchsia-300', 'bg-fuchsia-500/10 border-fuchsia-500/20');
            } else {
                SaveSystem.awardShards(40);
                showSysMsg('OBJECTIVE COMPLETE: +40 SHARDS', 'text-emerald-300', 'bg-emerald-500/10 border-emerald-500/20');
            }
            SaveSystem.save();
        }

        function failObjective() {
            if (!state.objective.active) return;
            showSysMsg('OBJECTIVE FAILED', 'text-rose-300', 'bg-rose-500/10 border-rose-500/20');
            state.objective.active = null;
            state.objective.lastRollAt = state.gameTime;
        }

        function openChoiceEvent(title, subtitle, choices) {
            state.status = 'LEVELUP';
            UI.levelup.classList.remove('hidden');
            UI.upgradeContainer.innerHTML = '';
            UI.levelupTitle.innerText = title;
            UI.levelupSubtitle.innerText = subtitle;

            choices.forEach(choice => {
                const btn = document.createElement('div');
                btn.className = 'upgrade-card rounded-2xl p-5 md:p-6 cursor-pointer w-[45%] md:w-[30%] flex flex-col items-center text-center shrink-0 border border-white/15 hover:border-white/30';
                const eventIcon = getUiIconByKey(choice.title);
                btn.innerHTML = `
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full mb-3 flex items-center justify-center bg-white/5 border border-white/10 text-sky-300 relative overflow-hidden">
                        <img src="${eventIcon}" class="upgrade-pixel-icon" alt="">
                        <svg class="w-6 h-6 absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 class="text-sm md:text-xl font-bold text-white mb-1 md:mb-2">${choice.title}</h3>
                    <p class="text-slate-400 text-[9px] md:text-sm font-mono leading-relaxed">${choice.desc}</p>
                `;
                btn.onclick = () => {
                    choice.apply();
                    UI.levelup.classList.add('hidden');
                    UI.levelupTitle.innerText = 'SYSTEM UPGRADE';
                    UI.levelupSubtitle.innerText = 'Select augmentation';
                    state.status = 'PLAYING';
                    updateHUD();
                };
                UI.upgradeContainer.appendChild(btn);
            });
        }

        function triggerMythicGate(forceSuccess = false) {
            if (forceSuccess || seededRandom() < 0.01) {
                SaveSystem.unlockArtifact('apex_relic');
                showSysMsg('APEX RELIC UNLOCKED', 'text-yellow-300', 'bg-yellow-500/10 border-yellow-500/20');
            } else {
                SaveSystem.awardShards(150);
                showSysMsg('MYTHIC GATE FAILED: +150 SHARDS', 'text-fuchsia-300', 'bg-fuchsia-500/10 border-fuchsia-500/20');
            }
        }

        function triggerClassMasteryChoice() {
            const p = state.player;
            if (state.masteryChosen) return;
            const pool = CLASS_MASTERY[p.charId] || CLASS_MASTERY.default;
            openChoiceEvent('CLASS SPECIALIZATION', 'Choose one mastery path', pool.map(opt => ({
                title: opt.title,
                desc: opt.desc,
                apply: () => {
                    opt.apply(p);
                    state.masteryChosen = true;
                    showSysMsg(`MASTERY UNLOCKED: ${opt.title}`, 'text-sky-300', 'bg-sky-500/10 border-sky-500/20');
                }
            })));
        }

        function triggerFusionForge() {
            const keys = Object.keys(state.player.upgradesLog || {});
            if (keys.length < 2) {
                showSysMsg('FUSION FORGE FAILED: NEED 2 MODULES', 'text-rose-300', 'bg-rose-500/10 border-rose-500/20');
                return;
            }
            const a = keys[Math.floor(seededRandom() * keys.length)];
            let b = a;
            while (b === a) b = keys[Math.floor(seededRandom() * keys.length)];
            state.player.stats.damage *= 1.12;
            state.player.stats.fireRate *= 1.1;
            state.player.stats.projectileSpeed *= 1.08;
            showSysMsg(`FUSION FORGE: ${a} + ${b}`, 'text-violet-300', 'bg-violet-500/10 border-violet-500/20');
        }

        function triggerSignalTowerEvent() {
            state.signalTower = {
                x: state.player.x + MathHelper.rand(-260, 260),
                y: state.player.y + MathHelper.rand(-260, 260),
                radius: 150,
                timer: 22,
                progress: 0,
                target: 14
            };
            showSysMsg('SIGNAL TOWER ACTIVE: HOLD THE ZONE', 'text-cyan-300', 'bg-cyan-500/10 border-cyan-500/20');
        }

        function triggerBazaarEvent() {
            openChoiceEvent(
                'BAZAAR BREACH',
                'Trade risk for power',
                [
                    {
                        title: 'Blood Contract',
                        desc: 'Lose 15% max HP, gain 2 immediate card picks.',
                        apply: () => {
                            state.player.stats.maxHp = Math.max(1, state.player.stats.maxHp * 0.85);
                            state.player.stats.hp = Math.min(state.player.stats.hp, state.player.stats.maxHp);
                            state.pendingBonusPicks += 2;
                            triggerLevelUp();
                        }
                    },
                    {
                        title: 'Arsenal Cache',
                        desc: 'Gain 2 immediate card picks.',
                        apply: () => {
                            state.pendingBonusPicks += 2;
                            triggerLevelUp();
                        }
                    },
                    {
                        title: 'Mythic Gate',
                        desc: '1% chance for Apex Relic, otherwise +150 shards.',
                        apply: () => triggerMythicGate()
                    },
                    {
                        title: 'Fusion Forge',
                        desc: 'Fuse two owned modules into a hybrid stat spike.',
                        apply: () => triggerFusionForge()
                    },
                    {
                        title: 'Signal Tower',
                        desc: 'Start a defense event for premium rewards.',
                        apply: () => triggerSignalTowerEvent()
                    }
                ]
            );
        }

        function advanceToNextLayer() {
            if (state.layer < state.maxLayer) {
                state.layer++;
                state.layerPhase = 'COMBAT';
                state.nextBossAtKills = state.player.progression.kills + (130 + state.layer * 70);
                state.spawner.waveMult *= 1.28;
                state.spawner.spawnRate = Math.max(0.045, state.spawner.spawnRate * 0.9);
                if (state.layer >= 2) state.visualTheme = 'void';
                if (state.layer >= 5) state.visualTheme = 'abyss';
                state.player.stats.maxHp += 25;
                state.player.stats.hp = Math.min(state.player.stats.maxHp, state.player.stats.hp + 25);
                showSysMsg(`LAYER ${state.layer} ONLINE`, 'text-indigo-300', 'bg-indigo-500/10 border-indigo-500/20');

                const eventRoll = seededRandom();
                if (eventRoll < 0.2) triggerBazaarEvent();
                else if (eventRoll < 0.3) triggerSignalTowerEvent();
            } else {
                // Endless apex state after full clear.
                state.layerPhase = 'COMBAT';
                state.nextBossAtKills = state.player.progression.kills + 220;
                state.spawner.waveMult *= 1.12;
                showSysMsg('APEX CLEARED: ENDLESS THREAT MODE', 'text-yellow-300', 'bg-yellow-500/10 border-yellow-500/20');
            }
        }

        function updateTrackerUI() {
            UI.trackerList.innerHTML = '';
            for(let [title, count] of Object.entries(state.player.upgradesLog)) {
                UI.trackerList.innerHTML += `<div class="flex justify-between border-b border-white/5 py-2"><span>${title}</span><span class="text-sky-400 font-bold">LVL ${count}</span></div>`;
            }
            if(Object.keys(state.player.upgradesLog).length === 0) UI.trackerList.innerHTML = '<div class="text-slate-500 italic">No upgrades acquired.</div>';
        }

        function updateHUD() {
            const p = state.player;
            UI.xpFill.style.width = `${(p.progression.xp / p.progression.nextXp) * 100}%`;
            UI.hpFill.style.width = `${Math.max(0, (p.stats.hp / p.stats.maxHp)) * 100}%`;
            
            // Shield Logic
            if(p.effects.maxShield > 0) {
                UI.shieldContainer.classList.remove('hidden'); UI.shieldContainer.classList.add('flex');
                UI.shieldFill.style.width = `${Math.min(100, (p.shield / p.effects.maxShield) * 100)}%`; 
            } else { UI.shieldContainer.classList.add('hidden'); UI.shieldContainer.classList.remove('flex'); }

            // Dash Logic
            if (p.stats.dashCooldown > 0) {
                let dashProgress = p.dashCooldownTimer <= 0 ? 100 : 100 - ((p.dashCooldownTimer / p.stats.dashCooldown) * 100);
                UI.dashFill.style.width = `${dashProgress}%`;
                UI.dashFill.className = p.dashCooldownTimer <= 0 ? "h-full bg-sky-300 w-full transition-all duration-100 shadow-[0_0_8px_rgba(125,211,252,0.8)]" : "h-full bg-slate-500 w-full transition-all duration-100";
            }

            UI.levelText.innerText = `LVL ${p.progression.level}`;
            UI.killsText.innerText = `${p.progression.kills} KILLS`;
            const layerLabel = state.layerPhase === 'BOSS' ? `${state.layer}.5 BOSS` : `${state.layer}.0`;
            UI.layerText.innerText = `LAYER ${layerLabel}`;
            if (state.objective.active) {
                const obj = state.objective.active;
                const progress = obj.metric === 'noDamage' ? Math.floor(Math.max(0, obj.target - obj.timer)) : Math.floor(obj.progress);
                UI.objectiveText.innerText = `${obj.title}: ${progress}/${obj.target} (${Math.ceil(obj.timer)}s)`;
            } else {
                UI.objectiveText.innerText = 'OBJECTIVE: STANDBY';
            }
            const m = Math.floor(state.gameTime / 60).toString().padStart(2, '0');
            const s = Math.floor(state.gameTime % 60).toString().padStart(2, '0');
            UI.timeText.innerText = `${m}:${s}`;

            if(p.stats.hasCombo) {
                UI.comboText.classList.remove('hidden');
                UI.comboText.innerText = `COMBO x${p.combo.toFixed(1)}`;
                UI.comboText.style.opacity = p.comboTimer > 0 ? 1 : 0.3;
            }

            if(state.bossActive) {
                UI.bossContainer.classList.remove('hidden'); UI.bossContainer.classList.add('flex');
                UI.bossHpFill.style.width = `${Math.max(0, state.bossActive.hp / state.bossActive.maxHp) * 100}%`;
            } else {
                UI.bossContainer.classList.add('hidden'); UI.bossContainer.classList.remove('flex');
            }
        }

        function syncSummons() {
            const p = state.player;
            const reqOrbitals = p.summons.orbitals || 0;
            while(state.orbitals.length < reqOrbitals) state.orbitals.push({ angle: seededRandom() * Math.PI*2, dist: 70, radius: 6, dmg: 15 });
            const attack = p.summons.attackDrones || 0;
            const harvest = p.summons.harvesterDrones || 0;
            const heal = p.summons.healDrones || 0;
            const reqDrones = (p.summons.drones || 0) + attack + harvest + heal;
            while(state.drones.length < reqDrones) {
                let role = 'attack';
                const idx = state.drones.length;
                if (idx < attack) role = 'attack';
                else if (idx < attack + harvest) role = 'harvester';
                else if (idx < attack + harvest + heal) role = 'healer';
                const orbitRadius = role === 'harvester' ? 74 : (role === 'healer' ? 92 : 58);
                state.drones.push({
                    x: p.x, y: p.y, targetX: p.x, targetY: p.y, lastFire: 0,
                    cooldown: role === 'healer' ? 1.2 : 1.0,
                    role,
                    orbitOffset: (Math.PI * 2 * idx) / Math.max(1, reqDrones),
                    orbitRadius
                });
            }
            if (state.drones.length > reqDrones) state.drones.length = reqDrones;
            const reqBlades = p.summons.blades || 0;
            while(state.blades.length < reqBlades) state.blades.push({ angle: seededRandom() * Math.PI*2, dist: 90, length: 45, damage: 30 });
        }

        function spawnEnemy(isSwarm = false) {
            const angle = seededRandom() * Math.PI * 2;
            const dist = isSwarm ? MathHelper.rand(400, 800) : Math.max(vw, vh) * 0.6; 
            state.spawner.waveMult = 1.0 + (state.gameTime / 60) * 0.5; 
            
            let maxTier = Math.min(TIERS.length - 1, Math.floor(state.gameTime / 50)); 
            let tierIdx = isSwarm ? Math.floor(seededRandom() * Math.min(2, maxTier + 1)) : Math.max(0, Math.floor(seededRandom() * (maxTier + 1)));
            if (!isSwarm && seededRandom() < 0.3) tierIdx = maxTier; 
            
            const tier = TIERS[tierIdx];
            const shape = SHAPES[Math.floor(seededRandom() * SHAPES.length)];
            const layerMult = 1.0 + (state.layer - 1) * 0.22;
            const rangedChance = Math.min(0.5, 0.1 + state.layer * 0.05);
            const isRanged = seededRandom() < rangedChance;
            
            state.enemies.push({
                x: state.player.x + Math.cos(angle) * dist, y: state.player.y + Math.sin(angle) * dist,
                radius: shape.radius * (1 + tierIdx*0.1), sides: shape.sides, color: tier.color, type: shape.type,
                hp: 20 * tier.hpM * state.spawner.waveMult * layerMult * (state.ascension?.hpMult || 1) * (state.difficulty?.scalar || 1),
                maxHp: 20 * tier.hpM * state.spawner.waveMult * layerMult * (state.ascension?.hpMult || 1) * (state.difficulty?.scalar || 1),
                speed: 120 * tier.spdM * MathHelper.rand(0.8, 1.2) * (state.layer >= 2 ? 1.12 : 1.0) * (0.94 + (state.difficulty?.scalar || 1) * 0.1), damage: 5 * tier.dmgM * state.spawner.waveMult * layerMult * (state.ascension?.dmgMult || 1) * (state.difficulty?.scalar || 1),
                erratic: shape.erratic, freezeTimer: 0, bleedTimer: 0, burnTimer: 0, burnStacks: 0, poisonTimer: 0,
                isBoss: false, isElite: false, isRanged, preferredRange: MathHelper.rand(220, 420), shootCd: MathHelper.rand(1.2, 2.2), shootTimer: MathHelper.rand(0.1, 1.0), vx: 0, vy: 0, timer: 0, xp: tier.xp
            });
        }

        function spawnElite() {
            const angle = seededRandom() * Math.PI * 2;
            const dist = Math.max(vw, vh) * 0.5;
            const t = ELITE_TYPES[Math.floor(seededRandom() * ELITE_TYPES.length)];
            const layerMult = state.layer >= 2 ? 1.5 : 1.0;
            
            state.enemies.push({
                x: state.player.x + Math.cos(angle) * dist, y: state.player.y + Math.sin(angle) * dist,
                radius: 15 * t.scale, sides: SHAPES.find(s=>s.type === t.type).sides, color: t.color,
                hp: 150 * state.spawner.waveMult * t.hpMult * layerMult * (state.ascension?.hpMult || 1) * (state.difficulty?.scalar || 1),
                maxHp: 150 * state.spawner.waveMult * t.hpMult * layerMult * (state.ascension?.hpMult || 1) * (state.difficulty?.scalar || 1),
                speed: 100 * t.speedMult * (state.layer >= 2 ? 1.1 : 1.0) * (0.94 + (state.difficulty?.scalar || 1) * 0.1), damage: 20 * state.spawner.waveMult * t.dmgMult * layerMult * (state.ascension?.dmgMult || 1) * (state.difficulty?.scalar || 1),
                freezeTimer: 0, bleedTimer: 0, burnTimer: 0, burnStacks: 0, poisonTimer: 0,
                isBoss: false, isElite: true, behavior: t.behavior, timer: 0, vx: 0, vy: 0
            });
            state.spawner.elitesSpawned++;
            state.floatingTexts.push({ x: state.player.x, y: state.player.y - 50, text: "ELITE DETECTED", life: 2.0, color: '#f87171', vy: -10, size: 14 });
        }

        function spawnBoss(layer) {
            const angle = seededRandom() * Math.PI * 2;
            const dist = 500; // Spawn closer
            const waveScale = 1.0 + (layer - 1) * 0.65 + (state.spawner.bossesSpawned * 0.1);
            const t = BOSS_TEMPLATES[state.spawner.bossesSpawned % BOSS_TEMPLATES.length];
            
            const boss = {
                x: state.player.x + Math.cos(angle) * dist, y: state.player.y + Math.sin(angle) * dist,
                radius: 60, sides: t.sides, color: t.color, behavior: t.behavior,
                hp: Math.max(t.hpMode * waveScale * 1.85, 5000 + (layer * 2200)) * (state.ascension?.hpMult || 1) * Math.max(0.9, state.difficulty?.scalar || 1), maxHp: Math.max(t.hpMode * waveScale * 1.85, 5000 + (layer * 2200)) * (state.ascension?.hpMult || 1) * Math.max(0.9, state.difficulty?.scalar || 1),
                speed: (60 + layer * 3) * (0.96 + (state.difficulty?.scalar || 1) * 0.06), damage: t.dmgBase * waveScale * 1.8 * (state.ascension?.dmgMult || 1) * Math.max(0.9, state.difficulty?.scalar || 1),
                freezeTimer: 0, bleedTimer: 0, burnTimer: 0, burnStacks: 0, poisonTimer: 0,
                isBoss: true, name: `LAYER ${layer}.5 - ${t.name}`,
                state: 'chase', timer: 0, vx: 0, vy: 0, maxPhase: 2, phase: 1, spawnShield: 1.75
            };
            
            state.enemies.push(boss); state.bossActive = boss; state.spawner.bossesSpawned++;
            UI.bossName.innerText = boss.name;
        }

        function createProjectile(x, y, angle, stats, effects, color, isEnemy = false, type = 'normal') {
            state.projectiles.push({
                x, y, vx: Math.cos(angle) * stats.projectileSpeed, vy: Math.sin(angle) * stats.projectileSpeed,
                radius: (type === 'giant' ? 8 : (type === 'mini' ? 2 : 4)) * (stats.scale || 1), 
                damage: stats.damage, life: isEnemy ? 4.0 : (stats.attackRange / Math.max(1, stats.projectileSpeed)),
                effects: { ...effects }, hitTargets: new Set(),
                pierceLeft: stats.pierce || 0, bounceLeft: stats.bounce || 0, homing: stats.homing || 0, 
                explodeRadius: stats.explodeRadius || 0, color, isEnemy
            });
            if(!isEnemy) state.player.runStats.projectilesFired++;
        }

        function triggerProcChain(e, dmg, isCrit) {
            const p = state.player;
            // Daggers
            if (p.effects.dagger && seededRandom() < 0.15) {
                for(let i=0; i<p.effects.dagger; i++) {
                    createProjectile(p.x, p.y, MathHelper.angle(p, e) + MathHelper.rand(-0.2, 0.2), { projectileSpeed: 800, damage: p.stats.damage * 0.5, attackRange: 600 }, { bleed: 1 }, '#d6d3d1');
                }
            }
            // Missiles
            if (p.effects.missile && seededRandom() < 0.10) {
                for(let i=0; i<p.effects.missile; i++) {
                    createProjectile(p.x, p.y, Math.PI*1.5 + MathHelper.rand(-0.5, 0.5), { projectileSpeed: 600, damage: p.stats.damage * 3.0, attackRange: 1000, homing: 0.2, explodeRadius: 40 }, {}, '#ef4444');
                }
            }
        }

        function triggerKillProc(e) {
            const p = state.player;
            if (p.effects.wisp) {
                explosion(e.x, e.y, 80 + (p.effects.wisp * 20), p.stats.damage * 2.5 * p.effects.wisp, 'rgba(253, 186, 116, 0.5)');
                state.particles.push({ type: 'vertical_beam', x: e.x, y: e.y, life: 0.4, maxLife: 0.4, color: '#fdba74', radius: 80 });
            }
            if (p.effects.gasoline) {
                state.hazards.push({ x: e.x, y: e.y, radius: 100 + (p.effects.gasoline * 20), timer: 3.0, damage: 0, isPlayerHazard: true, burnStacks: p.effects.gasoline });
            }
        }

        function emitSparkBurst(x, y, color, count = 10, speed = 220, size = 2.5, life = 0.28) {
            for (let i = 0; i < count; i++) {
                const a = MathHelper.rand(0, Math.PI * 2);
                const v = MathHelper.rand(speed * 0.35, speed);
                state.particles.push({
                    x, y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v,
                    life: MathHelper.rand(life * 0.7, life * 1.15),
                    maxLife: life,
                    color,
                    size: MathHelper.rand(size * 0.6, size * 1.4)
                });
            }
        }

        function applyDamage(e, baseDmg, colorOverride = null) {
            const p = state.player;
            let dmg = baseDmg * p.combo;
            if(p.stats.bossDmg && (e.isBoss || e.isElite)) dmg *= p.stats.bossDmg;
            if(p.effects.executioner && e.maxHp > 0 && (e.hp / e.maxHp) <= 0.35) dmg *= (1 + p.effects.executioner);
            if (e.isBoss && e.spawnShield > 0) return;
            if (e.isBoss) dmg = Math.min(dmg, Math.max(120, e.maxHp * 0.035));
            
            let isCrit = seededRandom() < p.stats.critChance;
            if(isCrit) { dmg *= p.stats.critMult; p.runStats.critsLanded++; }
            e.hp -= dmg;
            p.runStats.damageDealt += dmg;
            p.runStats.currentSecDmg += dmg;
            
            triggerProcChain(e, dmg, isCrit);

            if(p.stats.hasCombo) { 
                let maxCombo = 1.0 + ((p.stats.comboLevel || 1) * 0.5);
                p.combo = Math.min(maxCombo, p.combo + 0.05); 
                p.comboTimer = 2.0; 
            }

            if(p.stats.lifesteal > 0 && !e.isBoss && !isCrit) { 
                let heal = dmg * p.stats.lifesteal;
                if(p.stats.hp < p.stats.maxHp) { 
                    p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal); 
                    p.runStats.healingReceived += heal;
                }
            }

            if(seededRandom() < 0.3 || isCrit) {
                let textColor = colorOverride || (isCrit ? '#fde047' : '#ffffff');
                let size = isCrit ? 14 : 10;
                state.floatingTexts.push({ x: e.x + MathHelper.rand(-10,10), y: e.y - e.radius - 5, text: Math.floor(dmg).toString(), life: 0.5, color: textColor, vy: -20, size });
            }
            const hitColor = colorOverride || (isCrit ? '#fde047' : '#e2e8f0');
            emitSparkBurst(e.x, e.y, hitColor, isCrit ? 18 : 9, isCrit ? 320 : 220, isCrit ? 3.8 : 2.5, isCrit ? 0.38 : 0.26);
            state.particles.push({
                x: e.x, y: e.y, vx: 0, vy: 0, life: isCrit ? 0.2 : 0.13, maxLife: isCrit ? 0.2 : 0.13,
                color: hitColor, size: e.radius * (isCrit ? 1.8 : 1.1), isPulse: true
            });
        }

        function explosion(x, y, radius, dmg, color = 'rgba(239, 68, 68, 0.4)') {
            state.particles.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: color, size: radius, isPulse: true });
            state.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, maxLife: 0.45, color: color, size: radius * 1.3, isPulse: true });
            emitSparkBurst(x, y, color.includes('rgba') ? '#fb923c' : color, Math.max(14, Math.floor(radius / 8)), 360, 3.2, 0.45);
            for(let e of state.enemies) if(MathHelper.dist({x,y}, e) < radius + e.radius) applyDamage(e, dmg, '#fb923c');
        }

        function takePlayerDamage(rawDmg, isTrueDamage = false) {
            const p = state.player;
            if (adminState.godMode && state.status === 'PLAYING') return;
            
            if (!isTrueDamage) {
                if(seededRandom() < p.stats.dodge) { 
                    state.floatingTexts.push({ x: p.x, y: p.y - 20, text: "DODGE", life: 0.5, color: '#94a3b8', vy: -20, size: 10 }); 
                    p.runStats.dodgesTriggered++;
                    if (p.effects.ghostVolley) {
                        for(let i=0; i<3; i++) createProjectile(p.x, p.y, MathHelper.rand(0, Math.PI*2), {projectileSpeed: 500, damage: p.stats.damage, attackRange: 400}, p.effects, 'rgba(255,255,255,0.5)');
                    }
                    return; 
                }
                
                p.combo = 1.0; 
                let finalArmor = p.stats.armor;
                if (p.effects.orbitalFortress) finalArmor += (p.summons.orbitals || 0) * 5;

                let finalDmg = Math.max(1, rawDmg - finalArmor);
                
                if(p.shield > 0) { 
                    if(p.shield >= finalDmg) { p.shield -= finalDmg; p.runStats.damageTaken += finalDmg; p.shieldRechargeTimer = 3.0; return; } 
                    else { finalDmg -= p.shield; p.shield = 0; p.shieldRechargeTimer = 3.0; } 
                }
                p.stats.hp -= finalDmg;
                p.runStats.damageTaken += finalDmg;
                emitSparkBurst(p.x, p.y, '#fb7185', 8, 180, 2.6, 0.24);
            } else {
                p.shield = 0;
                p.combo = 1.0;
                p.stats.hp -= rawDmg;
                p.runStats.damageTaken += rawDmg;
                state.floatingTexts.push({ x: p.x, y: p.y - 40, text: "CRITICAL HIT", life: 1.5, color: '#ef4444', vy: -10, size: 16 });
                emitSparkBurst(p.x, p.y, '#ef4444', 18, 320, 3.8, 0.45);
            }

            if (p.stats.hp <= 0) gameOver();
        }

        function updateEngine(dtReal) {
            if (state.status !== 'PLAYING') return;
            const p = state.player;
            
            const dt = dtReal * state.timeScale;
            state.gameTime += dtReal;

            // DPS Calc
            if (Math.floor(state.gameTime) > p.runStats.lastSecTime) {
                if (p.runStats.currentSecDmg > p.runStats.highestDps) p.runStats.highestDps = p.runStats.currentSecDmg;
                p.runStats.currentSecDmg = 0;
                p.runStats.lastSecTime = Math.floor(state.gameTime);
            }

            if(p.comboTimer > 0) p.comboTimer -= dtReal; else p.combo = 1.0;
            if(p.dashCooldownTimer > 0) p.dashCooldownTimer -= dtReal;
            if(p.dashActive > 0) p.dashActive -= dtReal;
            if (p.charId === 'gambler' && p.gambler) {
                p.gambler.ringSpin += dtReal * 1.6;
                if (p.gambler.reloading) {
                    p.gambler.reloadTimer -= dtReal;
                    if (p.gambler.reloadTimer <= 0) {
                        p.gambler.reloading = false;
                        p.gambler.ammo = p.gambler.maxAmmo;
                        p.gambler.fireCursor = 0;
                        p.gambler.chambers = rollGamblerChambers(p.gambler.maxAmmo);
                        if (p.effects.gamblerAces) {
                            p.gambler.chambers[0] = 'red';
                            if (p.gambler.maxAmmo > 1) p.gambler.chambers[1] = 'red';
                        }
                        showSysMsg('GAMBLER RELOAD COMPLETE', 'text-sky-300', 'bg-sky-500/10 border-sky-500/20');
                    }
                }
            }

            if(p.effects.corrupted) {
                p.stats.hp -= (p.stats.maxHp * 0.02) * dtReal;
                if(p.stats.hp <= 0) gameOver();
            }

            function constrainToBounds(obj) {
                if(obj.x < -2000 + obj.radius) obj.x = -2000 + obj.radius;
                if(obj.x > 2000 - obj.radius) obj.x = 2000 - obj.radius;
                if(obj.y < -2000 + obj.radius) obj.y = -2000 + obj.radius;
                if(obj.y > 2000 - obj.radius) obj.y = 2000 - obj.radius;
            }

            function collideWithObstacles(obj) {
                for (let obs of state.obstacles) {
                    let d = MathHelper.dist(obj, obs);
                    if (d < obj.radius + obs.radius) {
                        let over = (obj.radius + obs.radius) - d;
                        let a = MathHelper.angle(obs, obj);
                        obj.x += Math.cos(a) * over; obj.y += Math.sin(a) * over;
                    }
                }
            }

            let movedThisFrame = false;
            while(commandQueue.length > 0) {
                const cmd = commandQueue.shift();
                if(cmd.type === 'MOVE' && p.dashActive <= 0) {
                    p.x += cmd.dirX * (p.stats.speed || 200) * dtReal; 
                    p.y += cmd.dirY * (p.stats.speed || 200) * dtReal;
                    movedThisFrame = true;
                } else if (cmd.type === 'DASH') {
                    p.dashActive = 0.2; p.dashCooldownTimer = p.stats.dashCooldown;
                    p.dashDirX = cmd.dirX; p.dashDirY = cmd.dirY;
                    for (let i = 0; i < 14; i++) {
                        state.particles.push({
                            x: p.x, y: p.y,
                            vx: MathHelper.rand(-140, 140), vy: MathHelper.rand(-140, 140),
                            life: 0.28, color: 'rgba(148, 163, 184, 0.28)', size: MathHelper.rand(2, 6)
                        });
                    }
                    emitSparkBurst(p.x, p.y, '#93c5fd', 12, 250, 2.6, 0.26);
                    if(p.stats.dashExplosion) explosion(p.x, p.y, p.stats.dashExplosion * 50, p.stats.damage * 2, 'rgba(250, 204, 21, 0.5)');
                    movedThisFrame = true;
                }
            }

            if(p.dashActive > 0) {
                p.x += p.dashDirX * p.stats.speed * 4 * dtReal; p.y += p.dashDirY * p.stats.speed * 4 * dtReal;
                state.particles.push({x: p.x, y: p.y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, color: 'rgba(255,255,255,0.1)', size: p.radius});
                if (seededRandom() < 0.65) {
                    state.particles.push({
                        x: p.x + MathHelper.rand(-4, 4),
                        y: p.y + MathHelper.rand(-4, 4),
                        vx: -p.dashDirX * MathHelper.rand(80, 180),
                        vy: -p.dashDirY * MathHelper.rand(80, 180),
                        life: 0.18,
                        maxLife: 0.18,
                        color: 'rgba(125,211,252,0.55)',
                        size: MathHelper.rand(2, 4)
                    });
                }
                if(p.dashActive <= 0 && p.stats.dashExplosion) explosion(p.x, p.y, p.stats.dashExplosion * 60, p.stats.damage * 3, 'rgba(250, 204, 21, 0.6)');
            }

            collideWithObstacles(p);
            constrainToBounds(p);

            // Anti-Standstill System (60 Seconds Wait -> Evisceration)
            if (state.gameTime % 1 < dtReal) {
                if (!movedThisFrame || MathHelper.dist(p, {x: state.antiIdle.lastX, y: state.antiIdle.lastY}) < 30) {
                    state.antiIdle.timer++;
                    if (state.antiIdle.timer === 50) state.floatingTexts.push({ x: p.x, y: p.y - 40, text: "MOVEMENT REQUIRED", life: 1.5, color: '#facc15', vy: -10, size: 12 });
                    if (state.antiIdle.timer >= 60) {
                        state.particles.push({ type: 'vertical_beam', x: p.x, y: p.y, life: 0.5, maxLife: 0.5, color: '#ef4444', radius: 300 });
                        explosion(p.x, p.y, 300, 0, 'rgba(239, 68, 68, 0.8)'); 
                        takePlayerDamage(999999, true); 
                        state.floatingTexts.push({ x: p.x, y: p.y - 60, text: "EVISCERATED", life: 2.0, color: '#ef4444', vy: -20, size: 24 });
                        state.antiIdle.timer = 0;
                    }
                } else { state.antiIdle.timer = 0; }
                state.antiIdle.lastX = p.x; state.antiIdle.lastY = p.y;
            }

            state.camera.x = MathHelper.lerp(state.camera.x, p.x - vw/2, 5 * dtReal);
            state.camera.y = MathHelper.lerp(state.camera.y, p.y - vh/2, 5 * dtReal);

            if(p.stats.regen > 0 && p.stats.hp < p.stats.maxHp && !p.effects.corrupted) {
                let heal = p.stats.regen * dtReal;
                p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal);
                p.runStats.healingReceived += heal;
            }
            
            // Shield Recharge
            if (p.effects.maxShield > 0) {
                if (p.shieldRechargeTimer > 0) p.shieldRechargeTimer -= dtReal;
                else if (p.shield < p.effects.maxShield) p.shield = Math.min(p.effects.maxShield, p.shield + (p.effects.maxShield * 0.1 * dtReal));
            }

            // Continuous Static Charge
            if (p.effects.lightning) {
                if (state.gameTime % 0.5 < dtReal) { // Throttle to 2 times a second
                    let nearest = null, minDist = 200;
                    for (let e of state.enemies) { let d = MathHelper.dist(p, e); if (d < minDist) { minDist = d; nearest = e; } }
                    if (nearest) {
                        applyDamage(nearest, p.stats.damage * 0.2 * p.effects.lightning, '#fef08a');
                        state.particles.push({x: p.x, y: p.y, targetX: nearest.x, targetY: nearest.y, life: 0.15, color: '#fef08a', isLine: true});
                    }
                }
            }

            // Summons
            let orbSpeed = 3 * state.timeScale;
            for(let i=0; i<state.orbitals.length; i++) {
                let orb = state.orbitals[i]; orb.angle += orbSpeed * dtReal;
                let targetAngle = orb.angle + (i * Math.PI * 2 / state.orbitals.length);
                let ox = p.x + Math.cos(targetAngle) * orb.dist; let oy = p.y + Math.sin(targetAngle) * orb.dist;
                for(let e of state.enemies) {
                    if(MathHelper.dist({x:ox, y:oy}, e) < orb.radius + e.radius && seededRandom() < 0.1) applyDamage(e, p.stats.damage * 0.5, '#38bdf8');
                }
                state.particles.push({x: ox, y: oy, vx: 0, vy: 0, life: 0.1, color: 'rgba(56,189,248,0.5)', size: orb.radius});
                
                if(p.effects.orbitalTurret && state.gameTime % 0.8 < dtReal) {
                     let target = state.enemies[Math.floor(seededRandom() * state.enemies.length)];
                     if(target && MathHelper.dist({x:ox, y:oy}, target) < 400) {
                         createProjectile(ox, oy, MathHelper.angle({x:ox, y:oy}, target), { projectileSpeed: 600, damage: p.stats.damage * 0.4, attackRange: 400, scale: 0.5 }, {}, '#67e8f9');
                     }
                }
            }
            for(let d of state.drones) {
                const orbitSpeed = d.role === 'harvester' ? 1.4 : (d.role === 'healer' ? 1.1 : 1.9);
                d.targetX = p.x + Math.cos(state.gameTime * orbitSpeed + (d.orbitOffset || 0)) * (d.orbitRadius || 60);
                d.targetY = p.y + Math.sin(state.gameTime * orbitSpeed + (d.orbitOffset || 0)) * (d.orbitRadius || 60);
                d.x = MathHelper.lerp(d.x, d.targetX, 3*dtReal); d.y = MathHelper.lerp(d.y, d.targetY, 3*dtReal);
                d.lastFire += dtReal;
                if (d.role === 'harvester') {
                    let nearestGem = null;
                    let nearestDist = 200;
                    for (const g of state.gems) {
                        const dg = MathHelper.dist(d, g);
                        if (dg < nearestDist) {
                            nearestDist = dg;
                            nearestGem = g;
                        }
                    }
                    if (nearestGem) {
                        const ag = MathHelper.angle(d, nearestGem);
                        const chaseSpeed = 260;
                        d.x += Math.cos(ag) * chaseSpeed * dtReal;
                        d.y += Math.sin(ag) * chaseSpeed * dtReal;
                        if (nearestDist < 22) {
                            const gained = nearestGem.value * (p.effects.harvestBoost || 1.2);
                            p.progression.xp += gained;
                            nearestGem.value = 0;
                        }
                    }
                } else if (d.role === 'healer') {
                    if (d.lastFire > d.cooldown) {
                        const heal = (6 + p.stats.regen) * (p.effects.healDroneRate || 1);
                        p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal);
                        p.runStats.healingReceived += heal;
                        d.lastFire = 0;
                    }
                } else if (d.lastFire > d.cooldown) {
                    let nearest = null, minDist = 400;
                    for (let e of state.enemies) { let dist = MathHelper.dist(d, e); if (dist < minDist) { minDist = dist; nearest = e; } }
                    if (nearest) {
                        const dmg = p.stats.damage * 0.36 * (p.effects.attackDroneBoost || 1);
                        createProjectile(d.x, d.y, MathHelper.angle(d, nearest), { projectileSpeed: 500, damage: dmg, attackRange: 400 }, {}, '#cbd5e1');
                        d.lastFire = 0;
                    }
                }
            }
            state.gems = state.gems.filter(g => (g.value || 0) > 0);

            for (let i = state.necroHusks.length - 1; i >= 0; i--) {
                const h = state.necroHusks[i];
                h.life -= dtReal;
                if (h.life <= 0) { state.necroHusks.splice(i, 1); continue; }
                const nearest = state.enemies.reduce((acc, e) => {
                    const d = MathHelper.dist(h, e);
                    return d < (acc.dist || 280) ? { e, dist: d } : acc;
                }, { e: null, dist: 280 }).e;
                if (nearest) {
                    const a = MathHelper.angle(h, nearest);
                    h.x += Math.cos(a) * 140 * dtReal;
                    h.y += Math.sin(a) * 140 * dtReal;
                    if (MathHelper.dist(h, nearest) < nearest.radius + 12) applyDamage(nearest, p.stats.damage * 0.5 * (p.effects.necroHuskDmg || 1), '#a78bfa');
                } else {
                    h.x = MathHelper.lerp(h.x, p.x, 1.5 * dtReal);
                    h.y = MathHelper.lerp(h.y, p.y, 1.5 * dtReal);
                }
            }
            let bladeSpeed = 10 * state.timeScale;
            for(let i=0; i<state.blades.length; i++) {
                let b = state.blades[i];
                b.angle += bladeSpeed * dtReal;
                b.x = p.x + Math.cos(b.angle) * b.dist;
                b.y = p.y + Math.sin(b.angle) * b.dist;
                for(let e of state.enemies) {
                    if((e.bladeHitTimer || 0) > 0) e.bladeHitTimer -= dtReal;
                    if(MathHelper.dist({x: b.x, y: b.y}, e) < e.radius + 20 && (e.bladeHitTimer || 0) <= 0) {
                        applyDamage(e, p.stats.damage * 1.5, '#f43f5e');
                        if (p.effects.bladeBleed) { e.bleedTimer = 4.0; p.runStats.statusEffectsApplied++; }
                        state.particles.push({x: e.x, y: e.y, vx: MathHelper.rand(-30,30), vy: MathHelper.rand(-30,30), life: 0.2, color: '#f43f5e', size: 4});
                        e.bladeHitTimer = 0.25; 
                    }
                }
            }

            // Progression: every .5 layer is a boss arena.
            if (state.layerPhase !== 'BOSS' && p.progression.kills >= state.nextBossAtKills && !state.bossActive) {
                state.layerPhase = 'BOSS';
                state.enemies = state.enemies.filter(e => e.isBoss);
                state.hazards = [];
                state.projectiles = state.projectiles.filter(pr => !pr.isEnemy);
                showSysMsg(`LAYER ${state.layer}.5 BREACH`, 'text-red-300', 'bg-red-500/10 border-red-500/20');
                spawnBoss(state.layer);
            }
            if (state.layerPhase !== 'BOSS' && p.progression.kills > 0 && p.progression.kills >= (state.spawner.elitesSpawned + 1) * 25 && !state.bossActive) spawnElite();
            if (p.progression.kills > 0 && p.progression.kills >= (state.spawner.lastAnomalyKills + 1) * 300 && !state.bossActive) {
                let events = ["TIME_DISTORTION", "BLOOD_MOON", "ION_STORM"];
                state.worldEvent.active = events[Math.floor(seededRandom() * events.length)];
                state.worldEvent.timer = 15;
                state.spawner.lastAnomalyKills++;
                state.floatingTexts.push({ x: p.x, y: p.y - 60, text: `ANOMALY: ${state.worldEvent.active.replace('_', ' ')}`, life: 3.0, color: '#facc15', vy: -20, size: 20 });
            }

            // Mid-run objectives cadence
            if (!state.objective.active && state.gameTime >= 45 && (state.gameTime - state.objective.lastRollAt) >= 90) {
                startObjective();
            }
            if (state.objective.active) {
                state.objective.active.timer -= dtReal;
                let obj = state.objective.active;
                if (obj.metric === 'noDamage') {
                    obj.progress = Math.max(0, obj.target - obj.timer);
                    if ((state.player.runStats.damageTaken || 0) > obj.baseDamageTaken) {
                        failObjective();
                        obj = state.objective.active;
                    }
                }
                if (obj && obj.timer <= 0 && obj.metric !== 'noDamage' && obj.progress < obj.target) {
                    failObjective();
                    obj = state.objective.active;
                }
                if (obj && obj.metric === 'noDamage' && obj.timer <= 0) completeObjective();
                else if (obj && obj.progress >= obj.target) completeObjective();
            }

            if (state.worldEvent.timer > 0) {
                state.worldEvent.timer -= dtReal;
                if (state.worldEvent.active === "TIME_DISTORTION") state.timeScale = 0.3;
                else state.timeScale = 1.0;
                if (state.worldEvent.active === "BLOOD_MOON" && Math.floor(state.worldEvent.timer * 10) % 2 === 0 && state.enemies.length < 300) spawnEnemy(true);
                if (state.worldEvent.active === "ION_STORM" && seededRandom() < 0.055) {
                    const hx = p.x + MathHelper.rand(-420, 420);
                    const hy = p.y + MathHelper.rand(-320, 320);
                    state.hazards.push({ x: hx, y: hy, radius: 95, timer: 1.2, damage: 16 * (state.ascension?.dmgMult || 1) });
                }
            } else { state.worldEvent.active = null; state.timeScale = 1.0; }

            if ((state.gameTime - state.difficulty.lastCheckAt) >= 5) {
                const dtWindow = Math.max(1, state.gameTime - state.difficulty.lastCheckAt);
                const killRate = (p.progression.kills - state.difficulty.lastKills) / dtWindow;
                const targetKillRate = 0.42 + state.layer * 0.07;
                let scalar = 0.9 + (killRate / Math.max(0.15, targetKillRate)) * 0.28;
                const hpRatio = p.stats.hp / Math.max(1, p.stats.maxHp);
                if (hpRatio < 0.35) scalar -= 0.14;
                else if (hpRatio > 0.85) scalar += 0.06;
                if (p.progression.level < state.layer * 2) scalar -= 0.08;
                state.difficulty.scalar = Math.max(0.85, Math.min(1.18, scalar));
                state.difficulty.lastKills = p.progression.kills;
                state.difficulty.lastCheckAt = state.gameTime;
            }

            if (state.signalTower) {
                const t = state.signalTower;
                t.timer -= dtReal;
                if (MathHelper.dist(p, t) < t.radius) t.progress += dtReal;
                if (Math.floor(t.timer * 10) % 6 === 0 && state.enemies.length < 260) spawnEnemy(true);
                if (t.progress >= t.target) {
                    SaveSystem.awardShards(180);
                    state.pendingBonusPicks += 1;
                    state.signalTower = null;
                    showSysMsg('SIGNAL TOWER SECURED: +180 SHARDS, +1 PICK', 'text-cyan-300', 'bg-cyan-500/10 border-cyan-500/20');
                } else if (t.timer <= 0) {
                    state.signalTower = null;
                    showSysMsg('SIGNAL TOWER LOST', 'text-rose-300', 'bg-rose-500/10 border-rose-500/20');
                }
            }

            if(!state.bossActive && state.layerPhase !== 'BOSS') {
                state.spawner.nextSpawn -= dt;
                if (state.spawner.nextSpawn <= 0) {
                    spawnEnemy();
                    state.spawner.spawnRate = Math.max(0.08, 1.0 - (state.gameTime / 300)); 
                    state.spawner.spawnRate = Math.max(0.04, state.spawner.spawnRate / ((state.ascension?.spawnMult || 1) * (state.difficulty?.scalar || 1)));
                    state.spawner.nextSpawn = state.spawner.spawnRate;
                }
            }

            for (let i = state.orbitalStrikes.length - 1; i >= 0; i--) {
                const s = state.orbitalStrikes[i];
                s.timer -= dtReal;
                if (s.timer > 0) continue;

                if (s.stage === 'telegraph') {
                    if (s.target && state.enemies.includes(s.target)) {
                        s.x = s.target.x;
                        s.y = s.target.y;
                    }
                    s.stage = 'beam';
                    s.timer = 0.45;
                    state.particles.push({ type: 'orbital_beam', x: s.x, y: s.y, life: 0.45, maxLife: 0.45, color: '#a3e635', radius: s.radius, startY: s.y - 360, target: s.target });
                    continue;
                }

                if (s.stage === 'beam') {
                    if (s.target && state.enemies.includes(s.target)) {
                        s.x = s.target.x;
                        s.y = s.target.y;
                    }
                    if (s.target && state.enemies.includes(s.target)) {
                        applyDamage(s.target, s.damage * 0.72, '#bef264');
                        if (s.effects.bleed) { s.target.bleedTimer = 4.0; p.runStats.statusEffectsApplied++; }
                        if (s.effects.poison) { s.target.poisonTimer = 4.0; p.runStats.statusEffectsApplied++; }
                        if (s.effects.freeze) { s.target.freezeTimer = 2.0; p.runStats.statusEffectsApplied++; }
                        if (s.effects.burn) { s.target.burnTimer = 3.0; s.target.burnStacks = (s.target.burnStacks || 0) + s.effects.burn; p.runStats.statusEffectsApplied++; }
                    }
                    state.particles.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.32, maxLife: 0.32, color: 'rgba(163, 230, 53, 0.72)', size: s.radius * 1.1, isPulse: true });
                    explosion(s.x, s.y, s.radius, s.damage * 0.36, 'rgba(163, 230, 53, 0.45)');
                    state.orbitalStrikes.splice(i, 1);
                }
            }

            // --- Combat Updates ---
            const now = state.gameTime;
            if (p.stats.weaponType === 'beam') {
                let nearest = null, minDist = p.stats.attackRange;
                for (let e of state.enemies) {
                    const d = MathHelper.dist(p, e);
                    if (d < minDist) { minDist = d; nearest = e; }
                }
                if (nearest) {
                    p.beamTarget = nearest;
                    const beamMult = p.effects.beamRamp ? (1.0 + Math.min(0.6, (1 - (minDist / Math.max(1, p.stats.attackRange))) * 0.6)) : 1.0;
                    applyDamage(nearest, p.stats.damage * dt * beamMult, p.color);
                    if(p.stats.lifesteal > 0 && seededRandom()<0.1) {
                        let heal = p.stats.damage * dt * p.stats.lifesteal;
                        p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal);
                        p.runStats.healingReceived += heal;
                    }
                } else { p.beamTarget = null; }
            } 
            else if (p.stats.weaponType === 'spin') {
                if (now - p.lastAttackTime > (1 / p.stats.fireRate)) {
                    for (let e of state.enemies) {
                        if (MathHelper.dist(p, e) <= p.stats.attackRange + e.radius) {
                            applyDamage(e, p.stats.damage, p.color);
                            if (p.effects.bleed) { e.bleedTimer = 4.0; p.runStats.statusEffectsApplied++; }
                            if (p.effects.poison) { e.poisonTimer = 4.0; p.runStats.statusEffectsApplied++; }
                            if (p.effects.freeze) { e.freezeTimer = 2.0; p.runStats.statusEffectsApplied++; }
                            if (p.effects.burn) { e.burnTimer = 3.0; e.burnStacks = (e.burnStacks||0) + p.effects.burn; p.runStats.statusEffectsApplied++; }
                        }
                    }
                    state.particles.push({ type: 'spin', playerAttached: true, radius: p.stats.attackRange, life: 0.3, maxLife: 0.3, color: p.color, angle: seededRandom() * Math.PI*2 });
                    p.lastAttackTime = now;
                }
            }
            else if (p.stats.weaponType === 'pulse') {
                if (now - p.lastAttackTime > (1 / p.stats.fireRate)) {
                    explosion(p.x, p.y, p.stats.attackRange, p.stats.damage, p.color);
                    if (p.effects.barrierPulse) {
                        const gain = 14 * p.effects.barrierPulse;
                        p.shield = Math.min(p.effects.maxShield || 120, (p.shield || 0) + gain);
                    }
                    p.lastAttackTime = now;
                }
            }
            else if (p.stats.weaponType === 'orbital') {
                if (now - p.lastAttackTime > (1 / p.stats.fireRate)) {
                    let targets = [];
                    const strikeRange = Math.min(360, p.stats.attackRange);
                    for (let e of state.enemies) if (MathHelper.dist(p, e) <= strikeRange) targets.push(e);
                    targets.sort(() => 0.5 - seededRandom());
                    let count = Math.min(Math.max(1, p.stats.projectiles), 4, targets.length);
                    
                    if (targets.length > 0) {
                        for(let i=0; i < count; i++) {
                            let t = targets[i % targets.length];
                            const strikeRadius = Math.min(150, p.stats.explodeRadius || 80);
                            const delay = 0.32;
                            state.particles.push({ type: 'orbital_marker', x: t.x, y: t.y, life: delay, maxLife: delay, color: '#a3e635', radius: strikeRadius, target: t });
                            state.orbitalStrikes.push({
                                x: t.x, y: t.y, radius: strikeRadius, timer: delay, stage: 'telegraph',
                                damage: p.stats.damage, target: t,
                                effects: { bleed: p.effects.bleed, poison: p.effects.poison, freeze: p.effects.freeze, burn: p.effects.burn }
                            });
                        }
                        p.lastAttackTime = now;
                    }
                }
            }
            else {
                if (now - p.lastAttackTime > (1 / p.stats.fireRate)) {
                    let nearest = null, minDist = p.stats.attackRange;
                    for (let e of state.enemies) {
                        const d = MathHelper.dist(p, e);
                        if (d < minDist) { minDist = d; nearest = e; }
                    }
                    if (nearest) {
                        const angleToTarget = MathHelper.angle(p, nearest);
                        if (p.charId === 'gambler' && p.gambler) {
                            if (!p.gambler.reloading && p.gambler.ammo > 0) {
                                const slot = p.gambler.fireCursor % p.gambler.maxAmmo;
                                const chamber = p.gambler.chambers[slot] || 'white';
                                const shotStats = { ...p.stats };
                                let shotColor = '#ffffff';
                                if (chamber === 'white') {
                                    shotStats.damage *= 0.72;
                                    shotStats.scale *= 0.9;
                                    shotColor = '#e5e7eb';
                                } else if (chamber === 'green') {
                                    shotStats.damage *= MathHelper.rand(0.85, 1.35);
                                    const modRoll = Math.floor(seededRandom() * 4);
                                    if (modRoll === 0) shotStats.pierce += 1;
                                    if (modRoll === 1) shotStats.homing += 0.08;
                                    if (modRoll === 2) shotStats.bounce += 1;
                                    if (modRoll === 3) shotStats.explodeRadius = (shotStats.explodeRadius || 0) + 40;
                                    shotColor = '#4ade80';
                                } else {
                                    shotStats.damage *= 1.9;
                                    shotStats.scale *= 1.35;
                                    shotStats.pierce += 1;
                                    shotColor = '#ef4444';
                                }
                                createProjectile(p.x, p.y, angleToTarget + MathHelper.rand(-0.06, 0.06), shotStats, p.effects, shotColor);
                                p.lastAttackTime = now;
                                p.gambler.fireCursor++;
                                p.gambler.ammo--;
                                if (p.gambler.ammo <= 0) {
                                    p.gambler.reloading = true;
                                    p.gambler.reloadTimer = p.gambler.reloadDuration;
                                    showSysMsg('RELOADING CHAMBERS...', 'text-amber-300', 'bg-amber-500/10 border-amber-500/20');
                                }
                            }
                        } else {
                            let count = p.stats.projectiles;
                            let spread = p.stats.spread;
                            let dmgMult = 1;
                            if (p.effects.gambleShot) {
                                const roll = seededRandom();
                                if (roll < 0.18) { count += 2; spread += 0.28; dmgMult = 0.72; }
                                else if (roll > 0.92) { dmgMult = 1.85; state.floatingTexts.push({ x: p.x, y: p.y - 30, text: "JACKPOT", life: 0.4, color: '#f59e0b', vy: -18, size: 11 }); }
                            }
                            for(let i = 0; i < count; i++) {
                                let offset = count > 1 ? (-spread/2 + (spread / (count - 1)) * i) : 0;
                                offset += MathHelper.rand(-0.05, 0.05); 
                                const proximityMult = p.effects.closeRangeBonus ? (MathHelper.dist(p, nearest) < 220 ? 1.35 : 1.0) : 1.0;
                                const shotStats = { ...p.stats, damage: p.stats.damage * dmgMult * proximityMult };
                                createProjectile(p.x, p.y, angleToTarget + offset, shotStats, p.effects, p.color);
                            }
                            if (p.effects.voltDash && (keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowleft || keys.arrowdown || keys.arrowright)) {
                                const chainTargets = 2 + (p.effects.voltChainBonus || 0);
                                const arcing = state.enemies.filter(e => MathHelper.dist(p, e) < 250).slice(0, chainTargets);
                                for (const e of arcing) {
                                    applyDamage(e, p.stats.damage * 0.14 * p.effects.voltDash, '#fef08a');
                                    state.particles.push({ x: p.x, y: p.y, targetX: e.x, targetY: e.y, life: 0.16, color: '#fde047', isLine: true });
                                }
                            }
                            if (p.effects.voltMoveFire && (keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowleft || keys.arrowdown || keys.arrowright)) {
                                p.lastAttackTime -= 0.08;
                            }
                            p.lastAttackTime = now;
                        }
                    }
                }
            }

            // Environment Physics
            for(let i=state.blackholes.length-1; i>=0; i--) {
                let bh = state.blackholes[i]; bh.life -= dt;
                for(let e of state.enemies) {
                    let d = MathHelper.dist(bh, e);
                    if(d < bh.radius * 2) {
                        e.x += (bh.x - e.x) * (bh.pull/1000) * dt;
                        e.y += (bh.y - e.y) * (bh.pull/1000) * dt;
                        if(d < bh.radius && seededRandom() < 0.1) applyDamage(e, bh.damage, '#a855f7');
                    }
                }
                if(bh.life <= 0) state.blackholes.splice(i, 1);
            }

            for (let i = state.hazards.length - 1; i >= 0; i--) {
                let h = state.hazards[i]; h.timer -= dt;
                if (h.isPlayerHazard && state.gameTime % 0.5 < dtReal) {
                    for(let e of state.enemies) {
                        if (MathHelper.dist(e, h) < h.radius) {
                            applyDamage(e, p.stats.damage * 0.5, '#ef4444');
                            if (h.burnStacks) { e.burnTimer = 3.0; e.burnStacks = (e.burnStacks||0) + h.burnStacks; }
                        }
                    }
                }
                if(h.timer <= 0) {
                    if(!h.isPlayerHazard) {
                        explosion(h.x, h.y, h.radius, 0, 'rgba(239, 68, 68, 0.4)'); 
                        if(MathHelper.dist(p, h) < h.radius + p.radius) takePlayerDamage(h.damage);
                    }
                    state.hazards.splice(i, 1);
                }
            }

            for (let i = state.projectiles.length - 1; i >= 0; i--) {
                let proj = state.projectiles[i];
                let pDt = proj.isEnemy ? dt : dtReal; 
                proj.x += proj.vx * pDt; proj.y += proj.vy * pDt; proj.life -= pDt;
                
                let destroyed = false;
                if (proj.x < -2000 || proj.x > 2000 || proj.y < -2000 || proj.y > 2000) destroyed = true;
                for (let obs of state.obstacles) if (MathHelper.dist(proj, obs) < proj.radius + obs.radius) { destroyed = true; break; }

                if(proj.homing > 0 && !proj.isEnemy && !destroyed) {
                    let nearest = null, minDist = 250;
                    for(let e of state.enemies) {
                        let d = MathHelper.dist(proj, e);
                        if(d < minDist && !proj.hitTargets.has(e)) { minDist = d; nearest = e; }
                    }
                    if(nearest) {
                        let currentAngle = Math.atan2(proj.vy, proj.vx);
                        let diff = MathHelper.angle(proj, nearest) - currentAngle;
                        while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                        currentAngle += diff * proj.homing;
                        let speed = Math.hypot(proj.vx, proj.vy);
                        proj.vx = Math.cos(currentAngle) * speed; proj.vy = Math.sin(currentAngle) * speed;
                    }
                }

                if (!destroyed) {
                    if (proj.isEnemy) {
                        if (MathHelper.dist(proj, p) < proj.radius + p.radius && p.dashActive <= 0) { takePlayerDamage(proj.damage); destroyed = true; }
                    } else {
                        for (let j = state.enemies.length - 1; j >= 0; j--) {
                            let e = state.enemies[j];
                            if (!proj.hitTargets.has(e) && MathHelper.dist(proj, e) < proj.radius + e.radius) {
                            applyDamage(e, proj.damage); proj.hitTargets.add(e);
                            
                            if (proj.effects.freeze) { e.freezeTimer = 2.0; p.runStats.statusEffectsApplied++; }
                            if (proj.effects.bleed) { e.bleedTimer = 4.0; p.runStats.statusEffectsApplied++; }
                            if (proj.effects.poison) { e.poisonTimer = 4.0; p.runStats.statusEffectsApplied++; }
                            if (proj.effects.burn) { e.burnTimer = 3.0; e.burnStacks = (e.burnStacks||0) + proj.effects.burn; p.runStats.statusEffectsApplied++; }
                            if (proj.explodeRadius > 0) {
                                explosion(e.x, e.y, proj.explodeRadius, proj.damage * (p.effects.carpetBomb ? 1.5 : 0.5));
                                if (p.effects.carpetBomb) state.hazards.push({ x: e.x, y: e.y, radius: 80, timer: 2.0, damage: 0, isPlayerHazard: true, burnStacks: 2 });
                            }
                            if (proj.effects.singularity && seededRandom() < 0.1) {
                                state.blackholes.push({ x: proj.x, y: proj.y, radius: 40 + proj.effects.singularity*15, pull: 100 + proj.effects.singularity*50, damage: p.stats.damage * 0.2, life: 3.0, maxLife: 3.0 });
                            }

                            if (proj.bounceLeft > 0) {
                                if(proj.effects.plasmaBounce) explosion(e.x, e.y, 80, proj.damage, 'rgba(249, 115, 22, 0.5)');
                                if(proj.effects.arcStorm) {
                                    let randTarget = state.enemies[Math.floor(seededRandom() * state.enemies.length)];
                                    if(randTarget) {
                                        state.particles.push({x: e.x, y: e.y, targetX: randTarget.x, targetY: randTarget.y, life: 0.2, color: '#fde047', isLine: true});
                                        applyDamage(randTarget, proj.damage, '#fde047');
                                    }
                                }
                                proj.bounceLeft--; proj.hitTargets.clear(); proj.hitTargets.add(e);
                                let nextTarget = null, nDist = 300;
                                for(let ne of state.enemies) { if(ne !== e) { let d = MathHelper.dist(e, ne); if(d < nDist) { nDist = d; nextTarget = ne; } } }
                                if(nextTarget) {
                                    let a = MathHelper.angle(e, nextTarget); let s = Math.hypot(proj.vx, proj.vy);
                                    proj.vx = Math.cos(a) * s; proj.vy = Math.sin(a) * s;
                                }
                            } else if (proj.pierceLeft > 0) { proj.pierceLeft--; } else { destroyed = true; break; }
                        }
                    }
                }
                } 
                if (destroyed || proj.life <= 0) state.projectiles.splice(i, 1);
            }

            // Enemy Logic & Pathing
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                let e = state.enemies[i];
                if (e.isBoss && e.spawnShield > 0) e.spawnShield -= dtReal;
                let currentSpeed = e.speed;
                if (state.worldEvent.active === 'BLOOD_MOON') currentSpeed *= 1.5;
                if (e.freezeTimer > 0) { currentSpeed *= 0.3; e.freezeTimer -= dt; }
                if (e.bleedTimer > 0) { e.hp -= (p.stats.damage * 0.1 * (p.effects.bleed||1)) * dt; e.bleedTimer -= dt; if(seededRandom()<0.1) state.particles.push({x:e.x, y:e.y, vx:0, vy:-10, life:0.4, color:'#be123c', size:3}); p.runStats.damageDealt += (p.stats.damage * 0.1 * (p.effects.bleed||1)) * dt;}
                if (e.burnTimer > 0) {
                    let bDmg = (p.stats.damage * 0.15 * e.burnStacks) * dt; e.hp -= bDmg; e.burnTimer -= dt; p.runStats.damageDealt += bDmg;
                    if(seededRandom()<0.1) state.particles.push({x:e.x, y:e.y, vx:MathHelper.rand(-5,5), vy:-15, life:0.3, color:'#f97316', size:4});
                }
                if (e.poisonTimer > 0) { 
                    let poisonDmg = (e.maxHp * 0.02 * (p.effects.poison||1)) * dt;
                    if (p.effects.toxicBlood && e.bleedTimer > 0) poisonDmg *= 1.6; 
                    if (p.effects.necrotic && e.hp - poisonDmg <= 0) explosion(e.x, e.y, 100, p.stats.damage * 2, 'rgba(34, 197, 94, 0.4)');
                    e.hp -= poisonDmg; 
                    p.runStats.damageDealt += poisonDmg;
                    e.poisonTimer -= dt; 
                    if(seededRandom()<0.1) state.particles.push({x:e.x, y:e.y, vx:MathHelper.rand(-5,5), vy:-10, life:0.3, color:'#22c55e', size:4}); 
                }

                if (p.effects.volatileMix && state.gameTime % 0.5 < dtReal) {
                    if (e.bleedTimer > 0 && e.poisonTimer > 0) { e.burnTimer = 3.0; e.burnStacks = (e.burnStacks||0) + 1; }
                    if (e.burnTimer > 0 && e.freezeTimer > 0) { explosion(e.x, e.y, 60, p.stats.damage, 'rgba(168, 85, 247, 0.4)'); e.freezeTimer = 0; }
                }
                
                e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.9; e.vy *= 0.9; 

                collideWithObstacles(e);
                constrainToBounds(e);

                for (let j = i + 1; j < Math.min(i + 8, state.enemies.length); j++) {
                    let e2 = state.enemies[j];
                    let d = MathHelper.dist(e, e2);
                    let minD = e.radius + e2.radius;
                    if (d < minD && d > 0) {
                        let over = (minD - d) / 2;
                        let ang = MathHelper.angle(e, e2);
                        let cx = Math.cos(ang) * over; let cy = Math.sin(ang) * over;
                        e.x -= cx; e.y -= cy; e2.x += cx; e2.y += cy;
                    }
                }

                if (e.hp <= 0) {
                    triggerKillProc(e);
                    if (p.effects.bloodplague && e.bleedTimer > 0) explosion(e.x, e.y, 60, p.stats.damage * 1.5, 'rgba(159, 18, 57, 0.5)');
                    if (p.effects.frostfire && e.freezeTimer > 0 && e.burnTimer > 0) explosion(e.x, e.y, 100, p.stats.damage * 3, 'rgba(56, 189, 248, 0.6)');

                    if(e.isBoss) {
                        state.bossActive = null;
                        p.runStats.bossKills++;
                        advanceToNextLayer();
                        for(let k=0; k<50; k++) state.gems.push({ x: e.x + MathHelper.rand(-100,100), y: e.y + MathHelper.rand(-100,100), value: 50 });
                        explosion(e.x, e.y, 250, 0, 'rgba(255,255,255,0.2)'); 
                    } else if (e.isElite) {
                        if(e.behavior === 'split') { for(let s=0; s<3; s++) state.enemies.push({...e, hp: e.maxHp*0.3, radius: e.radius*0.5, isElite: false, behavior: 'none'}); }
                        for(let k=0; k<20; k++) state.gems.push({ x: e.x + MathHelper.rand(-30,30), y: e.y + MathHelper.rand(-30,30), value: 20 });
                        if (p.effects.necroForge) {
                            const huskLife = 24 * (p.effects.necroHuskLife || 1);
                            state.necroHusks.push({ x: e.x, y: e.y, life: huskLife });
                            if (p.effects.doubleHusk) state.necroHusks.push({ x: e.x + MathHelper.rand(-14, 14), y: e.y + MathHelper.rand(-14, 14), life: huskLife * 0.9 });
                        }
                    } else {
                        p.progression.kills++;
                        state.gems.push({ x: e.x, y: e.y, value: e.xp || 10 });
                        if (state.objective.active && state.objective.active.metric === 'kills') {
                            state.objective.active.progress++;
                        }
                    }
                    for(let k=0; k<6; k++) state.particles.push({ x: e.x, y: e.y, vx: MathHelper.rand(-100, 100), vy: MathHelper.rand(-100, 100), life: MathHelper.rand(0.2, 0.5), color: e.color, size: MathHelper.rand(2, 6) });
                    state.enemies.splice(i, 1);
                    continue;
                }

                e.timer += dt;
                if(e.isBoss) {
                    const angle = MathHelper.angle(e, p);
                    const bossIntensity = 1 + (state.layer * 0.08);
                    if(e.behavior === 'teleport') {
                        if(e.timer > Math.max(1.4, 3 - state.layer * 0.12)) { e.x = p.x + MathHelper.rand(-400, 400); e.y = p.y + MathHelper.rand(-400, 400); e.timer = 0; explosion(e.x, e.y, 100, 0, 'rgba(255,255,255,0.5)'); }
                        if(seededRandom() < 0.05 * bossIntensity) createProjectile(e.x, e.y, angle + MathHelper.rand(-0.5, 0.5), {projectileSpeed: 320 + state.layer * 18, damage: e.damage, attackRange: 1000}, {}, e.color, true);
                    } else if (e.behavior === 'bullet_hell') {
                        e.x += Math.cos(angle) * currentSpeed * 0.3 * dt; e.y += Math.sin(angle) * currentSpeed * 0.3 * dt;
                        if(e.timer > Math.max(0.22, 0.5 - state.layer * 0.02)) { e.timer = 0; const bolts = Math.min(18, 8 + state.layer); for(let r=0; r<bolts; r++) createProjectile(e.x, e.y, (Math.PI*2/bolts)*r + state.gameTime, {projectileSpeed: 220 + state.layer * 16, damage: e.damage, attackRange: 1000}, {}, e.color, true); }
                    } else if (e.behavior === 'summoner') {
                        e.x += Math.cos(angle) * currentSpeed * 0.5 * dt; e.y += Math.sin(angle) * currentSpeed * 0.5 * dt;
                        if(e.timer > Math.max(0.9, 2.0 - state.layer * 0.08)) { e.timer = 0; for(let r=0; r<Math.min(8, 3 + Math.floor(state.layer/2)); r++) state.enemies.push({ x: e.x + MathHelper.rand(-50,50), y: e.y + MathHelper.rand(-50,50), radius: 10, sides: 3, color: '#ec4899', hp: 50 * bossIntensity, maxHp: 50 * bossIntensity, speed: 200, damage: 10 * bossIntensity, erratic: true, isBoss: false, vx:0, vy:0, timer:0, xp: 0, isRanged: false }); }
                    } else if (e.behavior === 'pull') {
                        if(MathHelper.dist(e, p) < 600 && p.dashActive <= 0) { p.x += (e.x - p.x)*1.5*dt; p.y += (e.y - p.y)*1.5*dt; }
                        if(e.timer > Math.max(1.0, 3 - state.layer * 0.1)) { e.timer = 0; for(let r=0; r<Math.min(16, 8 + state.layer); r++) createProjectile(e.x, e.y, angle + MathHelper.rand(-0.4, 0.4), {projectileSpeed: 320 + state.layer * 12, damage: e.damage*1.5, attackRange: 1000, scale: 2}, {}, e.color, true, 'giant'); }
                    } else if (e.behavior === 'omega') {
                        e.x += Math.cos(angle) * currentSpeed * 0.2 * dt; e.y += Math.sin(angle) * currentSpeed * 0.2 * dt;
                        if(e.timer > Math.max(0.08, 0.2 - state.layer * 0.01)) { e.timer = 0; createProjectile(e.x, e.y, state.gameTime * 5, {projectileSpeed: 420 + state.layer * 18, damage: e.damage, attackRange: 1500}, {}, e.color, true); }
                        if(e.hp < e.maxHp * 0.5 && e.phase === 1) { e.phase = 2; state.worldEvent.active = "BLOOD_MOON"; state.worldEvent.timer = 999; }
                    }
                } else if (e.isElite) {
                    const angle = MathHelper.angle(e, p);
                    e.x += Math.cos(angle) * currentSpeed * dt; e.y += Math.sin(angle) * currentSpeed * dt;
                    if(e.behavior === 'mortar' && e.timer > 3) {
                        e.timer = 0; state.hazards.push({ x: p.x, y: p.y, radius: 60, timer: 1.5, damage: e.damage * 2, isPlayerHazard: false }); 
                    }
                } else {
                    let angle = MathHelper.angle(e, p);
                    const distToPlayer = MathHelper.dist(e, p);
                    if (e.isRanged) {
                        if (distToPlayer < e.preferredRange * 0.8) {
                            e.x -= Math.cos(angle) * currentSpeed * dt;
                            e.y -= Math.sin(angle) * currentSpeed * dt;
                        } else if (distToPlayer > e.preferredRange * 1.2) {
                            e.x += Math.cos(angle) * currentSpeed * dt;
                            e.y += Math.sin(angle) * currentSpeed * dt;
                        } else {
                            const strafe = angle + Math.PI / 2;
                            e.x += Math.cos(strafe) * currentSpeed * 0.6 * dt;
                            e.y += Math.sin(strafe) * currentSpeed * 0.6 * dt;
                        }
                        e.shootTimer -= dt;
                        if (e.shootTimer <= 0 && distToPlayer < 900) {
                            e.shootTimer = Math.max(0.25, e.shootCd - state.layer * 0.07);
                            createProjectile(e.x, e.y, angle + MathHelper.rand(-0.15, 0.15), { projectileSpeed: 380 + state.layer * 25, damage: e.damage * 1.4, attackRange: 1200 }, {}, e.color, true, 'mini');
                        }
                    } else {
                        if(e.erratic) angle += Math.sin(state.gameTime * 5) * 1.5; 
                        e.x += Math.cos(angle) * currentSpeed * dt; e.y += Math.sin(angle) * currentSpeed * dt;
                    }
                }

                if (MathHelper.dist(e, p) < e.radius + p.radius && p.dashActive <= 0) { takePlayerDamage(e.damage * dtReal * 2); }
            }

            for (let i = state.gems.length - 1; i >= 0; i--) {
                let g = state.gems[i];
                const d = MathHelper.dist(p, g);
                if (d < p.stats.pickupRange) {
                    const angle = MathHelper.angle(g, p);
                    const pull = 600 * (1 - d/Math.max(1, p.stats.pickupRange)); 
                    g.x += Math.cos(angle) * pull * dtReal; g.y += Math.sin(angle) * pull * dtReal;
                    
                    if (d < p.radius + 10) {
                        const xpMult = p.effects.xpMult || 1;
                        const gainedXp = g.value * xpMult;
                        emitSparkBurst(g.x, g.y, '#38bdf8', 5, 140, 1.9, 0.18);
                        p.progression.xp += gainedXp; state.gems.splice(i, 1);
                        if (state.objective.active && state.objective.active.metric === 'xp') {
                            state.objective.active.progress += gainedXp;
                        }
                        if (p.progression.xp >= p.progression.nextXp) {
                            p.progression.level++; p.progression.xp -= p.progression.nextXp;
                            p.progression.nextXp = Math.floor(50 * Math.pow(1.3, p.progression.level - 1));
                            triggerLevelUp();
                        }
                    }
                }
            }

            state.particles.forEach(pt => { 
                if(pt.playerAttached) { pt.x = p.x; pt.y = p.y; }
                else if ((pt.type === 'orbital_marker' || pt.type === 'orbital_beam') && pt.target && state.enemies.includes(pt.target)) {
                    pt.x = pt.target.x;
                    pt.y = pt.target.y;
                }
                else if(!pt.isPulse && !pt.isLine && pt.type !== 'spin' && pt.type !== 'vertical_beam' && pt.type !== 'orbital_beam' && pt.type !== 'orbital_marker') { pt.x+=pt.vx*dtReal; pt.y+=pt.vy*dtReal; } 
                pt.life-=dtReal; 
            });
            state.particles = state.particles.filter(pt => pt.life > 0);
            state.floatingTexts.forEach(ft => { ft.y += ft.vy*dtReal; ft.life -= dtReal; });
            state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

            if (Math.floor(state.gameTime * 10) % 2 === 0) updateHUD(); 
        }

        function draw() {
            if (state.status === 'MENU') {
                ctx.fillStyle = '#050508'; 
                ctx.fillRect(0, 0, vw, vh);
                return;
            }

            const p = state.player;
            if (state.visualTheme === 'void') {
                ctx.fillStyle = '#050112';
                ctx.fillRect(0, 0, vw, vh);
            } else if (state.visualTheme === 'abyss') {
                ctx.fillStyle = '#02030a';
                ctx.fillRect(0, 0, vw, vh);
            } else if (p.skin === 'blueprint') {
                ctx.fillStyle = '#0f172a'; // Deep blue
                ctx.fillRect(0, 0, vw, vh);
            } else {
                ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, vw, vh);
            }

            ctx.save(); ctx.translate(-state.camera.x, -state.camera.y);

            ctx.fillStyle = state.visualTheme === 'abyss' ? 'rgba(14, 116, 144, 0.06)' : (state.visualTheme === 'void' ? 'rgba(124, 58, 237, 0.04)' : 'rgba(239, 68, 68, 0.02)');
            ctx.fillRect(-2000, -2000, 4000, 4000);
            ctx.strokeStyle = state.visualTheme === 'abyss' ? 'rgba(34, 211, 238, 0.3)' : (state.visualTheme === 'void' ? 'rgba(129, 140, 248, 0.35)' : 'rgba(239, 68, 68, 0.3)');
            ctx.lineWidth = 10; ctx.strokeRect(-2000, -2000, 4000, 4000);

            ctx.save();
            ctx.beginPath(); ctx.rect(-2000, -2000, 4000, 4000); ctx.clip();

            ctx.strokeStyle = state.visualTheme === 'abyss' ? 'rgba(103, 232, 249, 0.08)' : (state.visualTheme === 'void' ? 'rgba(196, 181, 253, 0.08)' : (p.skin === 'blueprint' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)')); 
            ctx.lineWidth = 1; const gs = 100;
            const sx = Math.floor(state.camera.x / gs) * gs, sy = Math.floor(state.camera.y / gs) * gs;
            ctx.beginPath();
            for(let x = sx; x < sx + vw + gs; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, sy + vh + gs); }
            for(let y = sy; y < sy + vh + gs; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(sx + vw + gs, y); }
            ctx.stroke();

            for(let obs of state.obstacles) {
                if(p.skin === 'wireframe' || p.skin === 'blueprint') {
                    ctx.strokeStyle = p.skin === 'blueprint' ? '#fff' : '#334155'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI*2); ctx.stroke();
                } else {
                    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius - 8, 0, Math.PI*2); ctx.stroke();
                }
            }

            for(let bh of state.blackholes) {
                let lifeRatio = bh.life / bh.maxLife;
                ctx.fillStyle = `rgba(147, 51, 234, ${0.1 * lifeRatio})`;
                ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = `rgba(88, 28, 135, ${0.5 * lifeRatio})`;
                ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 0.4 * lifeRatio, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * lifeRatio, 0, Math.PI*2); ctx.stroke();
            }

            for(let h of state.hazards) {
                if(h.isPlayerHazard) {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI*2); ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * (1 - (h.timer/1.5)), 0, Math.PI*2); ctx.stroke();
                }
            }
            if (state.signalTower) {
                const t = state.signalTower;
                ctx.strokeStyle = 'rgba(34,211,238,0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(34,211,238,0.08)';
                ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#67e8f9';
                ctx.font = 'bold 11px "JetBrains Mono"';
                ctx.textAlign = 'center';
                ctx.fillText(`TOWER ${Math.ceil(t.progress)}/${t.target}`, t.x, t.y - t.radius - 10);
            }

            for(let g of state.gems) {
                const tw = 0.6 + Math.sin(state.gameTime * 8 + g.x * 0.03) * 0.4;
                ctx.fillStyle = `rgba(56, 189, 248, ${0.45 + tw * 0.35})`;
                ctx.beginPath(); ctx.arc(g.x, g.y, 7 + tw * 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath(); ctx.moveTo(g.x, g.y - 4); ctx.lineTo(g.x + 4, g.y); ctx.lineTo(g.x, g.y + 4); ctx.lineTo(g.x - 4, g.y); ctx.fill();
            }

            for(let e of state.enemies) {
                ctx.fillStyle = e.freezeTimer > 0 ? '#67e8f9' : (e.burnTimer > 0 ? '#fb923c' : e.color);
                
                if (p.skin === 'wireframe' || p.skin === 'blueprint') {
                    ctx.strokeStyle = p.skin === 'blueprint' ? '#fff' : ctx.fillStyle; ctx.lineWidth = 2;
                    ctx.beginPath(); MathHelper.drawPoly(ctx, e.x, e.y, e.radius, e.sides, state.gameTime * (e.isBoss?0.5:1)); ctx.stroke();
                } else {
                    ctx.beginPath(); MathHelper.drawPoly(ctx, e.x, e.y, e.radius, e.sides, state.gameTime * (e.isBoss?0.5:1)); ctx.fill();
                }
                
                if(e.isBoss || e.isElite) {
                    ctx.fillStyle = e.isBoss ? 'rgba(248,113,113,0.14)' : 'rgba(251,191,36,0.1)';
                    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + (e.isBoss ? 16 : 10), 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = e.color; ctx.lineWidth = e.isBoss ? 3 : 2;
                    MathHelper.drawPoly(ctx, e.x, e.y, e.radius + (e.isBoss?10:5) + Math.sin(state.gameTime*5)*(e.isBoss?5:2), e.sides, -state.gameTime); ctx.stroke();
                }
                if(e.hp < e.maxHp && !e.isBoss) {
                    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, e.radius*2, 2);
                    ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, (e.radius*2) * (Math.max(0,e.hp)/e.maxHp), 2);
                }
            }
            
            if(p.stats.weaponType === 'beam' && p.beamTarget) {
                ctx.strokeStyle = p.color; ctx.lineWidth = 3 + Math.random() * 3;
                ctx.shadowBlur = 15; ctx.shadowColor = p.color;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.beamTarget.x, p.beamTarget.y); ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Render Remote Players (Ghosts)
            for (let uid in Party.remotePlayers) {
                const rp = Party.remotePlayers[uid];
                const charData = CHARACTERS[rp.charId] || CHARACTERS['bruiser'];
                
                // Interpolate draw position towards target
                rp.x = MathHelper.lerp(rp.x || rp.targetX, rp.targetX, 0.3);
                rp.y = MathHelper.lerp(rp.y || rp.targetY, rp.targetY, 0.3);

                ctx.globalAlpha = 0.5; // Make them ghost-like
                drawPlayerShape(ctx, rp.x, rp.y, 15, rp.skin, charData.color, rp.hp, rp.maxHp);
                
                // Nametag
                ctx.globalAlpha = 0.8;
                ctx.font = '10px "JetBrains Mono"'; ctx.fillStyle = '#a855f7'; ctx.textAlign = 'center';
                ctx.fillText(rp.name, rp.x, rp.y - 25);
                ctx.globalAlpha = 1.0;
            }

            drawPlayerShape(ctx, state.player.x, state.player.y, state.player.radius, state.player.skin, state.player.color, state.player.stats.hp, state.player.stats.maxHp, state.player.shield, state.player.effects.maxShield);
            if (state.player.charId === 'gambler' && state.player.gambler) {
                const g = state.player.gambler;
                const ringR = state.player.radius + 18;
                ctx.strokeStyle = g.reloading ? 'rgba(251,191,36,0.7)' : 'rgba(148,163,184,0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(state.player.x, state.player.y, ringR, 0, Math.PI * 2);
                ctx.stroke();
                for (let i = 0; i < g.maxAmmo; i++) {
                    const a = g.ringSpin + (Math.PI * 2 / g.maxAmmo) * i;
                    const cx = state.player.x + Math.cos(a) * ringR;
                    const cy = state.player.y + Math.sin(a) * ringR;
                    const loaded = i < g.ammo;
                    const chamber = g.chambers[i] || 'white';
                    ctx.fillStyle = loaded
                        ? (chamber === 'green' ? '#4ade80' : chamber === 'red' ? '#ef4444' : '#f8fafc')
                        : 'rgba(71,85,105,0.55)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, loaded ? 3.3 : 2.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            for(let d of state.drones) {
                const droneColor = d.role === 'harvester' ? '#facc15' : (d.role === 'healer' ? '#34d399' : '#cbd5e1');
                const bodyColor = p.skin === 'blueprint' ? '#fff' : droneColor;
                const rot = state.gameTime * 1.8 + (d.role === 'healer' ? 0.6 : (d.role === 'harvester' ? 1.2 : 0));
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(rot);

                // Outer glow shell
                ctx.fillStyle = d.role === 'healer'
                    ? 'rgba(52, 211, 153, 0.2)'
                    : d.role === 'harvester'
                        ? 'rgba(250, 204, 21, 0.2)'
                        : 'rgba(203, 213, 225, 0.2)';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();

                // Role chassis "model"
                if (d.role === 'attack') {
                    // Arrowhead gun drone
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(9, 0);
                    ctx.lineTo(-5, -6);
                    ctx.lineTo(-2, 0);
                    ctx.lineTo(-5, 6);
                    ctx.closePath();
                    p.skin === 'wireframe' ? ctx.stroke() : ctx.fill();

                    ctx.fillStyle = '#60a5fa';
                    ctx.beginPath();
                    ctx.arc(2, 0, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (d.role === 'harvester') {
                    // Diamond harvester with pickup prongs
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.lineTo(8, 0);
                    ctx.lineTo(0, 8);
                    ctx.lineTo(-8, 0);
                    ctx.closePath();
                    p.skin === 'wireframe' ? ctx.stroke() : ctx.fill();

                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(10, 0); ctx.lineTo(13, 0);
                    ctx.moveTo(-10, 0); ctx.lineTo(-13, 0);
                    ctx.stroke();
                } else {
                    // Healer ring drone
                    ctx.strokeStyle = bodyColor;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 7, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = '#86efac';
                    ctx.beginPath();
                    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(134, 239, 172, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-3, 0); ctx.lineTo(3, 0);
                    ctx.moveTo(0, -3); ctx.lineTo(0, 3);
                    ctx.stroke();
                }

                ctx.restore();
            }
            for (const h of state.necroHusks || []) {
                ctx.fillStyle = '#a78bfa';
                ctx.beginPath(); MathHelper.drawPoly(ctx, h.x, h.y, 9, 4, state.gameTime); ctx.fill();
            }
            for(let b of state.blades) {
                ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle + Math.PI/2);
                ctx.fillStyle = p.skin === 'blueprint' ? '#fff' : '#f43f5e'; ctx.beginPath(); ctx.moveTo(0, -b.length/2); ctx.lineTo(4, 0); ctx.lineTo(0, b.length/2); ctx.lineTo(-4, 0); p.skin === 'wireframe' ? ctx.stroke() : ctx.fill();
                ctx.restore();
            }

            for(let proj of state.projectiles) {
                ctx.fillStyle = p.skin === 'blueprint' ? '#fff' : proj.color; ctx.shadowBlur = 10; ctx.shadowColor = proj.color;
                ctx.globalAlpha = 0.28;
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius * 2.1, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1.0;
                if(p.stats.weaponType === 'slash' && !proj.isEnemy) {
                    ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI*2); p.skin === 'wireframe' ? ctx.stroke() : ctx.fill();
                } else {
                    ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2); p.skin === 'wireframe' ? ctx.stroke() : ctx.fill(); 
                }
                ctx.shadowBlur = 0;
            }

            for(let pt of state.particles) {
                ctx.fillStyle = p.skin === 'blueprint' ? '#fff' : pt.color; ctx.strokeStyle = p.skin === 'blueprint' ? '#fff' : pt.color; ctx.globalAlpha = pt.life / (pt.maxLife || 1); ctx.beginPath(); 
                
                if (pt.type === 'spin') {
                    ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.angle + (1 - pt.life/pt.maxLife) * Math.PI * 2.5);
                    ctx.beginPath(); ctx.arc(0, 0, pt.radius, -Math.PI/3, Math.PI/3);
                    ctx.lineWidth = 20 * Math.sin((pt.life/pt.maxLife) * Math.PI); ctx.lineCap = 'round'; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, pt.radius, Math.PI/3, Math.PI);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (pt.life/pt.maxLife)})`; ctx.lineWidth = 8; ctx.stroke();
                    ctx.restore(); ctx.globalAlpha = 1.0; continue;
                }
                else if (pt.type === 'vertical_beam') {
                    let progress = pt.life / pt.maxLife;
                    ctx.fillStyle = pt.color; ctx.globalAlpha = progress * 0.5;
                    ctx.fillRect(pt.x - pt.radius, pt.y - 2000, pt.radius * 2, 4000);
                    ctx.fillStyle = '#fff'; ctx.globalAlpha = progress;
                    ctx.fillRect(pt.x - pt.radius*0.2, pt.y - 2000, pt.radius * 0.4 * progress, 4000);
                }
                else if (pt.type === 'orbital_beam') {
                    const progress = pt.life / pt.maxLife;
                    const beamTop = Math.max(pt.y - 420, pt.startY ?? (pt.y - 360));
                    const beamBottom = pt.y + 14;
                    const headY = beamTop + (1 - progress) * (beamBottom - beamTop);

                    ctx.globalAlpha = 0.28 + (progress * 0.42);
                    ctx.strokeStyle = '#84cc16';
                    ctx.lineWidth = Math.max(7, Math.min(16, pt.radius * 0.16));
                    ctx.beginPath();
                    ctx.moveTo(pt.x, beamTop);
                    ctx.lineTo(pt.x, beamBottom);
                    ctx.stroke();

                    ctx.globalAlpha = 0.42 + (progress * 0.35);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = Math.max(2, Math.min(6, pt.radius * 0.06));
                    ctx.beginPath();
                    ctx.moveTo(pt.x, beamTop);
                    ctx.lineTo(pt.x, beamBottom);
                    ctx.stroke();

                    // Descending strike head for stronger readability.
                    ctx.globalAlpha = 0.72;
                    ctx.fillStyle = '#ecfccb';
                    ctx.beginPath();
                    ctx.arc(pt.x, headY, Math.max(4, Math.min(8, pt.radius * 0.06)), 0, Math.PI * 2);
                    ctx.fill();

                    // Small impact glow, local only.
                    ctx.globalAlpha = 0.24;
                    ctx.fillStyle = '#a3e635';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, Math.max(20, Math.min(52, pt.radius * 0.42)), 0, Math.PI * 2);
                    ctx.fill();
                }
                else if (pt.type === 'orbital_marker') {
                    const progress = pt.life / pt.maxLife;
                    ctx.globalAlpha = 0.35 + (1 - progress) * 0.45;
                    ctx.strokeStyle = '#bef264';
                    ctx.lineWidth = 2;
                    ctx.arc(pt.x, pt.y, pt.radius * (0.75 + (1 - progress) * 0.25), 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(pt.x - 10, pt.y); ctx.lineTo(pt.x + 10, pt.y);
                    ctx.moveTo(pt.x, pt.y - 10); ctx.lineTo(pt.x, pt.y + 10);
                    ctx.stroke();
                }
                else if(pt.isLine) { ctx.lineWidth = 1; ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.targetX, pt.targetY); ctx.stroke(); }
                else if(pt.isPulse) { ctx.lineWidth = 2; let progress = 1 - (pt.life / (pt.maxLife || 0.3)); let r = Math.max(0.1, pt.size * progress); ctx.arc(pt.x, pt.y, r, 0, Math.PI*2); ctx.stroke(); } 
                else { ctx.arc(pt.x, pt.y, Math.max(0.8, pt.size), 0, Math.PI*2); ctx.fill(); }
                ctx.globalAlpha = 1.0;
            }

            ctx.textAlign = 'center';
            for(let ft of state.floatingTexts) { ctx.font = `bold ${ft.size}px "JetBrains Mono"`; ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life; ctx.fillText(ft.text, ft.x, ft.y); }
            ctx.globalAlpha = 1.0;

            ctx.restore(); 
            ctx.restore(); 
            
            if (state.worldEvent.active === "BLOOD_MOON") { ctx.fillStyle = 'rgba(220, 38, 38, 0.15)'; ctx.fillRect(0, 0, vw, vh); }
        }

        function drawPlayerShape(ctx, x, y, radius, skin, color, hp, maxHp, shield = 0, maxShield = 0) {
            ctx.save();
            ctx.translate(x, y);
            
            // Shield Aura Visual
            if (maxShield > 0) {
                const sRatio = shield / maxShield;
                ctx.beginPath(); ctx.arc(0, 0, radius + 10 + Math.sin(state.gameTime*5)*2, 0, Math.PI*2);
                ctx.fillStyle = `rgba(56, 189, 248, ${0.1 * sRatio})`; ctx.fill();
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * sRatio})`; ctx.lineWidth = 2; ctx.stroke();
            }

            if(skin === 'cyber') { ctx.shadowBlur = 10; ctx.shadowColor = '#0ff'; ctx.strokeStyle = '#f0f'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; }
            if(skin === 'cosmic') { ctx.fillStyle = '#0f172a'; ctx.shadowBlur = 15; ctx.shadowColor = '#8b5cf6'; }
            if(skin === 'abyssal') { ctx.fillStyle = '#000'; ctx.strokeStyle = '#7e22ce'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#4c1d95'; }
            if(skin === 'glitch') { if(seededRandom()<0.2) ctx.translate(MathHelper.rand(-3,3), MathHelper.rand(-3,3)); }
            if(skin === 'blueprint') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.fillStyle = 'transparent'; }
            if(skin === 'wireframe') { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = 'transparent'; }

            if(skin === 'cyber' || skin === 'wireframe' || skin === 'blueprint' || skin === 'abyssal') {
                ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
                if(skin === 'cyber' || skin === 'abyssal') ctx.fill();
            } else {
                ctx.fillStyle = color; 
                ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
            }

            if (skin === 'cosmic') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(-6, -4, 2, 2); ctx.fillRect(4, -6, 1.5, 1.5); ctx.fillRect(-2, 5, 2, 2); ctx.fillRect(6, 4, 1, 1);
            }

            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2); ctx.fill();
            
            // In-world HP Bar
            if (hp !== undefined && maxHp !== undefined && hp < maxHp) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-15, radius + 5, 30, 4);
                ctx.fillStyle = '#10b981'; ctx.fillRect(-15, radius + 5, 30 * Math.max(0, hp/maxHp), 4);
            }
            // In-world Shield Bar
            if (shield !== undefined && maxShield !== undefined && maxShield > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-15, radius + 10, 30, 2);
                ctx.fillStyle = '#38bdf8'; ctx.fillRect(-15, radius + 10, 30 * Math.max(0, shield/maxShield), 2);
            }

            ctx.restore();
        }

        function gameOver() {
            state.status = 'GAMEOVER'; UI.hud.classList.add('hidden'); UI.tracker.classList.add('hidden'); UI.gameover.classList.remove('hidden');
            const p = state.player;
            const m = Math.floor(state.gameTime / 60).toString().padStart(2, '0'); const s = Math.floor(state.gameTime % 60).toString().padStart(2, '0');
            
            document.getElementById('go-time').innerText = `${m}:${s}`; 
            document.getElementById('go-kills').innerText = p.progression.kills;
            document.getElementById('go-level').innerText = p.progression.level;
            document.getElementById('go-bosses').innerText = p.runStats.bossKills || 0;
            
            document.getElementById('stat-dmg').innerText = Math.floor(p.runStats.damageDealt).toLocaleString();
            document.getElementById('stat-dps').innerText = Math.floor(p.runStats.highestDps).toLocaleString();
            document.getElementById('stat-taken').innerText = Math.floor(p.runStats.damageTaken).toLocaleString();
            document.getElementById('stat-heal').innerText = Math.floor(p.runStats.healingReceived).toLocaleString();
            document.getElementById('stat-proj').innerText = p.runStats.projectilesFired.toLocaleString();
            document.getElementById('stat-crits').innerText = p.runStats.critsLanded.toLocaleString();
            document.getElementById('stat-effects').innerText = p.runStats.statusEffectsApplied.toLocaleString();
            document.getElementById('stat-syns').innerText = p.runStats.synergiesActivated.toLocaleString();
            
            document.getElementById('go-build-name').innerText = generateBuildName(p);

            const bossKillsValid = isNaN(p.runStats.bossKills) ? 0 : p.runStats.bossKills;
            let earnedShards = Math.floor(p.progression.kills / 10) + (bossKillsValid * 50) + (Math.floor(state.gameTime / 60) * 10);
            const contract = state.contract || RUN_CONTRACTS.none;
            let contractDone = contract.id === 'none';
            if (contract.id === 'glass') contractDone = p.progression.kills >= 220;
            if (contract.id === 'rush') contractDone = state.layer >= 3 && state.gameTime <= 540;
            if (contract.id === 'clean') contractDone = p.runStats.damageTaken <= 180;
            if (contractDone && contract.reward > 0) {
                earnedShards += contract.reward;
                showSysMsg(`CONTRACT COMPLETE: +${contract.reward} SHARDS`, 'text-emerald-300', 'bg-emerald-500/10 border-emerald-500/20');
            }
            earnedShards = Math.floor(earnedShards * (state.ascension?.shardMult || 1));
            document.getElementById('go-shards').innerText = `+${earnedShards}`;
            SaveSystem.awardShards(earnedShards);
            
            SaveSystem.data.stats.totalKills += p.progression.kills;
            SaveSystem.data.stats.runsPlayed++;
            SaveSystem.data.stats.bossesDefeated += bossKillsValid;
            SaveSystem.data.stats.totalDamage += p.runStats.damageDealt;
            SaveSystem.save();

            if (Party.id) {
                Party.leave();
                showSysMsg("DISCONNECTED FROM PARTY", "text-yellow-400", "bg-yellow-500/10");
            }
        }

        function startGame(seed) {
            const selectedChar = document.querySelector('.char-card.selected');
            const selectedSkin = document.querySelector('.skin-btn.selected');
            const charId = selectedChar.getAttribute('data-char');
            const skinId = selectedSkin.getAttribute('data-skin');
            const ascensionId = document.getElementById('solo-ascension')?.value || 'none';
            const contractId = document.getElementById('solo-contract')?.value || 'none';
            
            if(!SaveSystem.data.unlockedChars.includes(charId) || !SaveSystem.data.unlockedSkins.includes(skinId)) return;

            state.reset(charId, skinId, seed, { ascensionId, contractId });
            state.status = 'PLAYING';
            syncSummons();
            playUISound('confirm');
            clearInputs();
            document.getElementById('screen-menu').classList.add('hidden'); document.getElementById('screen-gameover').classList.add('hidden'); 
            document.getElementById('screen-hud').classList.remove('hidden'); document.getElementById('screen-hud').classList.add('flex');
            
            updateHUD();
            updateTrackerUI();
            triggerClassMasteryChoice();
            if (state.ascension?.id !== 'none') showSysMsg(`ASCENSION ACTIVE: ${state.ascension.name}`, 'text-amber-300', 'bg-amber-500/10 border-amber-500/20');
            if (state.contract?.id !== 'none') showSysMsg(`CONTRACT: ${state.contract.name}`, 'text-emerald-300', 'bg-emerald-500/10 border-emerald-500/20');
            
            if (Party.id) {
                Party.startSyncing();
            }
        }

        function setAdminStatus(text) {
            const el = document.getElementById('admin-status');
            if (el) el.innerText = `Status: ${text}`;
        }

        function initUISoundBindings() {
            document.addEventListener('click', (e) => {
                const target = e.target instanceof Element ? e.target : null;
                if (!target) return;
                const btn = target.closest('button, .char-card, .skin-btn, .upgrade-card');
                if (!btn) return;

                if (btn.id === 'btn-open-party' || btn.id === 'btn-open-admin') return playUISound('open');
                if (btn.id === 'btn-close-party' || btn.id === 'btn-close-admin' || btn.id === 'btn-mainmenu') return playUISound('close');
                if (btn.id === 'btn-create-party' || btn.id === 'btn-join-party') return playUISound('shop');
                if (btn.classList.contains('char-card') || btn.classList.contains('skin-btn')) return playUISound('equip');
                if (btn.classList.contains('upgrade-card') || btn.id === 'btn-start') return playUISound('confirm');
                playUISound('select', 0.22);
            }, { passive: true });
        }

        function refreshRunOptionDescriptions() {
            const ascSel = document.getElementById('solo-ascension');
            const ctrSel = document.getElementById('solo-contract');
            const ascDesc = document.getElementById('solo-ascension-desc');
            const ctrDesc = document.getElementById('solo-contract-desc');
            if (ascSel && ascDesc) {
                const a = ASCENSION_MODS[ascSel.value] || ASCENSION_MODS.none;
                ascDesc.innerText = a.id === 'none'
                    ? 'Standard run. No extra enemy scaling.'
                    : `${a.name}: Enemy HP x${a.hpMult.toFixed(2)}, DMG x${a.dmgMult.toFixed(2)}, spawn pressure x${a.spawnMult.toFixed(2)}, shards x${a.shardMult.toFixed(2)}.`;
            }
            if (ctrSel && ctrDesc) {
                const c = RUN_CONTRACTS[ctrSel.value] || RUN_CONTRACTS.none;
                ctrDesc.innerText = c.id === 'none'
                    ? 'No contract. No bonus reward.'
                    : `${c.desc} Reward: +${c.reward} shards.`;
            }
        }

        // Init Bindings
        function updateClassQuirkPanel(charId) {
            const quirk = CLASS_QUIRKS[charId] || { name: 'Core Profile', desc: 'No special quirk configured.' };
            const titleEl = document.getElementById('class-quirk-name');
            const descEl = document.getElementById('class-quirk-desc');
            if (titleEl) titleEl.innerText = `${(charId || 'class').toUpperCase()} - ${quirk.name}`;
            if (descEl) descEl.innerText = quirk.desc;
        }

        function setMenuTab(tabName) {
            document.querySelectorAll('.menu-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
            });
            document.querySelectorAll('.menu-tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === `tab-${tabName}`);
            });
        }
        document.querySelectorAll('.menu-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => setMenuTab(btn.getAttribute('data-tab')));
        });
        setMenuTab('solo');

        document.querySelectorAll('.char-card').forEach(card => { 
            card.addEventListener('mouseenter', () => updateClassQuirkPanel(card.getAttribute('data-char')));
            card.addEventListener('click', () => { 
                const id = card.getAttribute('data-char'); const cost = parseInt(card.getAttribute('data-cost'));
                if (SaveSystem.data.unlockedChars.includes(id)) {
                    document.querySelectorAll('.char-card').forEach(c => { if(!c.classList.contains('locked-item')) c.classList.remove('selected')}); 
                    card.classList.add('selected'); 
                } else if(SaveSystem.unlock('char', id, cost)) {
                    document.querySelectorAll('.char-card').forEach(c => { if(!c.classList.contains('locked-item')) c.classList.remove('selected')}); 
                    card.classList.add('selected'); 
                } else { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 300); }
                updateClassQuirkPanel(id);
            }); 
        });
        updateClassQuirkPanel(document.querySelector('.char-card.selected')?.getAttribute('data-char') || 'ronin');

        document.querySelectorAll('.skin-btn').forEach(btn => { 
            btn.addEventListener('click', () => { 
                const id = btn.getAttribute('data-skin'); const cost = parseInt(btn.getAttribute('data-cost'));
                if (SaveSystem.data.unlockedSkins.includes(id)) {
                    document.querySelectorAll('.skin-btn').forEach(b => { if(!b.classList.contains('locked-item')) b.classList.remove('selected')}); 
                    btn.classList.add('selected'); 
                } else if(SaveSystem.unlock('skin', id, cost)) {
                    document.querySelectorAll('.skin-btn').forEach(b => { if(!b.classList.contains('locked-item')) b.classList.remove('selected')}); 
                    btn.classList.add('selected'); 
                } else {
                    btn.classList.add('shake'); document.getElementById('skin-msg').classList.remove('opacity-0');
                    setTimeout(() => { btn.classList.remove('shake'); document.getElementById('skin-msg').classList.add('opacity-0'); }, 1000);
                }
            }); 
        });

        // Party UI Bindings
        document.getElementById('btn-open-party').addEventListener('click', () => document.getElementById('modal-party').classList.remove('hidden'));
        document.getElementById('btn-close-party').addEventListener('click', () => document.getElementById('modal-party').classList.add('hidden'));
        document.getElementById('btn-create-party').addEventListener('click', () => Party.host());
        document.getElementById('btn-join-party').addEventListener('click', () => Party.join(document.getElementById('party-code-input').value));
        document.getElementById('btn-leave-party').addEventListener('click', () => Party.leave());
        document.getElementById('btn-start-party').addEventListener('click', () => Party.triggerStart());
        document.getElementById('btn-tab-host-party').addEventListener('click', () => Party.host());
        document.getElementById('btn-tab-join-party').addEventListener('click', () => Party.join(document.getElementById('tab-party-code-input').value));

        document.getElementById('btn-start').addEventListener('click', () => startGame());
        document.getElementById('btn-cycle-artifact').addEventListener('click', () => SaveSystem.cycleArtifact());
        document.getElementById('btn-cycle-starter')?.addEventListener('click', () => {
            const ok = SaveSystem.cycleStarterModule();
            if (!ok) showSysMsg('NEED 900 SHARDS TO UNLOCK SLOT', 'text-rose-300', 'bg-rose-500/10 border-rose-500/20');
        });
        document.getElementById('solo-ascension')?.addEventListener('change', refreshRunOptionDescriptions);
        document.getElementById('solo-contract')?.addEventListener('change', refreshRunOptionDescriptions);
        refreshRunOptionDescriptions();
        document.getElementById('btn-mainmenu').addEventListener('click', () => {
            document.getElementById('screen-gameover').classList.add('hidden'); document.getElementById('screen-menu').classList.remove('hidden'); state.status = 'MENU';
            ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, vw, vh); 
        });

        // Admin Panel Bindings
        const modalAdmin = document.getElementById('modal-admin');
        const adminAuthView = document.getElementById('admin-auth-view');
        const adminPanelView = document.getElementById('admin-panel-view');
        document.getElementById('btn-open-admin').addEventListener('click', () => {
            modalAdmin.classList.remove('hidden');
            if (adminState.authenticated) {
                adminAuthView.classList.add('hidden');
                adminPanelView.classList.remove('hidden');
                setAdminStatus(adminState.godMode ? 'Authenticated | GOD MODE ON' : 'Authenticated');
            } else {
                adminAuthView.classList.remove('hidden');
                adminPanelView.classList.add('hidden');
            }
        });
        document.getElementById('btn-close-admin').addEventListener('click', () => modalAdmin.classList.add('hidden'));
        document.getElementById('btn-admin-auth').addEventListener('click', () => {
            const key = document.getElementById('admin-key-input').value;
            const msg = document.getElementById('admin-auth-msg');
            if (key === ADMIN_KEY) {
                adminState.authenticated = true;
                adminAuthView.classList.add('hidden');
                adminPanelView.classList.remove('hidden');
                msg.innerText = '';
                setAdminStatus('Authenticated');
                showSysMsg('ADMIN ACCESS GRANTED', 'text-rose-300', 'bg-rose-500/10 border-rose-500/20');
            } else {
                msg.innerText = 'Invalid key.';
                msg.classList.add('text-rose-400');
            }
        });
        document.getElementById('btn-admin-godmode').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            adminState.godMode = !adminState.godMode;
            setAdminStatus(adminState.godMode ? 'Authenticated | GOD MODE ON' : 'Authenticated');
            showSysMsg(adminState.godMode ? 'GOD MODE ENABLED' : 'GOD MODE DISABLED', 'text-sky-300', 'bg-sky-500/10 border-sky-500/20');
        });
        document.getElementById('btn-admin-next-layer').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            advanceToNextLayer();
            setAdminStatus(`Authenticated | Forced Layer ${state.layer}`);
        });
        document.getElementById('btn-admin-levelup').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            triggerLevelUp();
            setAdminStatus('Authenticated | Forced Upgrade');
        });
        document.getElementById('btn-admin-shards').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            SaveSystem.awardShards(500);
            setAdminStatus('Authenticated | +500 Shards');
        });
        document.getElementById('btn-admin-kill-boss').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            if (state.bossActive) {
                state.bossActive.hp = 0;
                setAdminStatus('Authenticated | Boss Executed');
            } else {
                setAdminStatus('Authenticated | No Active Boss');
            }
        });
        document.getElementById('btn-admin-stage-bazaar').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            triggerBazaarEvent();
            setAdminStatus('Authenticated | Bazaar Triggered');
        });
        document.getElementById('btn-admin-stage-mythic').addEventListener('click', () => {
            if (!adminState.authenticated) return;
            triggerMythicGate(true);
            setAdminStatus('Authenticated | Mythic Forced Success');
        });

        // Admin keybind: Ctrl+Shift+A
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
                e.preventDefault();
                modalAdmin.classList.remove('hidden');
                if (adminState.authenticated) {
                    adminAuthView.classList.add('hidden');
                    adminPanelView.classList.remove('hidden');
                    setAdminStatus(adminState.godMode ? 'Authenticated | GOD MODE ON' : 'Authenticated');
                } else {
                    adminAuthView.classList.remove('hidden');
                    adminPanelView.classList.add('hidden');
                }
            }
        });

        let lastTime = 0;
        function loop(timestamp) {
            if (!lastTime) lastTime = timestamp;
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
            lastTime = timestamp;

            processInputs(); updateEngine(dt); draw();
            requestAnimationFrame(loop);
        }
        
        // Boot Sequence
        SaveSystem.init();
        initUISoundBindings();
        requestAnimationFrame(loop);

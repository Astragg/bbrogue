export function createUpgradesDb(CHARACTERS) {
    return [
        // Core Weapons
        { id: 'proj_up', title: 'Multishot', rarity: 'rare', desc: '+1 Projectile per attack.', color: 'text-sky-300', excludeWeapons: ['beam', 'spin', 'pulse'], apply: p => p.stats.projectiles++ },
        { id: 'pierce_up', title: 'Armor Piercing', rarity: 'common', desc: 'Projectiles pass through +1 enemy.', color: 'text-indigo-400', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.pierce++ },
        { id: 'bounce_up', title: 'Ricochet', rarity: 'rare', desc: 'Projectiles bounce to nearby enemies.', color: 'text-indigo-300', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.bounce++ },
        { id: 'homing_up', title: 'Smart Targeting', rarity: 'rare', desc: 'Projectiles track enemies slightly.', color: 'text-fuchsia-400', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.homing += 0.05 },
        { id: 'explode_up', title: 'Explosive Payload', rarity: 'rare', desc: 'Adds/increases AoE damage on hit.', color: 'text-rose-500', excludeWeapons: ['beam', 'pulse'], apply: p => { p.stats.explodeRadius = (p.stats.explodeRadius || 0) + 60; } },
        { id: 'dmg_up', title: 'Hollow Points', rarity: 'common', desc: '+22% Base Damage.', color: 'text-red-400', apply: p => p.stats.damage = Math.min(1200, p.stats.damage * 1.22) },
        { id: 'fire_up', title: 'Overclocked Trigger', rarity: 'common', desc: '+25% Fire Rate.', color: 'text-amber-400', apply: p => p.stats.fireRate = Math.min(16, p.stats.fireRate * 1.25) },
        { id: 'crit_up', title: 'Lethality', rarity: 'rare', desc: '+12% Crit Chance, +35% Crit DMG.', color: 'text-yellow-300', apply: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.12); p.stats.critMult += 0.35; } },
        { id: 'giant_up', title: 'Size Alteration', rarity: 'rare', desc: 'Increases projectile size (or melee range).', color: 'text-slate-200', apply: p => { if(CHARACTERS[p.charId].isMelee) p.stats.attackRange *= 1.2; else p.stats.scale *= 1.35; } },
        { id: 'boss_hunt', title: 'Boss Killer', rarity: 'epic', desc: 'Deal +50% more damage to Bosses/Elites.', color: 'text-orange-400', apply: p => p.stats.bossDmg = (p.stats.bossDmg || 1) + 0.5 },
        { id: 'berserk_core', title: 'Berserk Core', rarity: 'legendary', desc: '+40% damage and +30% fire rate. Lose 32% max HP.', color: 'text-rose-400', unique: true, apply: p => { p.stats.damage = Math.min(1200, p.stats.damage * 1.40); p.stats.fireRate = Math.min(16, p.stats.fireRate * 1.30); p.stats.maxHp *= 0.68; p.stats.hp = Math.min(p.stats.hp, p.stats.maxHp); } },
        { id: 'momentum_drive', title: 'Momentum Drive', rarity: 'epic', desc: '+24% speed, -30% dash cooldown, +20% projectile speed.', color: 'text-cyan-300', apply: p => { p.stats.speed = Math.min(620, p.stats.speed * 1.24); p.stats.dashCooldown *= 0.7; p.stats.projectileSpeed *= 1.20; } },
        { id: 'executioner', title: 'Executioner Protocol', rarity: 'epic', desc: 'Deal +90% damage to enemies under 35% HP.', color: 'text-rose-300', unique: true, apply: p => p.effects.executioner = (p.effects.executioner || 0) + 0.9 },

        // Status Effects
        { id: 'bleed_up', title: 'Serrated Edges', rarity: 'common', desc: 'Hits apply stacking Bleed over time.', color: 'text-rose-600', apply: p => p.effects.bleed = (p.effects.bleed || 0) + 1 },
        { id: 'poison_up', title: 'Toxic Coating', rarity: 'common', desc: 'Hits apply stacking Poison (% Max HP damage).', color: 'text-green-500', apply: p => p.effects.poison = (p.effects.poison || 0) + 1 },
        { id: 'freeze_up', title: 'Cryo Rounds', rarity: 'rare', desc: 'Hits temporarily freeze and slow enemies.', color: 'text-cyan-300', apply: p => p.effects.freeze = (p.effects.freeze || 0) + 1 },
        { id: 'burn_up', title: 'Incendiary', rarity: 'common', desc: 'Hits apply stacking Burn damage.', color: 'text-orange-500', apply: p => p.effects.burn = (p.effects.burn || 0) + 1 },
        { id: 'lightning_up', title: 'Tesla Coil', rarity: 'rare', desc: 'Damage arcs to nearby enemies (Passive).', color: 'text-yellow-200', apply: p => p.effects.lightning = (p.effects.lightning || 0) + 1 },
        { id: 'singularity', title: 'Singularity', rarity: 'epic', desc: '4% chance on kill to spawn a Black Hole.', color: 'text-purple-500', apply: p => p.effects.singularity = (p.effects.singularity || 0) + 1 },

        // Procs
        { id: 'gas_up', title: 'Gasoline', rarity: 'common', desc: 'Killing an enemy ignites nearby enemies.', color: 'text-red-500', apply: p => p.effects.gasoline = (p.effects.gasoline || 0) + 1 },

        // Survival
        { id: 'hp_up', title: 'Titanium Plating', rarity: 'common', desc: '+140 Max HP.', color: 'text-emerald-500', apply: p => { p.stats.maxHp += 140; p.stats.hp += 140; } },
        { id: 'lifesteal_up', title: 'Vampirism', rarity: 'rare', desc: 'Heal for 5% of damage dealt.', color: 'text-red-500', apply: p => p.stats.lifesteal += 0.05 },
        { id: 'spd_up', title: 'Servo Motors', rarity: 'common', desc: '+22% Move Speed.', color: 'text-teal-400', apply: p => p.stats.speed = Math.min(620, p.stats.speed * 1.22) },
        { id: 'dash_cd', title: 'Dash Thrusters', rarity: 'common', desc: 'Dash Cooldown reduced by 35%.', color: 'text-slate-300', apply: p => p.stats.dashCooldown *= 0.65 },
        { id: 'dash_burst', title: 'Blink Detonator', rarity: 'rare', desc: 'Dashing triggers a damaging explosion.', color: 'text-amber-300', apply: p => p.stats.dashExplosion = (p.stats.dashExplosion || 0) + 1 },
        { id: 'dodge_up', title: 'Phase Drift', rarity: 'epic', desc: '+12% dodge and +10% move speed.', color: 'text-slate-300', apply: p => { p.stats.dodge = Math.min(0.6, p.stats.dodge + 0.12); p.stats.speed = Math.min(620, p.stats.speed * 1.10); } },
        { id: 'shield_up', title: 'Energy Shield', rarity: 'rare', desc: 'Gain a regenerating 65 HP Shield.', color: 'text-blue-400', apply: p => p.effects.maxShield = (p.effects.maxShield || 0) + 65 },
        { id: 'xp_core', title: 'Learning Core', rarity: 'epic', desc: '+30% XP gained from gems.', color: 'text-sky-200', unique: true, apply: p => p.effects.xpMult = (p.effects.xpMult || 1) * 1.3 },

        // Summons
        { id: 'orbit_shield', title: 'Orbiting Shield', rarity: 'common', desc: 'Spawns a shield that damages enemies.', color: 'text-cyan-400', apply: p => p.summons.orbitals = (p.summons.orbitals || 0) + 1 },
        { id: 'drone_up', title: 'Attack Drone', rarity: 'rare', desc: 'Summons an autonomous attack drone.', color: 'text-zinc-300', apply: p => p.summons.drones = (p.summons.drones || 0) + 1 },
        { id: 'blade_up', title: 'Orbital Blade', rarity: 'rare', desc: 'Summons a fast spinning blade.', color: 'text-fuchsia-500', apply: p => p.summons.blades = (p.summons.blades || 0) + 1 },

        // Class Exclusives
        { id: 'ce_sniper', title: 'High Velocity', rarity: 'legendary', desc: 'SNIPER ONLY: Projectile Speed x2, Damage x2.', color: 'text-cyan-300', reqClass: ['sniper'], apply: p => { p.stats.projectileSpeed *= 2; p.stats.damage = Math.min(1200, p.stats.damage * 2); } },
        { id: 'ce_bomber', title: 'Carpet Bomb', rarity: 'epic', desc: 'BOMBER ONLY: Explosions leave burning hazards.', color: 'text-red-500', reqClass: ['bomber'], apply: p => p.effects.carpetBomb = true },
        { id: 'ce_alchemist', title: 'Volatile Mix', rarity: 'epic', desc: 'ALCHEMIST ONLY: Status procs trigger each other.', color: 'text-blue-300', reqClass: ['alchemist'], apply: p => p.effects.volatileMix = true },
        { id: 'ce_warden', title: 'Aegis Overload', rarity: 'legendary', desc: 'WARDEN ONLY: +35% Pulse radius, +45 shield.', color: 'text-cyan-200', reqClass: ['warden'], apply: p => { p.stats.attackRange *= 1.35; p.effects.maxShield = (p.effects.maxShield || 0) + 45; } },
        { id: 'ce_gambler', title: 'Loaded Cylinder', rarity: 'legendary', desc: 'GAMBLER ONLY: +2 chambers and 25% faster reload.', color: 'text-amber-300', reqClass: ['gambler'], apply: p => { if (p.gambler) { p.gambler.maxAmmo += 2; p.gambler.ammo = p.gambler.maxAmmo; p.gambler.reloadDuration *= 0.75; p.gambler.chambers = Array.from({ length: p.gambler.maxAmmo }, () => 'green'); } } },
        { id: 'ce_necrosmith', title: 'Soul Foundry', rarity: 'epic', desc: 'NECROSMITH ONLY: Husk minions deal +60% and live longer.', color: 'text-violet-300', reqClass: ['necrosmith'], apply: p => { p.effects.necroHuskDmg = (p.effects.necroHuskDmg || 1) * 1.6; p.effects.necroHuskLife = (p.effects.necroHuskLife || 1) * 1.5; } },
        { id: 'ce_voltdancer', title: 'Overcharge Stride', rarity: 'epic', desc: 'VOLT DANCER ONLY: +25% speed and stronger arc dashes.', color: 'text-yellow-200', reqClass: ['voltdancer'], apply: p => { p.stats.speed *= 1.25; p.effects.voltDash = (p.effects.voltDash || 1) + 2; } },
        { id: 'ce_architect', title: 'Factory Swarm', rarity: 'epic', desc: 'DRONE COMMANDER ONLY: +1 Attack, +1 Harvester, +1 Healing drone.', color: 'text-zinc-200', reqClass: ['architect'], apply: p => { p.summons.attackDrones = (p.summons.attackDrones || 0) + 1; p.summons.harvesterDrones = (p.summons.harvesterDrones || 0) + 1; p.summons.healDrones = (p.summons.healDrones || 0) + 1; } },

        // Synergies
        { id: 'bloodplague', title: 'Bloodplague', rarity: 'epic', desc: 'SYNERGY: Bleeding enemies explode on death.', color: 'text-red-700', unique: true, req: ['bleed_up'], apply: p => p.effects.bloodplague = true },
        { id: 'syn_toxic_blood', title: 'Toxic Hemorrhage', rarity: 'epic', desc: 'SYNERGY: Bleeding enemies take 2x Poison damage.', color: 'text-lime-400', unique: true, req: ['bleed_up', 'poison_up'], apply: p => p.effects.toxicBlood = true },
        { id: 'syn_frostfire', title: 'Thermal Collapse', rarity: 'epic', desc: 'SYNERGY: Frozen enemies take massive Burn damage and shatter.', color: 'text-orange-400', unique: true, req: ['burn_up', 'freeze_up'], apply: p => p.effects.frostfire = true },
        { id: 'syn_blade_bleed', title: 'Sawblade Singularity', rarity: 'epic', desc: 'SYNERGY: Orbital Blades cause bleeding on hit.', color: 'text-rose-600', unique: true, req: ['blade_up', 'bleed_up'], apply: p => p.effects.bladeBleed = true },
        { id: 'syn_plasma_bounce', title: 'Plasma Ricochet', rarity: 'epic', desc: 'SYNERGY: Bouncing projectiles create fiery explosions.', color: 'text-orange-500', unique: true, req: ['burn_up', 'bounce_up'], apply: p => p.effects.plasmaBounce = true },
        { id: 'syn_orbital_turret', title: 'Orbital Turrets', rarity: 'epic', desc: 'SYNERGY: Orbiting shields automatically fire small lasers.', color: 'text-cyan-300', unique: true, req: ['orbit_shield', 'drone_up'], apply: p => p.effects.orbitalTurret = true },
        { id: 'syn_arc_storm', title: 'Arc Storm', rarity: 'epic', desc: 'SYNERGY: Ricochets summon lightning strikes.', color: 'text-yellow-300', unique: true, req: ['bounce_up', 'lightning_up'], apply: p => p.effects.arcStorm = true },
        { id: 'syn_necrotic', title: 'Necrotic Payload', rarity: 'epic', desc: 'SYNERGY: Poisoned enemies explode violently.', color: 'text-emerald-500', unique: true, req: ['poison_up', 'explode_up'], apply: p => p.effects.necrotic = true },
        { id: 'syn_ghost', title: 'Ghost Volley', rarity: 'epic', desc: 'SYNERGY: Dodging releases spectral projectiles.', color: 'text-slate-300', unique: true, req: ['dodge_up', 'dash_cd'], apply: p => p.effects.ghostVolley = true },
        { id: 'syn_titan', title: 'Titanbreaker', rarity: 'epic', desc: 'SYNERGY: Giant projectiles deal 3x damage to Bosses.', color: 'text-amber-500', unique: true, req: ['giant_up', 'boss_hunt'], apply: p => p.effects.titanbreaker = true },
        { id: 'syn_fortress', title: 'Orbital Fortress', rarity: 'epic', desc: 'SYNERGY: Orbitals grant massive armor bonuses.', color: 'text-zinc-200', unique: true, req: ['orbit_shield', 'hp_up'], apply: p => p.effects.orbitalFortress = true },

        // Forbiddens
        { id: 'f_corrupted', title: 'Corrupted Core', rarity: 'legendary', desc: 'FORBIDDEN: +250% Damage. Lose 2% Max HP per second.', color: 'text-red-600', isForbidden: true, unique: true, apply: p => { p.stats.damage = Math.min(1200, p.stats.damage * 3.5); p.effects.corrupted = true; } },
        { id: 'f_fragile', title: 'Fragile Infinity', rarity: 'legendary', desc: 'FORBIDDEN: Infinite Pierce & Bounce. Max HP becomes 1.', color: 'text-red-600', isForbidden: true, unique: true, apply: p => { p.stats.pierce = 999; p.stats.bounce = 99; p.stats.maxHp = 1; p.stats.hp = 1; } }
    ];
}

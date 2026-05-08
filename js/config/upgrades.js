export function createUpgradesDb(CHARACTERS) {
    return [
        // Core Weapons
        { id: 'proj_up', title: 'Multishot', rarity: 'rare', desc: '+1 Projectile per attack.', color: 'text-sky-300', excludeWeapons: ['beam', 'spin', 'pulse'], apply: p => p.stats.projectiles++ },
        { id: 'pierce_up', title: 'Armor Piercing', rarity: 'common', desc: 'Projectiles pass through +1 enemy.', color: 'text-indigo-400', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.pierce++ },
        { id: 'bounce_up', title: 'Ricochet', rarity: 'rare', desc: 'Projectiles bounce to nearby enemies.', color: 'text-indigo-300', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.bounce++ },
        { id: 'homing_up', title: 'Smart Targeting', rarity: 'rare', desc: 'Projectiles track enemies slightly.', color: 'text-fuchsia-400', excludeWeapons: ['beam', 'spin', 'pulse', 'orbital'], apply: p => p.stats.homing += 0.05 },
        { id: 'explode_up', title: 'Explosive Payload', rarity: 'rare', desc: 'Adds/increases AoE damage on hit.', color: 'text-rose-500', excludeWeapons: ['beam', 'pulse'], apply: p => { p.stats.explodeRadius = (p.stats.explodeRadius || 0) + 60; } },
        { id: 'dmg_up', title: 'Hollow Points', rarity: 'common', desc: '+16% Base Damage.', color: 'text-red-400', apply: p => p.stats.damage = Math.min(1200, p.stats.damage * 1.16) },
        { id: 'fire_up', title: 'Overclocked Trigger', rarity: 'common', desc: '+18% Fire Rate.', color: 'text-amber-400', apply: p => p.stats.fireRate = Math.min(16, p.stats.fireRate * 1.18) },
        { id: 'crit_up', title: 'Lethality', rarity: 'rare', desc: '+8% Crit Chance, +25% Crit DMG.', color: 'text-yellow-300', apply: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.08); p.stats.critMult += 0.25; } },
        { id: 'giant_up', title: 'Size Alteration', rarity: 'rare', desc: 'Increases projectile size (or melee range).', color: 'text-slate-200', apply: p => { if(CHARACTERS[p.charId].isMelee) p.stats.attackRange *= 1.2; else p.stats.scale *= 1.35; } },
        { id: 'boss_hunt', title: 'Boss Killer', rarity: 'epic', desc: 'Deal +50% more damage to Bosses/Elites.', color: 'text-orange-400', apply: p => p.stats.bossDmg = (p.stats.bossDmg || 1) + 0.5 },

        // Status Effects
        { id: 'bleed_up', title: 'Serrated Edges', rarity: 'common', desc: 'Hits apply stacking Bleed over time.', color: 'text-rose-600', apply: p => p.effects.bleed = (p.effects.bleed || 0) + 1 },
        { id: 'poison_up', title: 'Toxic Coating', rarity: 'common', desc: 'Hits apply stacking Poison (% Max HP damage).', color: 'text-green-500', apply: p => p.effects.poison = (p.effects.poison || 0) + 1 },
        { id: 'freeze_up', title: 'Cryo Rounds', rarity: 'rare', desc: 'Hits temporarily freeze and slow enemies.', color: 'text-cyan-300', apply: p => p.effects.freeze = (p.effects.freeze || 0) + 1 },
        { id: 'burn_up', title: 'Incendiary', rarity: 'common', desc: 'Hits apply stacking Burn damage.', color: 'text-orange-500', apply: p => p.effects.burn = (p.effects.burn || 0) + 1 },
        { id: 'lightning_up', title: 'Tesla Coil', rarity: 'rare', desc: 'Damage arcs to nearby enemies (Passive).', color: 'text-yellow-200', apply: p => p.effects.lightning = (p.effects.lightning || 0) + 1 },
        { id: 'singularity', title: 'Singularity', rarity: 'epic', desc: 'Attacks can spawn a Black Hole.', color: 'text-purple-500', apply: p => p.effects.singularity = (p.effects.singularity || 0) + 1 },

        // Procs
        { id: 'missile_up', title: 'AtG Missile Mk.1', rarity: 'rare', desc: '10% chance on hit to fire a homing missile.', color: 'text-red-400', apply: p => p.effects.missile = (p.effects.missile || 0) + 1 },
        { id: 'dagger_up', title: 'Tri-Tip Dagger', rarity: 'common', desc: '15% chance on hit to throw a bleeding dagger.', color: 'text-stone-300', apply: p => p.effects.dagger = (p.effects.dagger || 0) + 1 },
        { id: 'wisp_up', title: 'Will-o-the-Wisp', rarity: 'rare', desc: 'Enemies explode into lava pillars on death.', color: 'text-orange-300', apply: p => p.effects.wisp = (p.effects.wisp || 0) + 1 },
        { id: 'gas_up', title: 'Gasoline', rarity: 'common', desc: 'Killing an enemy ignites nearby enemies.', color: 'text-red-500', apply: p => p.effects.gasoline = (p.effects.gasoline || 0) + 1 },

        // Survival
        { id: 'hp_up', title: 'Titanium Plating', rarity: 'common', desc: '+80 Max HP.', color: 'text-emerald-500', apply: p => { p.stats.maxHp += 80; p.stats.hp += 80; } },
        { id: 'regen_up', title: 'Nanobots', rarity: 'common', desc: 'Regenerate 5 HP per second.', color: 'text-emerald-300', apply: p => p.stats.regen += 5 },
        { id: 'lifesteal_up', title: 'Vampirism', rarity: 'rare', desc: 'Heal for 2% of damage dealt.', color: 'text-red-500', apply: p => p.stats.lifesteal += 0.02 },
        { id: 'spd_up', title: 'Servo Motors', rarity: 'common', desc: '+15% Move Speed.', color: 'text-teal-400', apply: p => p.stats.speed = Math.min(520, p.stats.speed * 1.15) },
        { id: 'dash_cd', title: 'Dash Thrusters', rarity: 'common', desc: 'Dash Cooldown reduced by 25%.', color: 'text-slate-300', apply: p => p.stats.dashCooldown *= 0.75 },
        { id: 'dash_burst', title: 'Blink Detonator', rarity: 'rare', desc: 'Dashing triggers a damaging explosion.', color: 'text-amber-300', apply: p => p.stats.dashExplosion = (p.stats.dashExplosion || 0) + 1 },
        { id: 'armor_up', title: 'Heavy Armor', rarity: 'common', desc: 'Reduces incoming flat damage by 5.', color: 'text-zinc-400', apply: p => p.stats.armor += 5 },
        { id: 'dodge_up', title: 'Evasion', rarity: 'rare', desc: '5% chance to ignore damage completely.', color: 'text-slate-300', apply: p => p.stats.dodge = Math.min(0.6, p.stats.dodge + 0.05) },
        { id: 'shield_up', title: 'Energy Shield', rarity: 'rare', desc: 'Gain a regenerating 45 HP Shield.', color: 'text-blue-400', apply: p => p.effects.maxShield = (p.effects.maxShield || 0) + 45 },
        { id: 'xp_core', title: 'Learning Core', rarity: 'epic', desc: '+30% XP gained from gems.', color: 'text-sky-200', unique: true, apply: p => p.effects.xpMult = (p.effects.xpMult || 1) * 1.3 },

        // Summons
        { id: 'orbit_shield', title: 'Orbiting Shield', rarity: 'common', desc: 'Spawns a shield that damages enemies.', color: 'text-cyan-400', apply: p => p.summons.orbitals = (p.summons.orbitals || 0) + 1 },
        { id: 'drone_up', title: 'Attack Drone', rarity: 'rare', desc: 'Summons an autonomous attack drone.', color: 'text-zinc-300', apply: p => p.summons.drones = (p.summons.drones || 0) + 1 },
        { id: 'blade_up', title: 'Orbital Blade', rarity: 'rare', desc: 'Summons a fast spinning blade.', color: 'text-fuchsia-500', apply: p => p.summons.blades = (p.summons.blades || 0) + 1 },

        // Class Exclusives
        { id: 'ce_sniper', title: 'High Velocity', rarity: 'legendary', desc: 'SNIPER ONLY: Projectile Speed x2, Damage x2.', color: 'text-cyan-300', reqClass: ['sniper'], apply: p => { p.stats.projectileSpeed *= 2; p.stats.damage = Math.min(1200, p.stats.damage * 2); } },
        { id: 'ce_sniper_scope', title: 'Deadeye Scope', rarity: 'epic', desc: 'SNIPER ONLY: +18% crit chance and +35% crit damage.', color: 'text-cyan-200', reqClass: ['sniper'], apply: p => { p.stats.critChance = Math.min(1, p.stats.critChance + 0.18); p.stats.critMult += 0.35; } },
        { id: 'ce_bomber', title: 'Carpet Bomb', rarity: 'epic', desc: 'BOMBER ONLY: Explosions leave burning hazards.', color: 'text-red-500', reqClass: ['bomber'], apply: p => p.effects.carpetBomb = true },
        { id: 'ce_bomber_payload', title: 'Warhead Stack', rarity: 'legendary', desc: 'BOMBER ONLY: +90 explosive radius and +40% damage.', color: 'text-red-400', reqClass: ['bomber'], apply: p => { p.stats.explodeRadius = (p.stats.explodeRadius || 0) + 90; p.stats.damage = Math.min(1200, p.stats.damage * 1.4); } },
        { id: 'ce_alchemist', title: 'Volatile Mix', rarity: 'epic', desc: 'ALCHEMIST ONLY: Status procs trigger each other.', color: 'text-blue-300', reqClass: ['alchemist'], apply: p => p.effects.volatileMix = true },
        { id: 'ce_alchemist_chain', title: 'Catalyst Engine', rarity: 'legendary', desc: 'ALCHEMIST ONLY: +1 poison/freeze/burn stack baseline.', color: 'text-blue-200', reqClass: ['alchemist'], apply: p => { p.effects.poison = (p.effects.poison || 0) + 1; p.effects.freeze = (p.effects.freeze || 0) + 1; p.effects.burn = (p.effects.burn || 0) + 1; } },
        { id: 'ce_ronin', title: 'Crimson Cyclone', rarity: 'epic', desc: 'RONIN ONLY: +35% spin range and +25% spin damage.', color: 'text-rose-400', reqClass: ['ronin'], apply: p => { p.stats.attackRange *= 1.35; p.stats.damage = Math.min(1200, p.stats.damage * 1.25); } },
        { id: 'ce_lancer', title: 'Piercing Charge', rarity: 'epic', desc: 'LANCER ONLY: +40% projectile speed and +20% fire rate.', color: 'text-teal-300', reqClass: ['lancer'], apply: p => { p.stats.projectileSpeed *= 1.4; p.stats.fireRate *= 1.2; } },
        { id: 'ce_bruiser', title: 'Scatter Core', rarity: 'epic', desc: 'BRUISER ONLY: +1 projectile and +25% close-range damage.', color: 'text-orange-300', reqClass: ['bruiser'], apply: p => { p.stats.projectiles += 1; p.stats.damage = Math.min(1200, p.stats.damage * 1.25); } },
        { id: 'ce_seeker', title: 'True Tracking', rarity: 'epic', desc: 'SEEKER ONLY: +0.18 homing and +20% attack range.', color: 'text-pink-300', reqClass: ['seeker'], apply: p => { p.stats.homing += 0.18; p.stats.attackRange *= 1.2; } },
        { id: 'ce_ranger', title: 'Bullet Hose', rarity: 'legendary', desc: 'MARINE ONLY: +55% fire rate, -10% damage.', color: 'text-emerald-300', reqClass: ['ranger'], apply: p => { p.stats.fireRate *= 1.55; p.stats.damage *= 0.9; } },
        { id: 'ce_channeler', title: 'Prism Beam', rarity: 'legendary', desc: 'CHANNELER ONLY: +30% beam range and +28% beam damage.', color: 'text-purple-300', reqClass: ['channeler'], apply: p => { p.stats.attackRange *= 1.3; p.stats.damage = Math.min(1200, p.stats.damage * 1.28); } },
        { id: 'ce_paladin', title: 'Sanctified Core', rarity: 'epic', desc: 'PALADIN ONLY: +10 armor, +4 regen, +15% pulse range.', color: 'text-yellow-300', reqClass: ['paladin'], apply: p => { p.stats.armor += 10; p.stats.regen += 4; p.stats.attackRange *= 1.15; } },
        { id: 'ce_trapper', title: 'Orbital Barrage', rarity: 'legendary', desc: 'TRAPPER ONLY: +1 orbital strike target and +35% strike damage.', color: 'text-lime-300', reqClass: ['trapper'], apply: p => { p.stats.projectiles += 1; p.stats.damage = Math.min(1200, p.stats.damage * 1.35); } },
        { id: 'ce_voidwalker', title: 'Void Conduit', rarity: 'legendary', desc: 'VOIDWALKER ONLY: +35% beam damage, +18% move speed.', color: 'text-violet-300', reqClass: ['voidwalker'], apply: p => { p.stats.damage = Math.min(1200, p.stats.damage * 1.35); p.stats.speed *= 1.18; } },
        { id: 'ce_warden', title: 'Aegis Overload', rarity: 'legendary', desc: 'WARDEN ONLY: +35% Pulse radius, +45 shield.', color: 'text-cyan-200', reqClass: ['warden'], apply: p => { p.stats.attackRange *= 1.35; p.effects.maxShield = (p.effects.maxShield || 0) + 45; } },
        { id: 'ce_warden_bastion', title: 'Bastion Matrix', rarity: 'epic', desc: 'WARDEN ONLY: +12 armor and +25% regen.', color: 'text-cyan-100', reqClass: ['warden'], apply: p => { p.stats.armor += 12; p.stats.regen *= 1.25; } },
        { id: 'ce_gambler', title: 'Loaded Cylinder', rarity: 'legendary', desc: 'GAMBLER ONLY: +2 chambers and 25% faster reload.', color: 'text-amber-300', reqClass: ['gambler'], apply: p => { if (p.gambler) { p.gambler.maxAmmo += 2; p.gambler.ammo = p.gambler.maxAmmo; p.gambler.reloadDuration *= 0.75; p.gambler.chambers = Array.from({ length: p.gambler.maxAmmo }, () => 'green'); } } },
        { id: 'ce_gambler_ace', title: 'Ace in the Chamber', rarity: 'epic', desc: 'GAMBLER ONLY: Every reload guarantees two red chambers.', color: 'text-amber-200', reqClass: ['gambler'], apply: p => { p.effects.gamblerAces = true; } },
        { id: 'ce_necrosmith', title: 'Soul Foundry', rarity: 'epic', desc: 'NECROSMITH ONLY: Husk minions deal +60% and live longer.', color: 'text-violet-300', reqClass: ['necrosmith'], apply: p => { p.effects.necroHuskDmg = (p.effects.necroHuskDmg || 1) * 1.6; p.effects.necroHuskLife = (p.effects.necroHuskLife || 1) * 1.5; } },
        { id: 'ce_necrosmith_ritual', title: 'Ritual Alloy', rarity: 'legendary', desc: 'NECROSMITH ONLY: Elite kills spawn two husks.', color: 'text-violet-200', reqClass: ['necrosmith'], apply: p => { p.effects.doubleHusk = true; } },
        { id: 'ce_voltdancer', title: 'Overcharge Stride', rarity: 'epic', desc: 'VOLT DANCER ONLY: +25% speed and stronger arc dashes.', color: 'text-yellow-200', reqClass: ['voltdancer'], apply: p => { p.stats.speed *= 1.25; p.effects.voltDash = (p.effects.voltDash || 1) + 2; } },
        { id: 'ce_voltdancer_loop', title: 'Lightning Loop', rarity: 'legendary', desc: 'VOLT DANCER ONLY: +1 chain target and +20% fire rate while moving.', color: 'text-yellow-100', reqClass: ['voltdancer'], apply: p => { p.effects.voltChainBonus = (p.effects.voltChainBonus || 0) + 1; p.effects.voltMoveFire = true; } },
        { id: 'ce_architect', title: 'Factory Swarm', rarity: 'epic', desc: 'DRONE COMMANDER ONLY: +1 Attack, +1 Harvester, +1 Healing drone.', color: 'text-zinc-200', reqClass: ['architect'], apply: p => { p.summons.attackDrones = (p.summons.attackDrones || 0) + 1; p.summons.harvesterDrones = (p.summons.harvesterDrones || 0) + 1; p.summons.healDrones = (p.summons.healDrones || 0) + 1; } },
        { id: 'ce_architect_core', title: 'Command Uplink', rarity: 'legendary', desc: 'DRONE COMMANDER ONLY: Attack/Harvest/Heal drones gain +50% output.', color: 'text-zinc-100', reqClass: ['architect'], apply: p => { p.effects.attackDroneBoost = (p.effects.attackDroneBoost || 1) * 1.5; p.effects.harvestBoost = (p.effects.harvestBoost || 1.2) * 1.5; p.effects.healDroneRate = (p.effects.healDroneRate || 1) * 1.5; } },

        // Synergies
        { id: 'bloodplague', title: 'Bloodplague', rarity: 'epic', desc: 'SYNERGY: Bleeding enemies explode on death.', color: 'text-red-700', unique: true, req: ['bleed_up'], apply: p => p.effects.bloodplague = true },
        { id: 'syn_toxic_blood', title: 'Toxic Hemorrhage', rarity: 'epic', desc: 'SYNERGY: Bleeding enemies take 2x Poison damage.', color: 'text-lime-400', unique: true, req: ['bleed_up', 'poison_up'], apply: p => p.effects.toxicBlood = true },
        { id: 'syn_frostfire', title: 'Thermal Collapse', rarity: 'epic', desc: 'SYNERGY: Frozen enemies take massive Burn damage and shatter.', color: 'text-orange-400', unique: true, req: ['burn_up', 'freeze_up'], apply: p => p.effects.frostfire = true },
        { id: 'syn_blade_bleed', title: 'Sawblade Singularity', rarity: 'epic', desc: 'SYNERGY: Orbital Blades cause bleeding on hit.', color: 'text-rose-600', unique: true, req: ['blade_up', 'bleed_up'], apply: p => p.effects.bladeBleed = true },
        { id: 'syn_plasma_bounce', title: 'Plasma Ricochet', rarity: 'epic', desc: 'SYNERGY: Bouncing projectiles create fiery explosions.', color: 'text-orange-500', unique: true, req: ['burn_up', 'bounce_up'], apply: p => p.effects.plasmaBounce = true },
        { id: 'syn_orbital_turret', title: 'Orbital Turrets', rarity: 'epic', desc: 'SYNERGY: Orbiting shields automatically fire small lasers.', color: 'text-cyan-300', unique: true, req: ['orbit_shield', 'drone_up'], apply: p => p.effects.orbitalTurret = true },
        { id: 'syn_arc_storm', title: 'Arc Storm', rarity: 'epic', desc: 'SYNERGY: Ricochets summon lightning strikes.', color: 'text-yellow-300', unique: true, req: ['bounce_up', 'lightning_up'], apply: p => p.effects.arcStorm = true },
        { id: 'syn_necrotic', title: 'Necrotic Payload', rarity: 'epic', desc: 'SYNERGY: Poisoned enemies explode violently.', color: 'text-emerald-500', unique: true, req: ['poison_up', 'explode_up'], apply: p => p.effects.necrotic = true },
        { id: 'syn_ghost', title: 'Ghost Volley', rarity: 'epic', desc: 'SYNERGY: Dodging releases spectral projectiles.', color: 'text-slate-300', unique: true, req: ['dodge_up', 'proj_up'], apply: p => p.effects.ghostVolley = true },
        { id: 'syn_titan', title: 'Titanbreaker', rarity: 'epic', desc: 'SYNERGY: Giant projectiles deal 3x damage to Bosses.', color: 'text-amber-500', unique: true, req: ['giant_up', 'boss_hunt'], apply: p => p.effects.titanbreaker = true },
        { id: 'syn_fortress', title: 'Orbital Fortress', rarity: 'epic', desc: 'SYNERGY: Orbitals grant massive armor bonuses.', color: 'text-zinc-200', unique: true, req: ['orbit_shield', 'armor_up'], apply: p => p.effects.orbitalFortress = true },

        // Forbiddens
        { id: 'f_corrupted', title: 'Corrupted Core', rarity: 'legendary', desc: 'FORBIDDEN: +300% Damage. Lose 2% Max HP per second.', color: 'text-red-600', isForbidden: true, unique: true, apply: p => { p.stats.damage = Math.min(1200, p.stats.damage * 4.0); p.effects.corrupted = true; } },
        { id: 'f_fragile', title: 'Fragile Infinity', rarity: 'legendary', desc: 'FORBIDDEN: Infinite Pierce & Bounce. Max HP becomes 1.', color: 'text-red-600', isForbidden: true, unique: true, apply: p => { p.stats.pierce = 999; p.stats.bounce = 99; p.stats.maxHp = 1; p.stats.hp = 1; } }
    ];
}

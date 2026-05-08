import { Divider, Grid, H1, H2, Stack, Stat, Table, Text } from "cursor/canvas";

const coreMetrics = [
  ["Playable classes", "17", "Free to premium roster"],
  ["Starter skins", "6", "Each with passive bonus"],
  ["Cards/modules", "71", "Includes class-exclusive cards"],
  ["Boss templates", "5", "Layer boss rotations"],
  ["Enemy archetype shapes", "6", "Base geometry families"],
  ["Enemy progression tiers", "10", "Scaling threat brackets"],
  ["Elite archetypes", "5", "Affix behavior variants"],
  ["Meta artifacts", "5+1", "5 unlockable + none baseline"],
];

const gameplayPillars = [
  ["Run structure", "Layered survival flow", "Layer 1 -> 1.5 Boss -> Layer 2... with carryover progression"],
  ["Buildcraft", "Card drafting + synergies", "Rarity-weighted picks, forbidden cards, fusion and class exclusives"],
  ["Combat feel", "Arcade action", "Dash, projectile/beam/melee archetypes, summon builds, status combos"],
  ["Meta loop", "Persistent unlocks", "Shards, class unlocks, skin unlocks, artifact unlocks, starter module slot"],
  ["Risk/reward", "Event economy", "Bazaar tradeoffs, Mythic Gate gamble, Signal Tower objective event"],
  ["Scale curve", "Optional high difficulty", "Ascension modifiers and contracts for measurable challenge/reward scaling"],
];

const classFeatureRows = [
  ["Ronin", "Melee spin brawler", "Close-range blender with combo scaling"],
  ["Lancer", "Piercing thrust gunblade", "Linear high-pierce pressure"],
  ["Bruiser", "Shot spread bruiser", "Reliable close-mid burst"],
  ["Sniper", "Precision burst", "Long-range crit archetype"],
  ["Bomber", "Explosive artillery", "AoE denial and chain clears"],
  ["Seeker", "Tracking swarm", "Homing pressure and mobility"],
  ["Paladin", "Tank pulse", "Massive survivability frontline"],
  ["Marine", "High fire-rate rifle", "Sustained DPS profile"],
  ["Channeler", "Beam lock", "Continuous pressure beam play"],
  ["Trapper", "Orbital strike gimmick", "Burst zoning from above"],
  ["Drone Commander", "Three-role drone kit", "Attack + XP harvester + healing drone at spawn"],
  ["Alchemist", "Multi-status caster", "Poison/freeze/burn stacks and proc chains"],
  ["Warden", "Barrier pulse tank", "Shielded frontline with defensive identity"],
  ["Gambler", "Chamber reload shooter", "Color-coded chamber ring: white/green/red shots + reload cycle"],
  ["Necrosmith", "Elite-kill minion forger", "Husk summons from elite kills"],
  ["Volt Dancer", "Movement-chain attacker", "Mobility converts into arc damage"],
  ["Voidwalker", "Premium beam hybrid", "High mobility + beam pressure"],
];

const systemsRows = [
  ["Class specializations", "Per-run mastery pick", "Choose one class mastery path each run"],
  ["Class-exclusive cards", "Identity chase power", "Epic/legendary cards locked to specific classes"],
  ["Ascension modifiers", "Difficulty ladder", "Enemy HP/DMG/spawn pressure multipliers with shard boosts"],
  ["Contracts", "Session objectives", "Optional run challenges with shard rewards"],
  ["Fusion Forge", "Module merge event", "Converts owned power into hybrid stat spikes"],
  ["Signal Tower", "Defense event", "Hold zone under pressure for bonus rewards"],
  ["Mid-run objectives", "Cadence goals", "Kill/XP/no-hit objectives for unlock and shard payout"],
  ["World anomalies", "Run mutations", "Time Distortion, Blood Moon, Ion Storm"],
  ["Layer progression", "Escalation engine", "Visual/theme shifts + tougher boss pacing"],
  ["Admin tools", "Testing & QA controls", "God mode, force level-up, stage forcing, key auth"],
];

const techRows = [
  ["Rendering/runtime", "HTML5 Canvas + JS", "Low-latency arcade update loop with custom VFX stack"],
  ["Architecture", "Modular config-driven", "Separate character/enemy/upgrade config files"],
  ["Multiplayer", "P2P + cloud fallback", "PeerJS/WebRTC + Firebase signaling and persistence fallback"],
  ["Progression sync", "Shared XP model", "Party progression averaged to reduce role exploitation"],
  ["Persistence", "Local + cloud merge", "Conflict-safe merge strategy for unlockables and stats"],
  ["Live balancing", "Data-first tuning", "Class metrics and tier target tables for measurable balancing"],
];

const investorAngles = [
  ["High retention hooks", "Meta unlock tree + events + contracts", "Players have short-term goals and long-term unlock objectives"],
  ["Scalable content model", "Card/synergy/class-exclusives", "Large replay space without full asset-heavy production each patch"],
  ["Community-friendly depth", "Build experimentation", "Clear room for theorycraft and social sharing"],
  ["Monetization-safe potential", "Cosmetic-forward skins", "Gameplay depth exists independent of pay-to-win loops"],
  ["Roadmap-ready structure", "Feature modularity", "New classes/events/cards can ship as contained drops"],
];

const roadmapRows = [
  ["Phase 1: Balance lock", "Finalize numeric bands", "Stable class win-rate and pick-rate spread by tier"],
  ["Phase 2: Content drop", "2 new classes + 15 exclusives", "Meaningful fresh build paths each patch"],
  ["Phase 3: Boss expansion", "3 new boss templates", "Increase late-run variety and streaming value"],
  ["Phase 4: Meta progression", "Codex + daily seeded runs", "Daily engagement + social competition"],
  ["Phase 5: Platform polish", "UX/audio/VFX refinement", "Investor demo quality and onboarding improvement"],
];

export default function InvestorFeatureStatSheet() {
  return (
    <Stack gap={20}>
      <H1>Battle Of The Shapes - Investor Feature Sheet</H1>
      <Text>
        Product snapshot for pitch and partner conversations. This sheet summarizes live implemented systems,
        content volume, technical stack, and expansion readiness.
      </Text>

      <Grid columns={4} gap={12}>
        <Stat value="17" label="Classes" />
        <Stat value="71" label="Cards/Modules" />
        <Stat value="3" label="Core Run Events" />
        <Stat value="P2P + Cloud" label="Multiplayer Model" />
      </Grid>

      <Divider />
      <H2>Current Game Metrics</H2>
      <Table headers={["Category", "Current Count", "Business Relevance"]} rows={coreMetrics} />

      <Divider />
      <H2>Gameplay Pillars</H2>
      <Table headers={["Pillar", "Player Value", "Execution"]} rows={gameplayPillars} />

      <Divider />
      <H2>Class Roster Breakdown</H2>
      <Table headers={["Class", "Archetype", "Why It Matters"]} rows={classFeatureRows} />

      <Divider />
      <H2>Systems and Feature Depth</H2>
      <Table headers={["System", "Design Function", "Status"]} rows={systemsRows} />

      <Divider />
      <H2>Technical Foundation</H2>
      <Table headers={["Area", "Implementation", "Scalability Signal"]} rows={techRows} />

      <Divider />
      <H2>Investor Narrative Angles</H2>
      <Table headers={["Angle", "Proof Point", "Why It Is Investable"]} rows={investorAngles} />

      <Divider />
      <H2>Roadmap Narrative</H2>
      <Table headers={["Stage", "Planned Scope", "Outcome"]} rows={roadmapRows} />
    </Stack>
  );
}


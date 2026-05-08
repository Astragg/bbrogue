import { Divider, Grid, H1, H2, Stack, Stat, Table, Text } from "cursor/canvas";

const tierRows = [
  ["Free (0)", "120-170", "260-360", "140-210", "Starter kits, low risk"],
  ["Unlock I (250)", "140-190", "300-420", "170-240", "Clear upgrade over starters"],
  ["Unlock II (500)", "155-220", "340-480", "190-270", "Strong identity spike"],
  ["Premium (850-1000)", "175-240", "390-560", "220-320", "Build-defining power"],
  ["Apex (1800)", "200-260", "450-650", "260-360", "Top-end chase class"],
];

const classRows = [
  ["Bomber", "0", "113", "120-170", "-7", "Slightly low early; scales via AoE"],
  ["Bruiser", "0", "135", "120-170", "OK", "Healthy baseline"],
  ["Lancer", "0", "148", "120-170", "OK", "Healthy baseline"],
  ["Ronin", "0", "135", "120-170", "OK", "Healthy baseline"],
  ["Seeker", "0", "164", "120-170", "OK+", "High-end starter"],
  ["Sniper", "0", "229", "120-170", "+59", "Outlier burst; pay with survivability"],
  ["Channeler", "250", "114", "140-190", "-26", "Needs beam baseline help"],
  ["Paladin", "250", "64", "Tank target 70-100", "-6", "Damage intentionally low; survivability role"],
  ["Marine", "250", "169", "140-190", "OK", "In-band"],
  ["Alchemist", "500", "71", "155-220", "-84", "Relies on statuses; needs proc amplification"],
  ["Drone Commander", "500", "37", "155-220", "-118", "Core DPS hidden in drone outputs"],
  ["Trapper", "500", "277", "155-220", "+57", "Over target baseline; tune with cadence"],
  ["Warden", "850", "75", "Tank target 90-130", "-15", "Frontline role, acceptable if utility high"],
  ["Gambler", "900", "137", "175-240", "-38", "Needs chamber EV bump or reload speed"],
  ["Volt Dancer", "950", "109", "175-240", "-66", "Needs movement-chain damage payoff"],
  ["Necrosmith", "1000", "89", "175-240", "-86", "Needs husk throughput to count"],
  ["Voidwalker", "1800", "129", "200-260", "-71", "Premium tier should be higher floor"],
];

const actionRows = [
  ["Channeler", "+18 to +24 base beam damage", "Should enter 140+ early DPS"],
  ["Gambler", "Reload 1.65s -> 1.35s, red chamber weight +6%", "Raise expected sustained DPS"],
  ["Volt Dancer", "Dash-chain arcs hit 3 -> 4 targets at mastery", "Convert mobility into boss DPS"],
  ["Necrosmith", "Husks attack interval -20%, base husk damage +25%", "Raise effective DPS via minions"],
  ["Drone Commander", "Attack drone base damage multiplier 0.3 -> 0.45", "Expose class power earlier"],
  ["Voidwalker", "Beam damage +12%, range +5%", "Match premium unlock expectation"],
  ["Trapper", "Orbital strike cadence -10% or damage -12%", "Bring 500-cost spike into band"],
  ["Sniper", "Optional: critChance -0.03 if still overperforming", "Keep starter tier from eclipsing unlocks"],
];

export default function ClassBalanceMetrics() {
  return (
    <Stack gap={20}>
      <H1>Class Balance Tuning Table</H1>
      <Text>
        Baseline DPS uses current class stats only (single-target, no upgrade cards). Mid and boss targets are
        progression goals so balance is measurable instead of feel-based.
      </Text>

      <Grid columns={4} gap={12}>
        <Stat value="17" label="Classes evaluated" />
        <Stat value="6" label="Below target baseline" tone="warning" />
        <Stat value="2" label="Above target baseline" tone="warning" />
        <Stat value="9" label="Within or near band" tone="success" />
      </Grid>

      <Divider />
      <H2>Target Bands by Unlock Tier</H2>
      <Table
        headers={["Tier", "Early DPS Target", "Mid DPS Target", "Boss DPS Target", "Intent"]}
        rows={tierRows}
      />

      <Divider />
      <H2>Current Baseline vs Target</H2>
      <Table
        headers={["Class", "Cost", "Current DPS", "Target Band", "Gap", "Assessment"]}
        rows={classRows}
      />

      <Divider />
      <H2>Recommended Numeric Changes</H2>
      <Table
        headers={["Class", "Change", "Expected Effect"]}
        rows={actionRows}
      />

      <Text tone="secondary" size="small">
        Formula used: expected baseline DPS = damage * fireRate * projectiles * (1 + critChance * (critMult - 1)).
        Beam classes are measured as continuous damage baseline with crit expectation.
      </Text>
    </Stack>
  );
}


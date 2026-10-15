import { useColorModeValue } from '@chakra-ui/react';
import { MAP_CENTERS, MAP_HEIGHT, MAP_PATHS, MAP_WIDTH } from '../hailer/europeMap';

// The map uses Natural Earth names; customer records use "Türkiye" and a few other spellings.
const ALIASES: Record<string, string> = {
  'türkiye': 'Turkey', turkey: 'Turkey', 'czech republic': 'Czechia', uk: 'United Kingdom',
  'great britain': 'United Kingdom', england: 'United Kingdom', 'the netherlands': 'Netherlands', holland: 'Netherlands',
};
export const mapName = (country: string): string => ALIASES[country.trim().toLowerCase()] ?? country.trim();

interface Props {
  counts: Record<string, number>; // keyed by the country as written on the customer record
  selected: string | null;
  onSelect: (country: string | null) => void;
}

export default function OverviewMap({ counts, selected, onSelect }: Props) {
  const land = useColorModeValue('#E2E8F0', '#2D3748');
  const water = useColorModeValue('#F7FAFC', '#1A202C');
  const border = useColorModeValue('#FFFFFF', '#1A202C');
  const accent = useColorModeValue('#3182CE', '#63B3ED');
  const labelText = '#FFFFFF';

  // counts by map name (two spellings of a country add up)
  const byMap: Record<string, { n: number; label: string }> = {};
  Object.entries(counts).forEach(([country, n]) => {
    const key = mapName(country);
    byMap[key] = { n: (byMap[key]?.n ?? 0) + n, label: byMap[key]?.label ?? country };
  });
  const max = Math.max(1, ...Object.values(byMap).map((v) => v.n));
  const selectedKey = selected ? mapName(selected) : null;

  return (
    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} width="100%" style={{ display: 'block', borderRadius: 8, background: water }} role="img" aria-label="Map of customers by country">
      {MAP_PATHS.map((p) => {
        const has = byMap[p.name];
        const isSel = selectedKey === p.name;
        return (
          <path
            key={p.name}
            d={p.d}
            fill={has ? accent : land}
            fillOpacity={has ? 0.22 + 0.5 * (has.n / max) : 1}
            stroke={isSel ? accent : border}
            strokeWidth={isSel ? 2.5 : 0.7}
            strokeLinejoin="round"
            style={{ cursor: has ? 'pointer' : 'default' }}
            onClick={() => has && onSelect(isSel ? null : has.label)}
          >
            <title>{has ? `${has.label}: ${has.n} customer${has.n === 1 ? '' : 's'}` : p.name}</title>
          </path>
        );
      })}
      {Object.entries(byMap).map(([name, v]) => {
        const c = MAP_CENTERS[name];
        if (!c) return null;
        const r = 11 + Math.sqrt(v.n) * 3.6;
        return (
          <g key={name} style={{ cursor: 'pointer' }} onClick={() => onSelect(selectedKey === name ? null : v.label)}>
            <circle cx={c[0]} cy={c[1]} r={r} fill={accent} stroke="#FFFFFF" strokeWidth={1.5} fillOpacity={0.95} />
            <text x={c[0]} y={c[1]} textAnchor="middle" dominantBaseline="central" fontSize={r > 20 ? 17 : 14} fontWeight={700} fill={labelText} style={{ pointerEvents: 'none' }}>
              {v.n}
            </text>
            <title>{`${v.label}: ${v.n} customer${v.n === 1 ? '' : 's'}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

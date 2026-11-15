import { useMemo, useState } from 'react';
import type { LoadedFont } from '../lib/fonts';
import { GlyphDetail } from './GlyphDetail';

/** Drawing height of each glyph, in px; the same for every glyph and every font. */
const glyphHeight = 48;

export function Glyphs({ font }: { font: LoadedFont }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const parsed = font.parsed;
  const matches = useMemo(() => {
    if (!parsed) return [];
    const query = search.trim().toLowerCase();
    const list: number[] = [];
    for (let index = 0; index < parsed.glyphs.length; index++) {
      const glyph = parsed.glyphs.get(index);
      if (
        !query ||
        glyph.name?.toLowerCase().includes(query) ||
        String(index) === query ||
        glyph.unicodes.some(
          (code) =>
            String.fromCodePoint(code) === query || `u+${code.toString(16)}`.includes(query),
        )
      )
        list.push(index);
    }
    return list;
  }, [parsed, search]);
  if (!parsed) return <p className="p-5 text-muted">{font.inspectionWarning}</p>;
  // One frame for every glyph (ascender to descender, square) so all share a scale.
  const ascender = parsed.ascender || parsed.unitsPerEm * 0.8;
  const descender = parsed.descender || -parsed.unitsPerEm * 0.2;
  const pad = (ascender - descender) * 0.1;
  const frame = ascender - descender + pad * 2;
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line p-3">
        <input
          className="text-input max-w-72"
          placeholder="نام، کاراکتر، U+ یا شماره گلیف"
          aria-label={`جستجوی گلیف ${font.fileName}`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <span className="text-muted">{matches.length} گلیف</span>
      </div>
      <div className="glyph-grid" dir="ltr">
        {matches.map((index) => {
          const g = parsed.glyphs.get(index);
          const box = g.getBoundingBox();
          // Centre each glyph horizontally; the vertical frame is shared.
          const centre = box.x2 > box.x1 ? (box.x1 + box.x2) / 2 : (g.advanceWidth ?? 0) / 2;
          return (
            <button
              key={index}
              className="glyph-cell"
              aria-label={`گلیف ${index}: ${g.name ?? ''}`}
              onClick={() => setSelected(index)}
            >
              <svg
                width="100%"
                height={glyphHeight}
                viewBox={`${centre - frame / 2} ${-ascender - pad} ${frame} ${frame}`}
                aria-hidden="true"
              >
                <path d={g.getPath(0, 0, parsed.unitsPerEm).toPathData(2)} fill="currentColor" />
              </svg>
              <small title={g.name ?? undefined}>{g.name ?? `#${index}`}</small>
              <small>#{index}</small>
            </button>
          );
        })}
      </div>
      {matches.length === 0 && <p className="p-5 text-muted">گلیفی پیدا نشد.</p>}
      {selected !== null && (
        <GlyphDetail
          font={parsed}
          index={selected}
          order={matches}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function metadataRows(font: LoadedFont): Map<string, string> {
  const rows = new Map<string, string>();
  rows.set('Bytes', String(font.size));
  rows.set('Weight', String(font.weight));
  rows.set('OpenType features', font.features.join(', ') || '—');
  if (font.axes.length)
    rows.set(
      'Variable axes',
      font.axes
        .map((a) => `${a.tag} (${a.name}) ${a.min}–${a.max}, default ${a.defaultValue}`)
        .join(' · '),
    );
  const parsed = font.parsed;
  if (!parsed) return rows;
  rows.set('Glyphs', String(parsed.glyphs.length));
  rows.set('Units per em', String(parsed.unitsPerEm));
  rows.set('Ascender', String(parsed.ascender));
  rows.set('Descender', String(parsed.descender));
  for (const [name, value] of Object.entries(parsed.names))
    rows.set(
      // IDs 256+ are font-specific strings, such as stylistic set names.
      /^\d+$/.test(name) ? `Name ID ${name}` : name,
      value.fa ?? value.en ?? Object.values(value).join(' / '),
    );
  return rows;
}

/** One table for all fonts: a column per font, a row per metadata field. */
export function Metadata({ fonts }: { fonts: LoadedFont[] }) {
  const perFont = fonts.map(metadataRows);
  // Union of field names, in first-seen order across fonts.
  const names = [...new Set(perFont.flatMap((rows) => [...rows.keys()]))];
  return (
    <div className="panel metadata-table-wrap" dir="ltr">
      <table className="data-table metadata-table">
        <thead>
          <tr>
            <th scope="col" />
            {fonts.map((font) => (
              <th scope="col" key={font.id} title={font.name}>
                {font.fileName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {fonts.map((font, i) => (
                <td key={font.id}>{perFont[i]?.get(name) ?? '—'}</td>
              ))}
            </tr>
          ))}
          {fonts.some((font) => !font.parsed) && (
            <tr>
              <th scope="row">Warning</th>
              {fonts.map((font) => (
                <td key={font.id}>{font.parsed ? '' : font.inspectionWarning}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

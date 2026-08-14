import { SEED_ITEMS } from '../lib/seed-data.ts'; // run via tsx
import { writeFileSync } from 'node:fs';
const esc = (s) => String(s ?? '').replace(/'/g, "''");
const values = SEED_ITEMS.map(i =>
  `('${i.id}','${i.track}',${i.sort_order},'${esc(i.title)}',${i.description ? `'${esc(i.description)}'` : 'NULL'},'${JSON.stringify(i.metadata).replace(/'/g, "''")}'::jsonb)`
).join(',\n');
const sql = `insert into items (id, track, sort_order, title, description, metadata) values\n${values}\non conflict (id) do nothing;\n`;
writeFileSync(new URL('./seed.sql', import.meta.url), sql);

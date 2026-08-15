import { SEED_ITEMS, SEED_COURSE } from '../lib/seed-data.ts'; // run via tsx
import { writeFileSync } from 'node:fs';
const esc = (s) => String(s ?? '').replace(/'/g, "''");

const itemValues = SEED_ITEMS.map(i =>
  `('${i.id}','${i.course_id}','${i.track}',${i.sort_order},'${esc(i.title)}',${i.description ? `'${esc(i.description)}'` : 'NULL'},'${JSON.stringify(i.metadata).replace(/'/g, "''")}'::jsonb)`
).join(',\n');

const itemsSql = `insert into items (id, course_id, track, sort_order, title, description, metadata) values\n${itemValues}\non conflict (id) do update set course_id=excluded.course_id, track=excluded.track, sort_order=excluded.sort_order, title=excluded.title, description=excluded.description, metadata=excluded.metadata;\n`;

const c = SEED_COURSE;
const courseSql = `insert into courses (id, title, description, emoji, is_seed, notebook_url) values\n('${c.id}','${esc(c.title)}',${c.description ? `'${esc(c.description)}'` : 'NULL'},'${c.emoji}',${c.is_seed},${c.notebook_url ? `'${esc(c.notebook_url)}'` : 'NULL'})\non conflict (id) do update set title=excluded.title, description=excluded.description, emoji=excluded.emoji, is_seed=excluded.is_seed, notebook_url=excluded.notebook_url;\n`;

writeFileSync(new URL('./seed.sql', import.meta.url), courseSql + itemsSql);
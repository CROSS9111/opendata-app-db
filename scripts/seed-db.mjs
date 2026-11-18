// data/shelters.json の中身を、DB（Neon の PostgreSQL）の shelters の表に入れる。
// 表がなければ作る。同じ id の行があれば上書きする（何度動かしてもよい）。
//
// 使い方（先に .env.local に DATABASE_URL を入れておく）:
//   npm run db:seed

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL がありません。`npx vercel env pull .env.local` で .env.local を作ってください。");
  process.exit(1);
}

const sql = neon(url);
const here = dirname(fileURLToPath(import.meta.url));
const shelters = JSON.parse(readFileSync(resolve(here, "../data/shelters.json"), "utf8"));

// 表を作る。1行が避難場所1件。
await sql`
  CREATE TABLE IF NOT EXISTS shelters (
    id        text PRIMARY KEY,
    name      text NOT NULL,
    name_kana text NOT NULL,
    address   text NOT NULL,
    lat       double precision NOT NULL,
    lng       double precision NOT NULL,
    hazards   text[] NOT NULL,
    capacity  integer NOT NULL,
    phone     text,
    note      text
  )
`;

for (const s of shelters) {
  await sql`
    INSERT INTO shelters (id, name, name_kana, address, lat, lng, hazards, capacity, phone, note)
    VALUES (${s.id}, ${s.name}, ${s.nameKana}, ${s.address}, ${s.lat}, ${s.lng}, ${s.hazards}, ${s.capacity}, ${s.phone ?? null}, ${s.note ?? null})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_kana = EXCLUDED.name_kana,
      address = EXCLUDED.address,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      hazards = EXCLUDED.hazards,
      capacity = EXCLUDED.capacity,
      phone = EXCLUDED.phone,
      note = EXCLUDED.note
  `;
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM shelters`;
console.log(`shelters の表に ${count} 件あります。`);

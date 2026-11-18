import "server-only";

// サーバーの層（データの出し入れ）。DB（Neon の PostgreSQL）に問い合わせるのは、このファイルだけ。
// JSON ファイルの版（opendata-app）と比べて、変わったのはこのファイルの中身だけ。関数の名前と返す型は同じ。

import { neon } from "@neondatabase/serverless";
import { isHazardKey } from "@/shared/hazards";
import type { Shelter } from "@/shared/types";

// DB の shelters の表の1行。列の名前は DB の決まりに合わせて snake_case にしている。
type ShelterRow = {
  id: string;
  name: string;
  name_kana: string;
  address: string;
  lat: number;
  lng: number;
  hazards: string[];
  capacity: number;
  phone: string | null;
  note: string | null;
};

// DB の接続先は環境変数 DATABASE_URL から読む。Vercel で DB をつなぐと自動で入る。
// 手元では `npx vercel env pull .env.local` で持ってくる。
function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL がありません。.env.local を作ったか確かめてください（README の手順4）");
  }
  return neon(url);
}

// DB の1行を Shelter に変換する。知らない災害の種類は捨てる（画面が壊れないように）。
function toShelter(row: ShelterRow): Shelter {
  const shelter: Shelter = {
    id: row.id,
    name: row.name,
    nameKana: row.name_kana,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    hazards: row.hazards.filter(isHazardKey),
    capacity: Number(row.capacity),
  };
  if (row.phone) shelter.phone = row.phone;
  if (row.note) shelter.note = row.note;
  return shelter;
}

export async function findAllShelters(): Promise<Shelter[]> {
  const sql = db();
  const rows = (await sql`SELECT * FROM shelters`) as ShelterRow[];
  return rows.map(toShelter);
}

export async function findShelterById(id: string): Promise<Shelter | undefined> {
  const sql = db();
  const rows = (await sql`SELECT * FROM shelters WHERE id = ${id}`) as ShelterRow[];
  return rows[0] ? toShelter(rows[0]) : undefined;
}

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  storeId:               z.string().min(1),
  name:                  z.string().min(1).max(200).default("New Program"),
  description:           z.string().max(300).optional().nullable(),
  category:              z.string().default("Other"),
  bannerUrl:             z.string().url().optional().nullable(),
  commissionRate:        z.number().min(0).max(100).default(10),
  programType:           z.enum(["open","approval"]).default("open"),
  attributionWindowDays: z.number().min(1).max(365).default(30),
  payoutThreshold:       z.number().min(0).default(50),
  payoutSchedule:        z.enum(["manual","weekly","monthly"]).default("manual"),
  currency:              z.string().default("USD"),
  allProducts:           z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Only brand accounts can create programs
  const user = await db.findUserById(session.userId);
  if (!user || user.role !== "brand") {
    return NextResponse.json({ error: "Only brand accounts can create affiliate programs." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const stores = await db.findStoresByUserId(session.userId);
  const store = stores.find(s => s.id === parsed.data.storeId);
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

  const program = await db.createProgram({
    id: nanoid(),
    userId: session.userId,
    storeId: store.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    bannerUrl: parsed.data.bannerUrl ?? null,
    commissionRate: parsed.data.commissionRate,
    programType: parsed.data.programType,
    attributionWindowDays: parsed.data.attributionWindowDays,
    payoutThreshold: parsed.data.payoutThreshold,
    payoutSchedule: parsed.data.payoutSchedule,
    currency: parsed.data.currency,
    status: "draft",
    allProducts: parsed.data.allProducts,
  });

  return NextResponse.json(program, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const programs = await db.findProgramsByUserId(session.userId);
  return NextResponse.json(programs);
}

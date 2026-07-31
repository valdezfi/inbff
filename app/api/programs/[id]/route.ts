import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [affiliates, orders, commissions, applications, products] = await Promise.all([
    db.findAffiliatesByProgramId(id),
    db.findOrdersByProgramId(id),
    db.findCommissionsByProgramIds([id]),
    db.findApplicationsByProgramId(id),
    db.findProgramProductIds(id),
  ]);

  return NextResponse.json({ program, affiliates, orders, commissions, applications, selectedProductIds: products });
}

const patchSchema = z.object({
  name:                  z.string().min(1).max(200).optional(),
  description:           z.string().max(300).nullable().optional(),
  category:              z.string().optional(),
  bannerUrl:             z.string().nullable().optional(),
  commissionRate:        z.number().min(0).max(100).optional(),
  programType:           z.enum(["open","approval"]).optional(),
  attributionWindowDays: z.number().min(1).max(365).optional(),
  payoutThreshold:       z.number().min(0).optional(),
  payoutSchedule:        z.enum(["manual","weekly","monthly"]).optional(),
  currency:              z.string().optional(),
  allProducts:           z.boolean().optional(),
  status:                z.enum(["draft","active","paused","deleted"]).optional(),
  productIds:            z.array(z.string()).optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { productIds, ...fields } = parsed.data;

  // Update product eligibility if provided
  if (productIds !== undefined) {
    await db.setProgramProducts(id, productIds);
  }

  const updated = await db.updateProgram(id, fields);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.updateProgram(id, { status: "deleted" });
  return NextResponse.json({ ok: true });
}

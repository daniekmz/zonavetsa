import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface TeacherRow {
  "Kode Guru"?: string;
  Kode?: string;
  kode_guru?: string;
  "Nama Lengkap"?: string;
  Nama?: string;
  name?: string;
  NIP?: string;
  nip?: string;
  Email?: string;
  email?: string;
  "Nomor HP"?: string;
  HP?: string;
  phone?: string;
  "Mata Pelajaran"?: string;
  Mapel?: string;
  subject?: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as TeacherRow[];

    if (data.length === 0) {
      return NextResponse.json({ error: "File Excel kosong" }, { status: 400 });
    }

    const supabase = createClient();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of data) {
      const kodeGuru = String(row["Kode Guru"] || row.Kode || row.kode_guru || "").trim();
      const name = String(row["Nama Lengkap"] || row.Nama || row.name || "").trim();
      const nip = String(row.NIP || row.nip || "").trim();
      const email = String(row.Email || row.email || "").trim();
      const phone = String(row["Nomor HP"] || row.HP || row.phone || "").trim();
      const subject = String(row["Mata Pelajaran"] || row.Mapel || row.subject || "").trim();

      if (!kodeGuru || !name) {
        errors.push(`Baris tidak lengkap: ${name || "(tanpa nama)"} - ${kodeGuru || "(tanpa kode guru)"}`);
        skipped++;
        continue;
      }

      const defaultPassword = `${kodeGuru}@smkvetsa`;

      const { data: existingTeacher } = await supabase
        .from("teachers")
        .select("kode_guru")
        .eq("kode_guru", kodeGuru)
        .maybeSingle();

      if (existingTeacher) {
        const { error: updateError } = await supabase
          .from("teachers")
          .update({
            name,
            nip: nip || null,
            email: email || null,
            phone: phone || null,
            subject: subject || null,
          })
          .eq("kode_guru", kodeGuru);

        if (updateError) {
          errors.push(`Gagal update guru ${kodeGuru}: ${updateError.message}`);
          skipped++;
          continue;
        }

        imported++;
        continue;
      }

      const { error: insertError } = await supabase.from("teachers").insert({
        kode_guru: kodeGuru,
        name,
        nip: nip || null,
        email: email || null,
        phone: phone || null,
        subject: subject || null,
        password: defaultPassword,
      });

      if (insertError) {
        errors.push(`Gagal import ${kodeGuru}: ${insertError.message}`);
        skipped++;
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import guru error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses file" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST only" }, { status: 405 });
}


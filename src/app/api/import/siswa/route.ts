import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface StudentRow {
  NIS?: string;
  "Nama Lengkap"?: string;
  Nama?: string;
  name?: string;
  Email?: string;
  email?: string;
  "Nomor HP"?: string;
  HP?: string;
  phone?: string;
  Alamat?: string;
  Kelas?: string;
  kelas?: string;
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
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as StudentRow[];

    if (data.length === 0) {
      return NextResponse.json({ error: "File Excel kosong" }, { status: 400 });
    }

    const supabase = createClient();

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of data) {
      const nis = row.NIS || row["NIS"];
      const name = row["Nama Lengkap"] || row.Nama || row.name;
      const email = row.Email || row.email || "";
      const phone = row["Nomor HP"] || row.HP || row.phone || "";
      const className = row.Kelas || row.kelas || "";

      if (!nis || !name) {
        errors.push(`Baris tidak lengkap: ${name || "(tanpa nama)"} - ${nis || "(tanpa NIS)"}`);
        skipped++;
        continue;
      }

      let classId: string | null = null;
      if (className) {
        const { data: classData } = await supabase
          .from("classes")
          .select("id")
          .ilike("name", className.trim())
          .single();

        if (classData) {
          classId = classData.id;
        } else {
          errors.push(`Kelas "${className}" tidak ditemukan untuk NIS: ${nis}`);
        }
      }

      const defaultPassword = `${nis}@smkvetsa`;

      const { data: existingStudent } = await supabase
        .from("students")
        .select("nis")
        .eq("nis", nis)
        .single();

      if (existingStudent) {
        const { error: updateError } = await supabase
          .from("students")
          .update({
            name,
            email,
            phone,
            class_id: classId,
          })
          .eq("nis", existingStudent.nis);

        if (updateError) {
          errors.push(`Gagal update siswa ${nis}: ${updateError.message}`);
        } else {
          imported++;
        }
      } else {
        const { error: insertError } = await supabase.from("students").insert({
          nis,
          name,
          email,
          phone,
          class_id: classId,
          password: defaultPassword,
        });

        if (insertError) {
          errors.push(`Gagal import ${nis}: ${insertError.message}`);
          skipped++;
        } else {
          imported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses file" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST only" }, { status: 405 });
}

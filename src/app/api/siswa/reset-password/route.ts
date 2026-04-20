import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { nis } = await request.json();

    if (!nis || typeof nis !== "string") {
      return NextResponse.json(
        { error: "NIS wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("nis, name")
      .eq("nis", nis.trim())
      .single();

    if (fetchError || !student) {
      return NextResponse.json(
        { error: "NIS tidak ditemukan" },
        { status: 404 }
      );
    }

    const newPassword = `${nis}@smkvetsa`;

    const { error: updateError } = await supabase
      .from("students")
      .update({ password: newPassword })
      .eq("nis", student.nis);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal reset password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password berhasil di-reset",
      newPassword,
      studentName: student.name,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
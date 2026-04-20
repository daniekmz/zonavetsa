import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("nis")
      .eq("id", id)
      .single();

    if (fetchError || !student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    const newPassword = `${student.nis}@smkvetsa`;

    const { error: updateError } = await supabase
      .from("students")
      .update({ password_hash: newPassword })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal reset password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password berhasil di-reset ke default`,
      newPassword,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

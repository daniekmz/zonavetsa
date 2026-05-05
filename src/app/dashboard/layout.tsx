import { Metadata } from "next";
import { AIChatPopup } from "@/components/ai-chat-popup";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AIChatPopup />
    </>
  );
}

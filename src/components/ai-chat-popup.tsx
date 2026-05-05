"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bot, MessageSquare, Send, X, Loader2, Trash2, Download, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AIChatPopup() {
  const pathname = usePathname();
  const { user, role, checkSession } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; className?: string; role?: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Hydrate session on mount if missing
  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      checkSession();
    }
  }, [user, checkSession]);

  // 2. Load history from Database (Supabase)
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) {
        setMessages([]);
        return;
      }

      const supabase = createClient();
      
      // Try DB first
      const { data, error } = await supabase
        .from("ai_chat_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const formattedMessages: ChatMessage[] = data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content
        }));
        setMessages(formattedMessages);
      } else {
        // Fallback to localStorage for existing sessions
        const savedChat = localStorage.getItem(`zonavetsan_ai_chat_${user.id}`);
        if (savedChat) {
          try {
            setMessages(JSON.parse(savedChat));
          } catch (e) {}
        }
      }
    };

    loadHistory();
  }, [user?.id]);

  // Save history to Database & LocalStorage
  const saveMessageToDb = async (role: "user" | "ai", content: string) => {
    if (!user?.id) return;
    const supabase = createClient();
    
    // Save to DB (async, don't wait for UI)
    supabase.from("ai_chat_history").insert({
      user_id: user.id,
      role,
      content
    }).then(({ error }) => {
      if (error) console.error("Failed to sync AI chat to DB:", error);
    });

    // Still update localStorage as cache
    const currentMessages = [...messages, { id: Date.now().toString(), role, content }];
    localStorage.setItem(`zonavetsan_ai_chat_${user.id}`, JSON.stringify(currentMessages));
  };

  // Fetch detailed user info (class, etc.)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const supabase = createClient();
      let info = { name: user.name, role: user.role, className: "" };

      if (user.role === "siswa") {
        const { data: student } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (student && student.class_id) {
          const { data: cls } = await supabase
            .from("classes")
            .select("name")
            .eq("id", student.class_id)
            .single();
          if (cls) {
            info.className = cls.name;
          }
        }
      } else if (user.role === "guru") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (teacher && teacher.subject) {
          info.className = `Guru ${teacher.subject}`;
        }
      }
      
      setUserData(info);
    };

    fetchUserData();
  }, [user]);

  // Automatically show "Butuh Bantuan?" after 5 seconds of entering dashboard
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && messages.length === 0) {
        setShowNotification(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Determine role based on pathname
  const userRole = pathname.includes("/dashboard/guru")
    ? "guru"
    : pathname.includes("/dashboard/admin")
    ? "admin"
    : "siswa";

  const handleClearChat = () => {
    if (confirm("Hapus seluruh riwayat percakapan AI?")) {
      setMessages([]);
      if (user?.id) {
        localStorage.removeItem(`zonavetsan_ai_chat_${user.id}`);
        // Delete from DB
        const supabase = createClient();
        supabase.from("ai_chat_history").delete().eq("user_id", user.id).then();
      }
      setIsOpen(false);
    }
  };

  const getBestUserInfo = () => {
    let name = userData.name || user?.name;
    let roleName = userData.role || user?.role || userRole;
    let className = userData.className || "";

    if (!name && typeof window !== "undefined") {
      const sSiswa = sessionStorage.getItem("studentSession");
      const sGuru = sessionStorage.getItem("guruSession");
      const sAdmin = sessionStorage.getItem("adminSession");
      
      if (sSiswa) {
        const p = JSON.parse(sSiswa);
        name = p.student?.name;
        roleName = "siswa";
      } else if (sGuru) {
        const p = JSON.parse(sGuru);
        name = p.name;
        roleName = "guru";
      } else if (sAdmin) {
        const p = JSON.parse(sAdmin);
        name = p.name;
        roleName = "admin";
      }
    }
    
    return { name: name || "Pengguna", role: roleName, className };
  };

  const handleOpen = () => {
    setIsOpen(true);
    setShowNotification(false);
    
    if (messages.length === 0) {
      const info = getBestUserInfo();
      let greeting = `Halo! Saya Asisten AI ZonaVetsa.`;
      
      if (info.name && info.name !== "Pengguna") {
        if (info.role === "guru") {
          greeting = `Halo Bapak/Ibu ${info.name}${info.className ? ` (${info.className})` : ""}! Saya Asisten AI ZonaVetsa.`;
        } else {
          greeting = `Halo ${info.name}${info.className ? ` dari kelas ${info.className}` : ""}! Saya Asisten AI ZonaVetsa.`;
        }
      }
        
      setMessages([
        {
          id: "welcome",
          role: "ai",
          content: `${greeting} Ada yang bisa saya bantu terkait fitur ${
            userRole === "siswa" ? "belajar/tugas" : "mengelola kelas"
          } Anda hari ini?`,
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Save User Msg to DB
    saveMessageToDb("user", userMsg);
    
    // Add user message to UI
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", content: userMsg },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const info = getBestUserInfo();

      const identityContext = `IDENTITAS PENGGUNA:
- Nama: ${info.name}
- Role: ${info.role}
${info.className ? `- Kelas/Mapel: ${info.className}` : "- Info Tambahan: Tidak diketahui"}
(PENTING: Jangan berpura-pura tidak tahu nama pengguna. Jika ditanya siapa namanya, jawab: ${info.name})`;

      const chatHistory = newMessages
        .slice(-6) // Send last 6 messages as context
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          context: `${identityContext}\n\nRIWAYAT PERCAKAPAN:\n${chatHistory}`,
          role: userRole,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const detailedError = data.details ? `${data.error}: ${data.details}` : (data.message || data.error || "Gagal menghubungi server AI.");
        throw new Error(detailedError);
      }
      
      const aiResponse = data.result || "Maaf, saya tidak dapat merespon saat ini.";
      
      // Save AI Response to DB
      saveMessageToDb("ai", aiResponse);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: aiResponse,
        },
      ]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: `Error: ${error.message || "Terjadi kesalahan pada sistem AI."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ━━ Chat Window ━━ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 flex h-[450px] w-[350px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:w-[380px] sm:h-[500px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-navy to-teal px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot size={20} />
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">ZonaVetsa AI</h3>
                  <p className="text-[10px] text-teal-100 opacity-90">Asisten Cerdas Aktif</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="rounded-full p-1.5 transition-colors hover:bg-white/20"
                    title="Hapus Riwayat"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10, y: 5 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  className={`flex w-full ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`relative max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-teal text-white rounded-tr-sm"
                        : "bg-white text-slate-700 border border-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tl-sm"
                    }`}
                  >
                    <div className={msg.role === "ai" ? "ai-markdown-content" : "whitespace-pre-wrap"}>
                      {msg.role === "ai" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                    
                    {/* Render Download Button for Code Blocks (only for AI) */}
                    {msg.role === "ai" && msg.content.includes("```") && (
                      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        {(() => {
                          const codeBlocks: { lang: string; code: string }[] = [];
                          const regex = /```(\w+)?\s*\n([\s\S]*?)\s*```/g;
                          let match;
                          while ((match = regex.exec(msg.content)) !== null) {
                            codeBlocks.push({ lang: (match[1] || "txt").toLowerCase(), code: match[2].trim() });
                          }
                          
                          return codeBlocks.map((block, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const ext = block.lang === "html" ? "html" : 
                                            block.lang === "javascript" || block.lang === "js" ? "js" : 
                                            block.lang === "css" ? "css" : 
                                            block.lang === "python" || block.lang === "py" ? "py" : "txt";
                                const fileName = `contoh_file_${idx + 1}.${ext}`;
                                const blob = new Blob([block.code], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = fileName;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal/10 text-teal dark:bg-teal/20 rounded-lg text-[11px] font-bold hover:bg-teal hover:text-white transition-all active:scale-95 border border-teal/20"
                            >
                              <Download size={13} />
                              Download {block.lang.toUpperCase() || "File"}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex w-full justify-start"
                >
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="h-1.5 w-1.5 rounded-full bg-teal-400"
                    />
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-teal-400"
                    />
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="h-1.5 w-1.5 rounded-full bg-teal-400"
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan sesuatu..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl bg-teal text-white hover:bg-teal-600 disabled:opacity-50 shadow-lg shadow-teal/20"
              >
                <Send size={16} className={input.trim() ? "translate-x-0.5" : ""} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━ Notification Bubble ━━ */}
      <AnimatePresence>
        {showNotification && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="absolute bottom-[70px] right-2 z-40 cursor-pointer"
            onClick={handleOpen}
          >
            <div className="relative rounded-xl border border-teal-200 bg-white px-4 py-2 shadow-xl dark:border-teal-900 dark:bg-slate-900">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                Butuh bantuan?
              </p>
              {/* Triangle pointer */}
              <div className="absolute -bottom-2 right-4 h-4 w-4 rotate-45 border-b border-r border-teal-200 bg-white dark:border-teal-900 dark:bg-slate-900" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━ Floating Action Button ━━ */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
          isOpen
            ? "bg-white text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            : "bg-gradient-to-tr from-navy to-teal text-white ring-4 ring-teal/10"
        }`}
        aria-label="Tanya AI"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}


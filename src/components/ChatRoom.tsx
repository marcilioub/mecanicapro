import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabase";
import { User } from "../types";
import { useTheme } from "./ThemeContext";
import AttachmentUploader from "./AttachmentUploader";

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  activeChatUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  onBack: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser,
  users,
  activeChatUserId,
  onSelectUser,
  onBack,
}) => {
  const { theme, toggleTheme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* RESPONSIVO */
  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  /* BUSCAR MENSAGENS */
  useEffect(() => {
    if (!activeChatUserId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChatUserId}),and(sender_id.eq.${activeChatUserId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();
  }, [activeChatUserId, currentUser.id]);

  /* REALTIME */
  useEffect(() => {
    if (!activeChatUserId) return;

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new as Message;

          if (
            (newMessage.sender_id === currentUser.id &&
              newMessage.receiver_id === activeChatUserId) ||
            (newMessage.sender_id === activeChatUserId &&
              newMessage.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatUserId, currentUser.id]);

  /* MARCAR COMO LIDA */
  useEffect(() => {
    if (!activeChatUserId) return;

    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", currentUser.id)
        .eq("sender_id", activeChatUserId)
        .eq("read", false);
    };

    markAsRead();
  }, [messages, activeChatUserId, currentUser.id]);

  /* SCROLL AUTOMÁTICO */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ENVIAR MENSAGEM */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUserId) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: activeChatUserId,
      content: inputText.trim(),
      read: false,
    });

    if (!error) {
      setInputText("");
      inputRef.current?.focus();
    }
  };

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUser.id),
    [users, currentUser.id]
  );

  const activeUser = users.find((u) => u.id === activeChatUserId);

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
      {/* CONTATOS */}
      {!isMobile && (
        <div className="w-[360px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {otherUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                activeChatUserId === user.id ? "bg-primary/10" : ""
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>
      )}

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={onBack}>
                <span className="material-symbols-outlined">
                  arrow_back
                </span>
              </button>
            )}
            <span className="font-bold">
              {activeUser?.name || "Selecione uma conversa"}
            </span>
          </div>

          <button onClick={toggleTheme}>
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>

        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    isMine
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-slate-800"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>

                  <div className="text-[10px] opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        {activeChatUserId && (
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2"
          >
            <input
              ref={inputRef}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 h-11"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem..."
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-primary text-white rounded-full px-5"
            >
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;

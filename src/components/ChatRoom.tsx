import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ChatMessage } from '../types';
import { useTheme } from './ThemeContext';
import AttachmentUploader from './AttachmentUploader';

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  activeChatUserId: string | null;
  onSendMessage: (
    receiverId: string,
    text: string,
    attachment?: {
      url: string;
      name: string;
      size: number;
      mimeType: string;
      type: 'image' | 'document';
    }
  ) => void;
  onSelectUser: (userId: string | null) => void;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser,
  users,
  messages,
  activeChatUserId,
  onSendMessage,
  onSelectUser,
  onBack
}) => {

  const { theme, toggleTheme } = useTheme();
  const [inputText, setInputText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* -------------------------------------------------- */
  /* RESPONSIVO SEGURO (SEM QUEBRAR BUILD)             */
  /* -------------------------------------------------- */
  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  /* -------------------------------------------------- */
  /* USUÁRIOS                                           */
  /* -------------------------------------------------- */
  const otherUsers = useMemo(
    () => users.filter(u => u.id !== currentUser.id),
    [users, currentUser.id]
  );

  const activeUser = useMemo(
    () => users.find(u => u.id === activeChatUserId) || null,
    [users, activeChatUserId]
  );

  /* -------------------------------------------------- */
  /* CONVERSA ATIVA                                     */
  /* -------------------------------------------------- */
  const conversation = useMemo(() => {
    if (!activeChatUserId) return [];

    return messages
      .filter(m =>
        (m.senderId === currentUser.id && m.receiverId === activeChatUserId) ||
        (m.senderId === activeChatUserId && m.receiverId === currentUser.id)
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime()
      );
  }, [messages, activeChatUserId, currentUser.id]);

  /* -------------------------------------------------- */
  /* SCROLL AUTOMÁTICO                                  */
  /* -------------------------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  /* -------------------------------------------------- */
  /* MARCAR COMO LIDA                                   */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!activeChatUserId) return;

    const unread = conversation.filter(
      m => m.receiverId === currentUser.id && !m.read
    );

    if (unread.length > 0) {
      // Aqui você chama sua função de update no supabase
      // Exemplo:
      // markMessagesAsRead(activeChatUserId)
    }
  }, [conversation, activeChatUserId, currentUser.id]);

  /* -------------------------------------------------- */
  /* ENVIAR                                             */
  /* -------------------------------------------------- */
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUserId) return;

    onSendMessage(activeChatUserId, inputText.trim());
    setInputText('');
    inputRef.current?.focus();
  };

  const handleAttachmentUpload = (data: any) => {
    if (!activeChatUserId) return;
    onSendMessage(activeChatUserId, '', data);
  };

  /* -------------------------------------------------- */
  /* STATUS                                             */
  /* -------------------------------------------------- */
  const getMessageStatus = (msg: ChatMessage) => {
    if (msg.senderId !== currentUser.id) return null;

    if (msg.read)
      return { icon: 'done_all', color: 'text-sky-400' };

    if (msg.deliveredAt)
      return { icon: 'done_all', color: 'text-slate-400' };

    return { icon: 'done', color: 'text-slate-400' };
  };

  /* -------------------------------------------------- */
  /* RENDER                                             */
  /* -------------------------------------------------- */
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">

      {/* CONTATOS */}
      {!isMobile && (
        <div className="w-[360px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {otherUsers.map(user => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                activeChatUserId === user.id ? 'bg-primary/10' : ''
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>
      )}

      {/* ÁREA DO CHAT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={onBack}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <span className="font-bold">
              {activeUser?.name || 'Selecione uma conversa'}
            </span>
          </div>

          <button onClick={toggleTheme}>
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {conversation.map(msg => {
            const isMine = msg.senderId === currentUser.id;
            const status = getMessageStatus(msg);

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    isMine
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>

                  <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}

                    {status && (
                      <span
                        className={`material-symbols-outlined text-[14px] ${status.color}`}
                      >
                        {status.icon}
                      </span>
                    )}
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
            <AttachmentUploader
              onUploadComplete={handleAttachmentUpload}
              onError={setUploadError}
            />

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

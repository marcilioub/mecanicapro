import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ChatMessage } from '../types';
import { useTheme } from './ThemeContext';
import AttachmentUploader from './AttachmentUploader';

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  activeChatUserId: string | null;
  onSendMessage: (receiverId: string, text: string, attachment?: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    type: 'image' | 'document';
  }) => void;
  onSelectUser: (userId: string) => void;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser, users, messages, activeChatUserId, onSendMessage, onSelectUser, onBack
}) => {
  const { theme, toggleTheme } = useTheme();
  const [inputText, setInputText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const activeUser = activeChatUserId ? users.find(u => u.id === activeChatUserId) : null;

  const getUnreadCount = (userId: string) => {
    return messages.filter(m =>
      m.senderId?.toString() === userId?.toString() &&
      m.receiverId?.toString() === currentUser.id?.toString() &&
      !m.read
    ).length;
  };

  const getLastMessage = (userId: string) => {
    const userMsgs = messages.filter(m => {
      const sId = m.senderId?.toString();
      const rId = m.receiverId?.toString();
      const cId = currentUser.id?.toString();
      const uId = userId?.toString();

      return (sId === cId && rId === uId) || (sId === uId && rId === cId);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userMsgs[0];
  };

  const sortedUsers = useMemo(() => {
    return [...otherUsers].sort((a, b) => {
      const unreadA = getUnreadCount(a.id);
      const unreadB = getUnreadCount(b.id);

      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;

      const lastA = getLastMessage(a.id);
      const lastB = getLastMessage(b.id);

      if (lastA && lastB) {
        return new Date(lastB.timestamp).getTime() - new Date(lastA.timestamp).getTime();
      }

      if (lastA && !lastB) return -1;
      if (!lastA && lastB) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [otherUsers, messages, currentUser.id]);

  const conversation = useMemo(() => {
    return messages.filter(m => {
      const sId = m.senderId?.toString();
      const rId = m.receiverId?.toString();
      const cId = currentUser.id?.toString();
      const aId = activeChatUserId?.toString();

      return (sId === cId && rId === aId) || (sId === aId && rId === cId);
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, activeChatUserId, currentUser.id]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    conversation.forEach(msg => {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [conversation]);

  useEffect(() => {
    if (conversation.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatUserId) return;
    onSendMessage(activeChatUserId, inputText.trim());
    setInputText('');
    inputRef.current?.focus();
  };

  const handleAttachmentUpload = (data: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    type: 'image' | 'document';
  }) => {
    if (!activeChatUserId) return;
    onSendMessage(activeChatUserId, '', data);
    inputRef.current?.focus();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getMessageStatus = (msg: ChatMessage, isMine: boolean) => {
    if (!isMine) return null;

    if (msg.read) {
      return { icon: 'done_all', color: 'text-sky-400', title: 'Lida' };
    }
    if (msg.deliveredAt) {
      return { icon: 'done_all', color: 'text-slate-400', title: 'Entregue' };
    }
    return { icon: 'done', color: 'text-slate-400', title: 'Enviada' };
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const messageType = msg.messageType || 'text';

    if (messageType === 'image' && msg.attachmentUrl) {
      return (
        <div className="space-y-2">
          <img
            src={msg.attachmentUrl}
            alt={msg.attachmentName || 'Imagem'}
            className="max-w-[280px] rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewImage(msg.attachmentUrl!)}
          />
          {msg.text && <p className="text-sm">{msg.text}</p>}
        </div>
      );
    }

    if (messageType === 'document' && msg.attachmentUrl) {
      return (
        <div className="space-y-2">
          <a
            href={msg.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">description</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{msg.attachmentName || 'Documento'}</p>
              <p className="text-[10px] opacity-60">{formatFileSize(msg.attachmentSize || 0)}</p>
            </div>
            <span className="material-symbols-outlined text-xl opacity-50">download</span>
          </a>
          {msg.text && <p className="text-sm">{msg.text}</p>}
        </div>
      );
    }

    return <p className="text-sm leading-relaxed">{msg.text}</p>;
  };

  // Desktop layout check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Contact List Component
  const ContactList = () => (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={onBack}
                className="size-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <h1 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white">Chat</h1>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest">Mensagens</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="md:hidden size-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500"
          >
            <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-40">person_search</span>
            <p className="text-sm font-bold">Nenhum contato disponível</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedUsers.map(user => {
              const lastMsg = getLastMessage(user.id);
              const unreadCount = getUnreadCount(user.id);
              const isActive = user.id === activeChatUserId;

              return (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${isActive ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="size-14 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-900 shadow-md">
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-white dark:border-slate-900 ${user.active ? 'bg-green-500' : 'bg-slate-300'
                      }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      {lastMsg && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(lastMsg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-500 truncate flex-1">
                        {lastMsg ? (
                          <>
                            {lastMsg.senderId === currentUser.id && (
                              <span className="text-primary opacity-70">Você: </span>
                            )}
                            {lastMsg.messageType === 'image' ? '📷 Foto' :
                              lastMsg.messageType === 'document' ? '📄 Documento' :
                                lastMsg.text}
                          </>
                        ) : (
                          <span className="italic opacity-50">Iniciar conversa</span>
                        )}
                      </p>
                      {unreadCount > 0 && (
                        <span className="size-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Chat Area Component
  const ChatArea = () => (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-5 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectUser('')}
              className="size-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="size-11 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-700 shadow">
              <img src={activeUser?.avatar} alt={activeUser?.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">{activeUser?.name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${activeUser?.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {activeUser?.active ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
            <div className="size-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-4xl opacity-40">chat</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Nenhuma mensagem ainda</p>
              <p className="text-xs opacity-60 mt-1">Envie uma mensagem para {activeUser?.name?.split(' ')[0]}</p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>

              {group.messages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const status = getMessageStatus(msg, isMine);

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}
                  >
                    <div
                      className={`max-w-[80%] md:max-w-[65%] p-3 rounded-2xl shadow-sm ${isMine
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
                        }`}
                    >
                      {renderMessageContent(msg)}

                      <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {status && (
                          <span className={`material-symbols-outlined text-[14px] ${status.color}`} title={status.title}>
                            {status.icon}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Error toast */}
      {uploadError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {uploadError}
        </div>
      )}

      {/* Input */}
      <footer className="sticky bottom-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <AttachmentUploader
            onUploadComplete={handleAttachmentUpload}
            onError={setUploadError}
            disabled={!activeChatUserId}
          />

          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-full h-12 px-5 text-sm font-medium focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-slate-400"
              placeholder="Digite sua mensagem..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="size-12 flex items-center justify-center bg-primary text-white rounded-full shadow-lg shadow-primary/30 active:scale-90 disabled:opacity-40 disabled:shadow-none transition-all"
          >
            <span className="material-symbols-outlined filled text-xl">send</span>
          </button>
        </form>
      </footer>
    </div>
  );

  // Image preview modal
  const ImagePreviewModal = () => (
    previewImage && (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={() => setPreviewImage(null)}
      >
        <button
          className="absolute top-4 right-4 size-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          onClick={() => setPreviewImage(null)}
        >
          <span className="material-symbols-outlined text-white text-2xl">close</span>
        </button>
        <img
          src={previewImage}
          alt="Preview"
          className="max-w-full max-h-full rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={previewImage}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 px-6 py-3 bg-white text-slate-900 font-bold rounded-full flex items-center gap-2 hover:bg-slate-100 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined">download</span>
          Baixar
        </a>
      </div>
    )
  );

  // Main layout
  return (
    <div className="flex h-[calc(100vh-80px)] md:h-screen bg-background-light dark:bg-background-dark overflow-hidden font-sans">
      {/* Desktop: Side-by-side layout */}
      {!isMobile ? (
        <>
          {/* Contact list */}
          <div className="w-[380px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <ContactList />
          </div>

          {/* Chat area */}
          <div className="flex-1">
            {activeChatUserId ? (
              <ChatArea />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="size-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner mb-6">
                  <span className="material-symbols-outlined text-5xl opacity-30">forum</span>
                </div>
                <h2 className="text-lg font-bold mb-2">MecânicaPro Chat</h2>
                <p className="text-sm opacity-60">Selecione uma conversa para começar</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Mobile: Single view */
        activeChatUserId ? <ChatArea /> : <ContactList />
      )}

      <ImagePreviewModal />
    </div>
  );
};

export default ChatRoom;

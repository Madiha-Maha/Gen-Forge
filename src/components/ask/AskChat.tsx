import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Edit2,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Conversation, ChatMessageItem, GroundingSource } from '../../types/index.ts';

const STARTER_QUESTIONS = [
  'What is the algorithmic time complexity of quickselect in the average vs worst case?',
  'How does copy-on-write (COW) memory paging operate in Linux?',
  'What are the key architectural changes in the ECMAScript 2026 decorators specification?',
  'Explain the differences between TLS 1.2 and TLS 1.3 handshake mechanisms.',
];

export const AskChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('gf_ask_conversations');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    const defaultConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return [defaultConv];
  });

  const [activeConvId, setActiveConvId] = useState<string>(() => conversations[0]?.id || 'default');
  const [inputPrompt, setInputPrompt] = useState('');
  const [enableSearch, setEnableSearch] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active conversation
  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gf_ask_conversations', JSON.stringify(conversations));
    } catch (_e) {}
  }, [conversations]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, isStreaming]);

  const updateActiveConversationMessages = (updater: (prev: ChatMessageItem[]) => ChatMessageItem[]) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConvId) {
          const newMessages = updater(conv.messages);
          // Auto update title if first message
          let newTitle = conv.title;
          if (conv.title === 'New Conversation' && newMessages.length > 0) {
            newTitle = newMessages[0].content.slice(0, 32) + (newMessages[0].content.length > 32 ? '...' : '');
          }
          return {
            ...conv,
            title: newTitle,
            messages: newMessages,
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    if (!promptToSend || isStreaming) return;

    setErrorMessage(null);
    setInputPrompt('');
    setEditingMessageId(null);

    const userMessage: ChatMessageItem = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
    };

    const assistantMessageId = `msg_a_${Date.now() + 1}`;
    const initialAssistantMessage: ChatMessageItem = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const updatedHistory = [...activeConv.messages, userMessage];
    updateActiveConversationMessages(() => [...updatedHistory, initialAssistantMessage]);

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      // Build API payload: send up to last 20 messages
      const apiMessages = updatedHistory.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          enableSearch,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        throw new Error(errorData.error || 'Failed to stream response');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream available.');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let receivedSources: GroundingSource[] = [];
      let receivedDisclaimer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (eventType === 'chunk' && parsed.text) {
                accumulatedText += parsed.text;
                updateActiveConversationMessages((msgs) =>
                  msgs.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: accumulatedText, isStreaming: true }
                      : m
                  )
                );
              } else if (eventType === 'sources' && Array.isArray(parsed.sources)) {
                receivedSources = parsed.sources;
              } else if (eventType === 'disclaimer' && parsed.disclaimer) {
                receivedDisclaimer = parsed.disclaimer;
              } else if (eventType === 'error') {
                throw new Error(parsed.error);
              }
            } catch (jsonErr) {
              // Ignore partial JSON
            }
          }
        }
      }

      // Finalize assistant message
      updateActiveConversationMessages((msgs) =>
        msgs.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: accumulatedText || 'No response returned.',
                sources: receivedSources.length > 0 ? receivedSources : undefined,
                disclaimer: receivedDisclaimer || undefined,
                isStreaming: false,
              }
            : m
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped generation manually
        updateActiveConversationMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: (m.content || '') + ' [Stopped by user]', isStreaming: false }
              : m
          )
        );
      } else {
        setErrorMessage(err.message || 'Stream connection interrupted.');
        updateActiveConversationMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = () => {
    if (isStreaming || activeConv.messages.length === 0) return;
    // Find last user prompt
    const userMsgs = activeConv.messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;
    const lastPrompt = userMsgs[userMsgs.length - 1].content;

    // Remove last assistant message
    updateActiveConversationMessages((msgs) => {
      const last = msgs[msgs.length - 1];
      if (last.role === 'assistant') {
        return msgs.slice(0, -1);
      }
      return msgs;
    });

    handleSendMessage(lastPrompt);
  };

  const handleEditLastMessage = () => {
    const userMsgs = activeConv.messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    setInputPrompt(lastUserMsg.content);
    setEditingMessageId(lastUserMsg.id);

    // Remove last user & assistant messages
    updateActiveConversationMessages((msgs) => {
      const idx = msgs.findIndex((m) => m.id === lastUserMsg.id);
      if (idx !== -1) {
        return msgs.slice(0, idx);
      }
      return msgs;
    });
  };

  const handleCreateNewConversation = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setInputPrompt('');
    setErrorMessage(null);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      handleCreateNewConversation();
      return;
    }
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeConvId === id) {
      setActiveConvId(filtered[0]?.id || '');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-53px)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Conversations Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/70 p-3 hidden md:flex flex-col justify-between">
        <div className="space-y-3">
          <button
            onClick={handleCreateNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-2">
            Recent Conversations
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                  conv.id === activeConvId
                    ? 'bg-slate-900 text-white font-medium border border-slate-800'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer note in sidebar */}
        <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Honest Note</span>
          </div>
          <p className="leading-relaxed">
            AI can make mistakes. GenForge never invents sources or citations. Verify critical claims.
          </p>
        </div>
      </aside>

      {/* Main Chat Stream Container */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {activeConv.messages.length === 0 ? (
            /* Google-style Zero State */
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 shadow-xl shadow-indigo-600/10">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Ask GenForge Anything
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  A high-precision technical question-answering assistant with live search grounding and real cited sources.
                </p>
              </div>

              {/* Starter Question Chips */}
              <div className="grid sm:grid-cols-2 gap-2.5 text-left pt-4">
                {STARTER_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-600/60 text-xs text-slate-300 hover:text-white transition group flex items-start justify-between"
                  >
                    <span>{q}</span>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 flex-shrink-0 ml-2 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm w-full'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-white/10 text-xs opacity-75">
                      <span className="font-semibold">
                        {msg.role === 'user' ? 'You' : 'GenForge Ask'}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-white transition"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Disclaimer Banner if present */}
                    {msg.disclaimer && (
                      <div className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{msg.disclaimer}</span>
                      </div>
                    )}

                    {/* Content formatted with pre-wrap */}
                    <div className="whitespace-pre-wrap font-sans text-sm">
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                      )}
                    </div>

                    {/* Cited Web Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-2">
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Searched the web • Cited Sources ({msg.sources.length})</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white transition truncate group"
                            >
                              <span className="truncate text-[11px] font-medium">
                                [{sIdx + 1}] {src.title || src.url}
                              </span>
                              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 ml-1.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Control Bar & Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Action Buttons for Active Chat */}
            {activeConv.messages.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEnableSearch(!enableSearch)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition ${
                      enableSearch
                        ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Web Search: {enableSearch ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    onClick={handleRegenerate}
                    disabled={isStreaming}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-50 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>

                  <button
                    onClick={handleEditLastMessage}
                    disabled={isStreaming}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-50 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Last</span>
                  </button>
                </div>

                {isStreaming && (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 font-medium transition"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            )}

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-white font-semibold ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  editingMessageId
                    ? 'Editing last prompt (Enter to send)...'
                    : 'Ask a question (Shift+Enter for newline)...'
                }
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-2xl py-3.5 pl-4 pr-14 text-sm text-white placeholder-slate-500 focus:outline-none resize-none transition"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isStreaming}
                className="absolute right-2.5 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition shadow-md shadow-indigo-600/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

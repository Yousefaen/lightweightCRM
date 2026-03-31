import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Trash2 } from 'lucide-react';
import { buildCrmContext, sendCopilotMessage, parseMemoryBlocks, parseSaveContactBlocks } from '../lib/copilot';
import { loadCopilotMemory, saveCopilotMemory } from '../lib/storage';
import CopilotMessage from './CopilotMessage';

export default function CopilotPanel({
  isOpen,
  onClose,
  session,
  contacts,
  outreach,
  writingSamples,
  currentView,
  selectedContactId,
  onAddContact,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copilotMemory, setCopilotMemory] = useState(() => loadCopilotMemory());
  const [modelUsed, setModelUsed] = useState(null);
  const [messageSuggestions, setMessageSuggestions] = useState({});
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    let userContent = trimmed;
    if (currentView === 'contacts' && selectedContactId) {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        userContent = `[Context: viewing ${contact.name} at ${contact.company}]\n\n${trimmed}`;
      }
    }

    const userMsg = { role: 'user', content: userContent };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const crmContext = buildCrmContext({ contacts, outreach, writingSamples, copilotMemory });

      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendCopilotMessage({
        messages: apiMessages,
        crmContext,
        onModelChange: (model) => setModelUsed(model),
      });

      setModelUsed(response._model);
      const assistantMsg = { role: 'assistant', content: response.content };
      const newMessages = [...nextMessages, assistantMsg];
      setMessages(newMessages);

      const newMemories = parseMemoryBlocks(response.content);
      if (Object.keys(newMemories).length > 0) {
        const updated = { ...copilotMemory, ...newMemories };
        setCopilotMemory(updated);
        saveCopilotMemory(updated);
      }

      const suggested = parseSaveContactBlocks(response.content);
      if (suggested.length > 0) {
        setMessageSuggestions((prev) => ({ ...prev, [newMessages.length - 1]: suggested }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = (contactData) => {
    const now = new Date().toISOString().split('T')[0];
    onAddContact({
      id: crypto.randomUUID(),
      name: contactData.name,
      title: contactData.title || '',
      company: contactData.company || '',
      email: contactData.email || '',
      linkedinUrl: contactData.linkedinUrl || '',
      tags: [],
      notes: contactData.notes || '',
      status: 'active',
      followUpDate: null,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    setMessageSuggestions({});
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const memoryCount = Object.keys(copilotMemory).length;

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 z-40 bg-zinc-50 shadow-2xl rounded-l-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-zinc-200/60 rounded-tl-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles size={16} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">AI Copilot</h2>
            <p className="text-xs text-zinc-400">
              {modelUsed?.includes('opus') ? 'Opus' : modelUsed?.includes('sonnet') ? 'Sonnet (fallback)' : 'Opus'}
              {memoryCount > 0 ? ` · ${memoryCount} memories` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-zinc-400 mt-12 space-y-3">
            <Sparkles size={32} className="mx-auto text-zinc-300" />
            <p className="font-medium text-zinc-500">How can I help?</p>
            <div className="space-y-1.5 text-xs">
              <p>"Who should I follow up with?"</p>
              <p>"Find me 3 supply chain AI leads at Gartner"</p>
              <p>"Draft a follow-up for Sameer"</p>
              <p>"What's my response rate by channel?"</p>
              <p>"Research [person] and suggest outreach"</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <CopilotMessage
            key={i}
            message={msg}
            suggestedContacts={messageSuggestions[i] || []}
            onSaveContact={handleSaveContact}
          />
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-zinc-200/60 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Researching...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200/60 rounded-xl p-2.5 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="p-4 bg-white border-t border-zinc-200/60 rounded-bl-2xl">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your outreach..."
            rows="2"
            className="flex-1 px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="self-end p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

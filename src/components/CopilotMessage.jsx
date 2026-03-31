import { ExternalLink, Globe, UserPlus, Check } from 'lucide-react';
import { useState } from 'react';

export default function CopilotMessage({ message, suggestedContacts = [], onSaveContact }) {
  const isUser = message.role === 'user';
  const [savedIndices, setSavedIndices] = useState(new Set());

  const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }];

  const textBlocks = blocks.filter((b) => b.type === 'text');
  const searchResults = blocks.filter((b) => b.type === 'web_search_tool_result');

  const citations = [];
  searchResults.forEach((result) => {
    if (Array.isArray(result.content)) {
      result.content.forEach((item) => {
        if (item.type === 'web_search_result') {
          citations.push({ title: item.title, url: item.url, snippet: item.page_snippet || '' });
        }
      });
    }
  });

  const displayText = (text) => {
    return text.replace(/\[MEMORY\]\s*\nkey:\s*.+\ncontent:\s*[\s\S]*?\n\[\/MEMORY\]/g, '').trim();
  };

  const handleSave = (contact, idx) => {
    onSaveContact(contact);
    setSavedIndices((prev) => new Set([...prev, idx]));
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md'
            : 'bg-white text-zinc-900 border border-zinc-200/60 rounded-2xl rounded-tl-md shadow-sm'
        }`}
      >
        {textBlocks.map((block, i) => (
          <div key={i} className="whitespace-pre-wrap">{displayText(block.text)}</div>
        ))}

        {citations.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-zinc-200/60 pt-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
              <Globe size={12} /> Sources
            </div>
            {citations.slice(0, 5).map((cite, i) => (
              <a
                key={i}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-zinc-50 rounded-lg p-2 hover:bg-zinc-100 transition-colors"
              >
                <div className="flex items-center gap-1 text-xs font-medium text-indigo-600">
                  {cite.title}
                  <ExternalLink size={10} />
                </div>
                {cite.snippet && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{cite.snippet}</p>
                )}
              </a>
            ))}
          </div>
        )}

        {suggestedContacts.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-zinc-200/60 pt-3">
            <div className="text-xs text-zinc-500 font-medium">Suggested contacts to save:</div>
            {suggestedContacts.map((contact, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-50 rounded-lg p-2">
                <div className="text-xs">
                  <p className="font-medium text-zinc-900">{contact.name}</p>
                  <p className="text-zinc-500">{contact.title}{contact.company ? ` at ${contact.company}` : ''}</p>
                </div>
                <button
                  onClick={() => handleSave(contact, i)}
                  disabled={savedIndices.has(i)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    savedIndices.has(i)
                      ? 'bg-green-50 text-green-700'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {savedIndices.has(i) ? (
                    <><Check size={12} /> Saved</>
                  ) : (
                    <><UserPlus size={12} /> Save</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

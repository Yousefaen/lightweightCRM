import { useState } from 'react';
import { Plus, Trash2, X, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateProfile } from '../lib/storage';

export default function Settings({
  session,
  profile,
  onProfileUpdate,
  writingSamples,
  onAddSample,
  onDeleteSample,
}) {
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleLabel, setSampleLabel] = useState('');
  const [sampleContent, setSampleContent] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');

  const handleAddSample = () => {
    if (!sampleLabel || !sampleContent) {
      alert('Label and content are required');
      return;
    }
    onAddSample({
      id: crypto.randomUUID(),
      label: sampleLabel,
      content: sampleContent,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setSampleLabel('');
    setSampleContent('');
    setShowSampleModal(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    try {
      const updated = await updateProfile(session.user.id, { display_name: displayName.trim() });
      onProfileUpdate(updated);
      setEditingName(false);
    } catch (e) {
      alert('Failed to update name: ' + e.message);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow';

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-indigo-500" /> Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <p className="text-zinc-500 text-sm">{session.user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Display Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                  <button
                    onClick={handleUpdateName}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 text-sm font-medium transition-all active:scale-[0.98]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setDisplayName(profile?.display_name || '');
                    }}
                    className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-200 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-zinc-500 text-sm">{profile?.display_name || 'Not set'}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-500 text-sm font-medium mt-2 transition-colors"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-zinc-900">Writing Samples</h2>
            <button
              onClick={() => setShowSampleModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 flex items-center text-sm font-medium transition-all active:scale-[0.98]"
            >
              <Plus size={16} className="mr-1.5" /> Add Sample
            </button>
          </div>

          <div className="space-y-3">
            {writingSamples.map((sample) => (
              <div key={sample.id} className="border border-zinc-200/60 rounded-xl p-4 hover:bg-zinc-50/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm text-zinc-900">{sample.label}</h3>
                  <button
                    onClick={() => onDeleteSample(sample.id)}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-zinc-500 text-sm line-clamp-3">{sample.content}</p>
              </div>
            ))}
            {writingSamples.length === 0 && (
              <p className="text-zinc-400 text-sm py-4 text-center">No writing samples yet.</p>
            )}
          </div>
        </div>
      </div>

      {showSampleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-zinc-900">Add Writing Sample</h2>
              <button
                onClick={() => setShowSampleModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Label</label>
                <input
                  type="text"
                  value={sampleLabel}
                  onChange={(e) => setSampleLabel(e.target.value)}
                  placeholder="e.g., LinkedIn InMail - Cold outreach to analyst"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Content</label>
                <textarea
                  value={sampleContent}
                  onChange={(e) => setSampleContent(e.target.value)}
                  rows="8"
                  placeholder="Paste your writing sample here..."
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              </div>
              <button
                onClick={handleAddSample}
                className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-500 font-medium transition-all active:scale-[0.98]"
              >
                Save Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

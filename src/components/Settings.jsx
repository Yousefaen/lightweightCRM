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

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <div className="bg-white rounded-lg shadow p-8 space-y-8">
        {/* Profile Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={20} /> Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
              <p className="text-slate-600 text-sm">{session.user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Display Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleUpdateName}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setDisplayName(profile?.display_name || '');
                    }}
                    className="bg-slate-200 text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-300 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-slate-600 text-sm">{profile?.display_name || 'Not set'}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium mt-2"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        {/* Writing Samples */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Writing Samples</h2>
            <button
              onClick={() => setShowSampleModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus size={18} className="mr-2" /> Add Sample
            </button>
          </div>

          <div className="space-y-4">
            {writingSamples.map((sample) => (
              <div key={sample.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-900">{sample.label}</h3>
                  <button
                    onClick={() => onDeleteSample(sample.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-slate-600 text-sm line-clamp-3">{sample.content}</p>
              </div>
            ))}
            {writingSamples.length === 0 && (
              <p className="text-slate-500 text-sm">No writing samples yet.</p>
            )}
          </div>
        </div>
      </div>

      {showSampleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Add Writing Sample</h2>
              <button
                onClick={() => setShowSampleModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Label</label>
                <input
                  type="text"
                  value={sampleLabel}
                  onChange={(e) => setSampleLabel(e.target.value)}
                  placeholder="e.g., LinkedIn InMail - Cold outreach to analyst"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Content</label>
                <textarea
                  value={sampleContent}
                  onChange={(e) => setSampleContent(e.target.value)}
                  rows="8"
                  placeholder="Paste your writing sample here..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleAddSample}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
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

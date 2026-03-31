import { useState, useCallback, useEffect } from 'react';
import { Home, Users, PenTool, Settings as SettingsIcon, Clock, MessageSquare, Search } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  loadData,
  saveContact,
  deleteContact as deleteContactDb,
  saveOutreach,
  updateOutreachStatus as updateOutreachStatusDb,
  setFollowUp as setFollowUpDb,
  saveSample,
  deleteSample as deleteSampleDb,
  loadProfile,
  loadProfiles,
} from './lib/storage';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ContactList from './components/ContactList';
import ContactDetail from './components/ContactDetail';
import ContactForm from './components/ContactForm';
import Drafter from './components/Drafter';
import SettingsView from './components/Settings';
import FollowUpList from './components/FollowUpList';
import CopilotPanel from './components/CopilotPanel';
import Prospector from './components/Prospector';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [drafterContactId, setDrafterContactId] = useState('');
  const [copilotOpen, setCopilotOpen] = useState(false);

  const { contacts = [], outreach = [], writingSamples = [] } = data || {};

  // ─── Auth listener ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Load data when session is ready ────────────────────
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [crmData, prof, allProfiles] = await Promise.all([
          loadData(),
          loadProfile(session.user.id),
          loadProfiles(),
        ]);
        setData(crmData);
        setProfile(prof);
        setProfiles(allProfiles);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // ─── Refresh helper ─────────────────────────────────────
  const refresh = useCallback(async () => {
    const crmData = await loadData();
    setData(crmData);
  }, []);

  // ─── Contact CRUD ───────────────────────────────────────
  const addContact = async (contact) => {
    const saved = await saveContact({ ...contact, createdBy: session.user.id });
    setData((d) => ({ ...d, contacts: [saved, ...d.contacts] }));
    setShowContactForm(false);
  };

  const addContactSilent = async (contact) => {
    const saved = await saveContact({ ...contact, createdBy: session.user.id });
    setData((d) => ({ ...d, contacts: [saved, ...d.contacts] }));
  };

  const updateContact = async (updated) => {
    const saved = await saveContact(updated);
    setData((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === saved.id ? saved : c)),
    }));
    setShowContactForm(false);
    setEditingContact(null);
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this contact and all their outreach?')) return;
    await deleteContactDb(id);
    setData((d) => ({
      ...d,
      contacts: d.contacts.filter((c) => c.id !== id),
      outreach: d.outreach.filter((o) => o.contactId !== id),
    }));
    if (selectedContactId === id) setSelectedContactId(null);
  };

  // ─── Outreach ───────────────────────────────────────────
  const logOutreach = async (entry) => {
    const saved = await saveOutreach({ ...entry, createdBy: session.user.id });
    setData((d) => ({ ...d, outreach: [saved, ...d.outreach] }));
  };

  const handleUpdateOutreachStatus = async (entryId, newStatus) => {
    await updateOutreachStatusDb(entryId, newStatus);
    setData((d) => ({
      ...d,
      outreach: d.outreach.map((o) =>
        o.id === entryId ? { ...o, status: newStatus } : o
      ),
    }));
  };

  const handleSetFollowUp = async (contactId, date) => {
    await setFollowUpDb(contactId, date);
    setData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === contactId ? { ...c, followUpDate: date } : c
      ),
    }));
  };

  // ─── Writing Samples ───────────────────────────────────
  const addSample = async (sample) => {
    const saved = await saveSample({ ...sample, createdBy: session.user.id });
    setData((d) => ({ ...d, writingSamples: [saved, ...d.writingSamples] }));
  };

  const handleDeleteSample = async (id) => {
    if (!window.confirm('Delete this writing sample?')) return;
    await deleteSampleDb(id);
    setData((d) => ({
      ...d,
      writingSamples: d.writingSamples.filter((s) => s.id !== id),
    }));
  };

  // ─── Navigation helpers ─────────────────────────────────
  const openContact = (id) => {
    setSelectedContactId(id);
    setView('contacts');
  };

  const openDrafter = (contact) => {
    setDrafterContactId(contact.id);
    setView('drafter');
  };

  const openEditForm = (contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const openAddForm = () => {
    setEditingContact(null);
    setShowContactForm(true);
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // ─── Auth guard ─────────────────────────────────────────
  if (session === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-lg">Loading...</div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { key: 'contacts', label: 'Contacts', icon: <Users size={20} /> },
    { key: 'followups', label: 'Follow-ups', icon: <Clock size={20} /> },
    { key: 'prospector', label: 'Prospect', icon: <Search size={20} /> },
    { key: 'drafter', label: 'Draft', icon: <PenTool size={20} /> },
    { key: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
  ];

  const displayName = profile?.display_name || session.user.email?.split('@')[0] || 'there';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white h-screen flex flex-col p-6">
        <div className="text-2xl font-bold mb-12">Outreach CRM</div>
        <nav className="space-y-4 flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                setSelectedContactId(null);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                view === item.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {view === 'dashboard' && (
          <Dashboard
            contacts={contacts}
            outreach={outreach}
            profiles={profiles}
            displayName={displayName}
            onSelectContact={openContact}
            onNavigate={setView}
          />
        )}

        {view === 'contacts' && !selectedContact && (
          <ContactList
            contacts={contacts}
            outreach={outreach}
            onSelect={openContact}
            onAdd={openAddForm}
            onEdit={openEditForm}
            onDelete={handleDeleteContact}
          />
        )}

        {view === 'contacts' && selectedContact && (
          <div className="p-8">
            <ContactDetail
              contact={selectedContact}
              outreach={outreach}
              profiles={profiles}
              onBack={() => setSelectedContactId(null)}
              onEdit={openEditForm}
              onDraft={openDrafter}
              onLogOutreach={logOutreach}
              onUpdateOutreachStatus={handleUpdateOutreachStatus}
              onSetFollowUp={handleSetFollowUp}
            />
          </div>
        )}

        {view === 'followups' && (
          <FollowUpList
            contacts={contacts}
            onSelectContact={openContact}
          />
        )}

        {view === 'prospector' && (
          <Prospector
            session={session}
            contacts={contacts}
            outreach={outreach}
            writingSamples={writingSamples}
            onAddContact={addContactSilent}
            onLogOutreach={logOutreach}
          />
        )}

        {view === 'drafter' && (
          <Drafter
            contacts={contacts}
            outreach={outreach}
            writingSamples={writingSamples}
            session={session}
            preselectedContactId={drafterContactId}
            onSaveAsOutreach={(entry) => {
              logOutreach(entry);
              setDrafterContactId('');
            }}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            session={session}
            profile={profile}
            onProfileUpdate={setProfile}
            writingSamples={writingSamples}
            onAddSample={addSample}
            onDeleteSample={handleDeleteSample}
          />
        )}
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactForm
          contact={editingContact}
          onSave={editingContact ? updateContact : addContact}
          onClose={() => {
            setShowContactForm(false);
            setEditingContact(null);
          }}
        />
      )}

      {/* Copilot Toggle Button */}
      <button
        onClick={() => setCopilotOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 flex items-center justify-center transition-transform hover:scale-105"
        title="AI Copilot"
      >
        <MessageSquare size={24} />
      </button>

      {/* Copilot Panel */}
      <CopilotPanel
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        session={session}
        contacts={contacts}
        outreach={outreach}
        writingSamples={writingSamples}
        currentView={view}
        selectedContactId={selectedContactId}
        onAddContact={addContactSilent}
      />
    </div>
  );
}

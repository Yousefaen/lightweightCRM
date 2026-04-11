import { useState, useCallback, useEffect } from 'react';
import { Home, Users, PenTool, Settings as SettingsIcon, Clock, MessageSquare, Search, LogOut, Zap } from 'lucide-react';
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
import Automation from './components/Automation';

export default function App() {
  const [session, setSession] = useState(undefined);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const refresh = useCallback(async () => {
    const crmData = await loadData();
    setData(crmData);
  }, []);

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

  if (session === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-400 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-400 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { key: 'contacts', label: 'Contacts', icon: <Users size={20} /> },
    { key: 'followups', label: 'Follow-ups', icon: <Clock size={20} /> },
    { key: 'prospector', label: 'Prospect', icon: <Search size={20} /> },
    { key: 'automation', label: 'Automation', icon: <Zap size={20} /> },
    { key: 'drafter', label: 'Draft', icon: <PenTool size={20} /> },
    { key: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
  ];

  const displayName = profile?.display_name || session.user.email?.split('@')[0] || 'there';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white h-screen flex flex-col">
        <div className="px-6 pt-7 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">O</div>
            <span className="text-lg font-semibold tracking-tight">Outreach CRM</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                setSelectedContactId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                view === item.key
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`${view === item.key ? 'text-indigo-400' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
              {view === item.key && (
                <span className="ml-auto w-1 h-5 rounded-full bg-indigo-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/80 flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
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

        {view === 'automation' && (
          <Automation
            session={session}
            onRefreshData={refresh}
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl ring-4 ring-indigo-600/20 hover:bg-indigo-500 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
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

import React, { useState, useCallback } from 'react';
import {
  Home,
  Users,
  PenTool,
  Settings,
  Mail,
  Linkedin,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Send,
  ChevronRight,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

const OutreachCRM = () => {
  // ============ STATE ============
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [writingSamples, setWritingSamples] = useState([
    {
      id: '1',
      label: 'LinkedIn InMail — Cold outreach to EY researcher',
      content:
        "Hey Sameer. I came across your EY research and was very impressed by the methodology, particularly how you validated the negative correlations with the AI models to show the inherent flaws in traditional survey methods. I'm a 2nd year MBA student at HBS currently doing research on the Simulation AI space. I'm particularly interested in exploring whether the approach the Similes and Aarus of the world can be extended into the B2B space to explore employee population behaviors or supplier behaviors (businesses as 'rational' actors). As someone who is at the forefront of this, I'd love to get your perspective on where this space is going and what you foresee to be the limitations of the agentic approach to simulation. 20 mins of your time would mean a lot. Thanks",
    },
  ]);

  const [contacts, setContacts] = useState([
    {
      id: '1',
      name: 'Sameer Munshi',
      title: 'EY Americas Behavioral Science and Simulation Leader',
      company: 'EY',
      email: 'sameer.munshi@ey.com',
      linkedinUrl: '',
      tags: ['EY', 'simulation-AI', 'behavioral-science'],
      notes:
        'Co-authored EY-Aaru wealth management simulation study. Validated Aaru agents against 3,600-person Global Wealth Management Survey with 0.90 Spearman correlation. Key finding: divergences on inheritance planning (-37.82% correlation) suggest simulation captures revealed vs. stated preferences.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '2',
      name: 'Sinisa Babcic',
      title: 'EY Global Center for Wealth Management Leader',
      company: 'EY',
      email: '',
      linkedinUrl: '',
      tags: ['EY', 'wealth-management', 'simulation-AI'],
      notes:
        'Co-authored EY-Aaru study with Sameer. 20+ years advising top 10 wealth management institutions. Business side of the simulation research. Can speak to whether EY is extending simulation beyond wealth management.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '3',
      name: 'Ugur Hamaloglu',
      title: 'EY Americas Wealth & Asset Management Consulting Leader',
      company: 'EY',
      email: '',
      linkedinUrl: '',
      tags: ['EY', 'wealth-management', 'consulting'],
      notes:
        'Third co-author of EY-Aaru study. Most senior of the three. Lower probability of response but broadest view on EY\'s strategic interest in simulation AI.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '4',
      name: 'Lora Cecere',
      title: 'Founder',
      company: 'Supply Chain Insights',
      email: '',
      linkedinUrl: '',
      tags: ['supply-chain', 'analyst', 'thought-leader'],
      notes:
        'Former Gartner analyst, Wharton MBA, 35+ years in supply chain (P&G, Kraft, Clorox). 11 books on supply chain. 325K+ readers on Supply Chain Shaman blog. Will give brutally honest take on whether behavioral simulation has legs in supply chain.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '5',
      name: 'Jan Snoeckx',
      title: 'Director Analyst, Supply Chain',
      company: 'Gartner',
      email: '',
      linkedinUrl: '',
      tags: ['Gartner', 'supply-chain', 'digital-twin', 'agentic-AI'],
      notes:
        'Published on deploying digital supply chain twins for planning outcomes. Quoted saying fully connected end-to-end digital twin is \'still aspirational for most companies.\' Covers agentic AI in supply chain planning. Director Analyst = right seniority for cold outreach.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '6',
      name: 'Kaitlynn Sommers',
      title: 'Senior Director Analyst, Supply Chain',
      company: 'Gartner',
      email: '',
      linkedinUrl: '',
      tags: ['Gartner', 'supply-chain', 'agentic-AI'],
      notes:
        'Led Gartner\'s 2025 top supply chain technology trends report. Vocal about agentic AI introducing new business models across supply chains. Step above Jan in seniority.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
    {
      id: '7',
      name: 'Hugues de Bantel',
      title: 'CEO & Co-Founder',
      company: 'Cosmo Tech',
      email: '',
      linkedinUrl: '',
      tags: ['supply-chain', 'simulation', 'digital-twin', 'founder'],
      notes:
        'Founded Cosmo Tech in 2010. Michelin as customer, Accenture as investor, SAS as partner. 15+ years in supply chain simulation digital twins. Can speak to where behavioral simulation adds value on top of traditional digital twins and why supply chain simulation is hard to sell.',
      status: 'active',
      followUpDate: null,
      outreach: [],
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    linkedinUrl: '',
    tags: '',
    notes: '',
    status: 'active',
  });

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftForm, setDraftForm] = useState({
    contactId: '',
    channel: 'LinkedIn InMail',
    angle: '',
    sampleId: '',
  });
  const [draftOutput, setDraftOutput] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [outreachForm, setOutreachForm] = useState({
    date: new Date().toISOString().split('T')[0],
    channel: 'Email',
    subject: '',
    messageContent: '',
    status: 'sent',
  });

  // ============ HELPERS ============
  const getContactById = (id) => contacts.find((c) => c.id === id);
  const selectedContact = selectedContactId
    ? getContactById(selectedContactId)
    : null;

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.company.toLowerCase().includes(query) ||
      contact.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  const getFollowUpStatus = (date) => {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(date);
    followUpDate.setHours(0, 0, 0, 0);
    const diff = followUpDate.getTime() - today.getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days <= 7) return 'upcoming';
    return null;
  };

  const getDashboardStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let outreachThisWeek = 0;
    let repliesReceived = 0;

    contacts.forEach((contact) => {
      contact.outreach.forEach((o) => {
        const oDate = new Date(o.date);
        oDate.setHours(0, 0, 0, 0);
        if (oDate >= weekAgo && oDate <= today) {
          outreachThisWeek++;
        }
        if (o.status === 'replied') {
          repliesReceived++;
        }
      });
    });

    const responseRate =
      outreachThisWeek > 0
        ? ((repliesReceived / outreachThisWeek) * 100).toFixed(1)
        : 0;

    return {
      totalContacts: contacts.length,
      outreachThisWeek,
      repliesReceived,
      responseRate,
    };
  };

  const getFollowUpReminders = () => {
    const reminders = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    contacts.forEach((contact) => {
      if (contact.followUpDate) {
        const status = getFollowUpStatus(contact.followUpDate);
        if (status) {
          reminders[status].push(contact);
        }
      }
    });

    return reminders;
  };

  const getRecentActivity = () => {
    const allActivity = [];
    contacts.forEach((contact) => {
      contact.outreach.forEach((o) => {
        allActivity.push({
          contactId: contact.id,
          contactName: contact.name,
          ...o,
        });
      });
    });
    return allActivity.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  };

  // ============ CONTACT MANAGEMENT ============
  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '',
      title: '',
      company: '',
      email: '',
      linkedinUrl: '',
      tags: '',
      notes: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setModalMode('edit');
    setFormData({
      ...contact,
      tags: contact.tags.join(', '),
    });
    setShowModal(true);
  };

  const saveContact = () => {
    if (!formData.name || !formData.company) {
      alert('Name and company are required');
      return;
    }

    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    if (modalMode === 'add') {
      const newContact = {
        id: Date.now().toString(),
        ...formData,
        tags,
        followUpDate: null,
        outreach: [],
      };
      setContacts([...contacts, newContact]);
    } else {
      setContacts(
        contacts.map((c) =>
          c.id === formData.id
            ? { ...c, ...formData, tags }
            : c
        )
      );
    }
    setShowModal(false);
  };

  const deleteContact = (id) => {
    if (window.confirm('Delete this contact?')) {
      setContacts(contacts.filter((c) => c.id !== id));
      if (selectedContactId === id) {
        setSelectedContactId(null);
      }
    }
  };

  // ============ OUTREACH LOGGING ============
  const logOutreach = (contactId) => {
    if (!outreachForm.messageContent) {
      alert('Message content is required');
      return;
    }

    const contact = getContactById(contactId);
    const newOutreach = {
      id: Date.now().toString(),
      date: outreachForm.date,
      channel: outreachForm.channel,
      subject: outreachForm.subject,
      messageContent: outreachForm.messageContent,
      status: outreachForm.status,
    };

    setContacts(
      contacts.map((c) =>
        c.id === contactId
          ? {
              ...c,
              outreach: [...(c.outreach || []), newOutreach],
            }
          : c
      )
    );

    setShowOutreachModal(false);
    setOutreachForm({
      date: new Date().toISOString().split('T')[0],
      channel: 'Email',
      subject: '',
      messageContent: '',
      status: 'sent',
    });
  };

  const markFollowedUp = (contactId) => {
    const today = new Date().toISOString().split('T')[0];
    logOutreach(contactId);
    setContacts(
      contacts.map((c) =>
        c.id === contactId
          ? { ...c, followUpDate: null }
          : c
      )
    );
  };

  // ============ DRAFT GENERATION ============
  const generateDraft = async () => {
    if (!apiKey) {
      alert('Please add your Anthropic API key in Settings');
      return;
    }

    if (!draftForm.contactId || !draftForm.sampleId || !draftForm.angle) {
      alert('Please select a contact, writing sample, and provide context');
      return;
    }

    const contact = getContactById(draftForm.contactId);
    const sample = writingSamples.find((s) => s.id === draftForm.sampleId);

    setDraftLoading(true);

    const systemPrompt =
      "You are a writing assistant. Your job is to draft outreach messages in the user's voice. Study the writing samples provided carefully — match the tone, structure, greeting style, sign-off, sentence length, and level of formality exactly. Do not add emojis. Do not be overly formal or sycophantic. The user's style is conversational, direct, uses 'Hey [Name]' as greeting, explains their interest before making the ask, and signs off with just 'Thanks'.";

    const userMessage = `
Writing Sample:
${sample.content}

Contact Information:
Name: ${contact.name}
Title: ${contact.title}
Company: ${contact.company}
Background/Notes: ${contact.notes}

Channel: ${draftForm.channel}
Context/Angle: ${draftForm.angle}

Please draft an outreach message matching the style of the sample above, tailored to this specific contact and context.
`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API error');
      }

      const data = await response.json();
      setDraftOutput(data.content[0].text);
    } catch (error) {
      alert(`Error: ${error.message}`);
      setDraftOutput('');
    } finally {
      setDraftLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftOutput);
    alert('Copied to clipboard!');
  };

  // ============ WRITING SAMPLES ============
  const addWritingSample = () => {
    const label = prompt('Sample label:');
    if (!label) return;
    const content = prompt('Sample content:');
    if (!content) return;

    const newSample = {
      id: Date.now().toString(),
      label,
      content,
    };
    setWritingSamples([...writingSamples, newSample]);
  };

  const deleteWritingSample = (id) => {
    if (window.confirm('Delete this sample?')) {
      setWritingSamples(writingSamples.filter((s) => s.id !== id));
    }
  };

  // ============ COMPONENTS ============
  const Sidebar = () => (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col p-6">
      <div className="text-2xl font-bold mb-12">Outreach CRM</div>
      <nav className="space-y-4 flex-1">
        <NavItem
          icon={<Home size={20} />}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={() => {
            setCurrentView('dashboard');
            setSelectedContactId(null);
          }}
        />
        <NavItem
          icon={<Users size={20} />}
          label="Contacts"
          active={currentView === 'contacts'}
          onClick={() => {
            setCurrentView('contacts');
            setSelectedContactId(null);
          }}
        />
        <NavItem
          icon={<PenTool size={20} />}
          label="Draft"
          active={currentView === 'drafter'}
          onClick={() => {
            setCurrentView('drafter');
            setSelectedContactId(null);
          }}
        />
        <NavItem
          icon={<Settings size={20} />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => {
            setCurrentView('settings');
            setSelectedContactId(null);
          }}
        />
      </nav>
    </div>
  );

  const NavItem = ({ icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const DashboardView = () => {
    const stats = getDashboardStats();
    const reminders = getFollowUpReminders();
    const activity = getRecentActivity();

    return (
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Welcome back, Yousef</p>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <StatCard label="Total Contacts" value={stats.totalContacts} />
          <StatCard label="Outreach This Week" value={stats.outreachThisWeek} />
          <StatCard label="Replies Received" value={stats.repliesReceived} />
          <StatCard
            label="Response Rate"
            value={`${stats.responseRate}%`}
          />
        </div>

        {(reminders.overdue.length > 0 ||
          reminders.today.length > 0 ||
          reminders.upcoming.length > 0) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <Clock className="mr-2 text-indigo-600" /> Follow-up Reminders
            </h2>
            <div className="space-y-4">
              {reminders.overdue.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">
                    Overdue ({reminders.overdue.length})
                  </h3>
                  <div className="space-y-2">
                    {reminders.overdue.map((c) => (
                      <ReminderItem
                        key={c.id}
                        contact={c}
                        status="overdue"
                      />
                    ))}
                  </div>
                </div>
              )}

              {reminders.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-2">
                    Due Today ({reminders.today.length})
                  </h3>
                  <div className="space-y-2">
                    {reminders.today.map((c) => (
                      <ReminderItem
                        key={c.id}
                        contact={c}
                        status="today"
                      />
                    ))}
                  </div>
                </div>
              )}

              {reminders.upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2">
                    Upcoming This Week ({reminders.upcoming.length})
                  </h3>
                  <div className="space-y-2">
                    {reminders.upcoming.map((c) => (
                      <ReminderItem
                        key={c.id}
                        contact={c}
                        status="upcoming"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activity.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <Mail className="mr-2 text-indigo-600" /> Recent Activity
            </h2>
            <div className="space-y-3">
              {activity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ReminderItem = ({ contact, status }) => {
    const bgColor =
      status === 'overdue'
        ? 'bg-red-50 border-red-200'
        : status === 'today'
          ? 'bg-amber-50 border-amber-200'
          : 'bg-green-50 border-green-200';

    const textColor =
      status === 'overdue'
        ? 'text-red-900'
        : status === 'today'
          ? 'text-amber-900'
          : 'text-green-900';

    return (
      <div
        className={`border ${bgColor} rounded p-4 flex justify-between items-center`}
      >
        <div>
          <p className={`font-semibold ${textColor}`}>{contact.name}</p>
          <p className="text-sm text-slate-600">{contact.company}</p>
        </div>
        <button
          onClick={() => {
            setSelectedContactId(contact.id);
            setCurrentView('contacts');
          }}
          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
        >
          View
        </button>
      </div>
    );
  };

  const ActivityItem = ({ item }) => {
    const channelIcons = {
      Email: <Mail size={16} />,
      'LinkedIn InMail': <Linkedin size={16} />,
      'LinkedIn Message': <Linkedin size={16} />,
    };

    const statusColors = {
      sent: 'bg-blue-100 text-blue-800',
      replied: 'bg-green-100 text-green-800',
      'follow-up-needed': 'bg-amber-100 text-amber-800',
      'no-response': 'bg-gray-100 text-gray-800',
    };

    return (
      <div className="border border-slate-200 rounded p-3 text-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-slate-900">
              {item.contactName}
            </p>
            <p className="text-slate-600 flex items-center mt-1">
              {channelIcons[item.channel]} <span className="ml-2">{item.channel}</span>
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.sent}`}>
            {item.status}
          </span>
        </div>
        <p className="text-slate-600">{item.date}</p>
      </div>
    );
  };

  const StatCard = ({ label, value }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-slate-600 text-sm font-medium">{label}</p>
      <p className="text-4xl font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );

  const ContactsView = () => {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <Plus size={20} className="mr-2" /> Add Contact
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, company, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {selectedContactId && selectedContact ? (
          <ContactDetail contact={selectedContact} />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onSelect={() => setSelectedContactId(contact.id)}
                onEdit={() => openEditModal(contact)}
                onDelete={() => deleteContact(contact.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const ContactCard = ({ contact, onSelect, onEdit, onDelete }) => (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 cursor-pointer" onClick={onSelect}>
          <h3 className="text-lg font-semibold text-slate-900">
            {contact.name}
          </h3>
          <p className="text-slate-600">{contact.title}</p>
          <p className="text-slate-500 text-sm">{contact.company}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {contact.tags.map((tag) => (
          <span
            key={tag}
            className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
      {contact.email && (
        <p className="text-sm text-slate-600">
          <Mail size={14} className="inline mr-1" /> {contact.email}
        </p>
      )}
      {contact.outreach && contact.outreach.length > 0 && (
        <p className="text-sm text-slate-500 mt-2">
          {contact.outreach.length} outreach attempt
          {contact.outreach.length !== 1 ? 's' : ''}
        </p>
      )}
      <button
        onClick={onSelect}
        className="mt-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
      >
        View Details <ChevronRight size={16} className="ml-1" />
      </button>
    </div>
  );

  const ContactDetail = ({ contact }) => (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => setSelectedContactId(null)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4"
          >
            ← Back to Contacts
          </button>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {contact.name}
          </h2>
          <p className="text-lg text-slate-600 mb-1">{contact.title}</p>
          <p className="text-slate-500 mb-4">{contact.company}</p>

          {contact.email && (
            <p className="text-slate-700 mb-3 flex items-center">
              <Mail size={18} className="mr-2 text-indigo-600" />
              {contact.email}
            </p>
          )}

          {contact.linkedinUrl && (
            <p className="text-slate-700 mb-3 flex items-center">
              <Linkedin size={18} className="mr-2 text-indigo-600" />
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                LinkedIn Profile
              </a>
            </p>
          )}

          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {contact.notes && (
            <div className="mt-6 p-4 bg-slate-50 rounded">
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                {contact.notes}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Outreach History
            </h3>
            <button
              onClick={() => {
                setOutreachForm({
                  date: new Date().toISOString().split('T')[0],
                  channel: 'Email',
                  subject: '',
                  messageContent: '',
                  status: 'sent',
                });
                setShowOutreachModal(true);
              }}
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 flex items-center"
            >
              <Plus size={16} className="mr-1" /> Log Outreach
            </button>
          </div>

          {contact.outreach && contact.outreach.length > 0 ? (
            <div className="space-y-4">
              {contact.outreach.map((o) => (
                <OutreachEntry key={o.id} entry={o} />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No outreach logged yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 h-fit">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => openEditModal(contact)}
            className="w-full bg-slate-100 text-slate-900 px-4 py-2 rounded hover:bg-slate-200 flex items-center justify-center"
          >
            <Edit size={16} className="mr-2" /> Edit
          </button>
          <button
            onClick={() => {
              setDraftForm({
                contactId: contact.id,
                channel: 'LinkedIn InMail',
                angle: '',
                sampleId: writingSamples.length > 0 ? writingSamples[0].id : '',
              });
              setDraftOutput('');
              setShowDraftModal(true);
              setCurrentView('drafter');
            }}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center"
          >
            <PenTool size={16} className="mr-2" /> Draft Message
          </button>
          {contact.followUpDate && (
            <button
              onClick={() => {
                setOutreachForm({
                  date: new Date().toISOString().split('T')[0],
                  channel: 'Email',
                  subject: '',
                  messageContent: '',
                  status: 'sent',
                });
                setShowOutreachModal(true);
              }}
              className="w-full bg-amber-100 text-amber-900 px-4 py-2 rounded hover:bg-amber-200 flex items-center justify-center"
            >
              <CheckCircle size={16} className="mr-2" /> Mark Followed Up
            </button>
          )}
        </div>

        {contact.followUpDate && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-amber-900 text-sm font-medium">
              Follow-up due: {contact.followUpDate}
            </p>
          </div>
        )}
      </div>

      {showOutreachModal && (
        <Modal
          title="Log Outreach"
          onClose={() => setShowOutreachModal(false)}
        >
          <OutreachForm
            contactId={contact.id}
            form={outreachForm}
            setForm={setOutreachForm}
            onSubmit={() => logOutreach(contact.id)}
          />
        </Modal>
      )}
    </div>
  );

  const OutreachEntry = ({ entry }) => {
    const statusColors = {
      sent: 'bg-blue-100 text-blue-800',
      replied: 'bg-green-100 text-green-800',
      'follow-up-needed': 'bg-amber-100 text-amber-800',
      'no-response': 'bg-gray-100 text-gray-800',
    };

    const channelIcons = {
      Email: <Mail size={16} />,
      'LinkedIn InMail': <Linkedin size={16} />,
      'LinkedIn Message': <Linkedin size={16} />,
    };

    return (
      <div className="border border-slate-200 rounded p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start space-x-3">
            <div className="mt-1">{channelIcons[entry.channel]}</div>
            <div>
              <p className="font-semibold text-slate-900">{entry.subject || entry.channel}</p>
              <p className="text-sm text-slate-600">{entry.date}</p>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              statusColors[entry.status] || statusColors.sent
            }`}
          >
            {entry.status}
          </span>
        </div>
        {entry.messageContent && (
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">
            {entry.messageContent}
          </p>
        )}
      </div>
    );
  };

  const OutreachForm = ({ contactId, form, setForm, onSubmit }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Date
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Channel
        </label>
        <select
          value={form.channel}
          onChange={(e) => setForm({ ...form, channel: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option>Email</option>
          <option>LinkedIn InMail</option>
          <option>LinkedIn Message</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Subject (optional)
        </label>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Message Content
        </label>
        <textarea
          value={form.messageContent}
          onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
          rows="4"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="sent">Sent</option>
          <option value="replied">Replied</option>
          <option value="follow-up-needed">Follow-up Needed</option>
          <option value="no-response">No Response</option>
        </select>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          onClick={onSubmit}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          Log Outreach
        </button>
      </div>
    </div>
  );

  const DrafterView = () => (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Message Drafter</h1>

      {!apiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-900 text-sm">
            ⚠️ Please add your Anthropic API key in Settings to use the draft generator
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Select Contact
          </label>
          <select
            value={draftForm.contactId}
            onChange={(e) => {
              setDraftForm({ ...draftForm, contactId: e.target.value });
              setDraftOutput('');
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose a contact --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Writing Sample
          </label>
          <select
            value={draftForm.sampleId}
            onChange={(e) =>
              setDraftForm({ ...draftForm, sampleId: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose a sample --</option>
            {writingSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Channel
          </label>
          <select
            value={draftForm.channel}
            onChange={(e) =>
              setDraftForm({ ...draftForm, channel: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>Email</option>
            <option>LinkedIn InMail</option>
            <option>LinkedIn Message</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Context / Angle
          </label>
          <textarea
            value={draftForm.angle}
            onChange={(e) =>
              setDraftForm({ ...draftForm, angle: e.target.value })
            }
            placeholder="E.g., I want to discuss whether behavioral simulation extends to B2B supply chain"
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={generateDraft}
          disabled={draftLoading}
          className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {draftLoading ? (
            <>
              <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Generating...
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" /> Generate Draft
            </>
          )}
        </button>

        {draftOutput && (
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Generated Draft</h3>
              <textarea
                value={draftOutput}
                onChange={(e) => setDraftOutput(e.target.value)}
                rows="8"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center"
            >
              <Copy size={18} className="mr-2" /> Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <div className="bg-white rounded-lg shadow p-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Anthropic API Key
          </h2>
          <p className="text-slate-600 text-sm mb-3">
            Required for the message draft generator
          </p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700"
              >
                {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Stored in memory only, never persisted
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Writing Samples</h2>
            <button
              onClick={addWritingSample}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus size={18} className="mr-2" /> Add Sample
            </button>
          </div>

          <div className="space-y-4">
            {writingSamples.map((sample) => (
              <div
                key={sample.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-900">
                    {sample.label}
                  </h3>
                  <button
                    onClick={() => deleteWritingSample(sample.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-slate-600 text-sm line-clamp-2">
                  {sample.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const ContactForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Company *
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) =>
            setFormData({ ...formData, company: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          LinkedIn URL
        </label>
        <input
          type="url"
          value={formData.linkedinUrl}
          onChange={(e) =>
            setFormData({ ...formData, linkedinUrl: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="e.g., EY, wealth-management, AI"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows="3"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          onClick={saveContact}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          {modalMode === 'add' ? 'Add Contact' : 'Update Contact'}
        </button>
        <button
          onClick={() => setShowModal(false)}
          className="flex-1 bg-slate-200 text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-300 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // ============ RENDER ============
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'contacts' && <ContactsView />}
        {currentView === 'drafter' && <DrafterView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

      {showModal && (
        <Modal
          title={modalMode === 'add' ? 'Add Contact' : 'Edit Contact'}
          onClose={() => setShowModal(false)}
        >
          <ContactForm />
        </Modal>
      )}

      {showDraftModal && (
        <Modal
          title="Draft Message"
          onClose={() => {
            setShowDraftModal(false);
            setDraftOutput('');
          }}
        >
          <DrafterView />
        </Modal>
      )}
    </div>
  );
};

export default OutreachCRM;

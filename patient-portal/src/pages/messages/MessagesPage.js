import { useState, useEffect, useCallback, useRef } from 'react';
import { FiMessageSquare, FiSend, FiMail, FiSearch, FiChevronDown } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { messageApi, providerApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

const CLINICAL_ROLES = ['DOCTOR', 'THERAPIST', 'NURSE', 'PHYSICIAN', 'ADMIN'];

function ProviderDropdown({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLoading(true);
    providerApi.getAll(0, 100)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.content ?? []);
        setProviders(list.filter(p => CLINICAL_ROLES.includes(p.role?.toUpperCase())));
      })
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = providers.filter(p => {
    const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || p.role?.toLowerCase().includes(q) || p.specialization?.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className="relative">
      <div
        className={`${inputClass} flex items-center justify-between cursor-pointer`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={value.name ? 'text-secondary-900 dark:text-white' : 'text-secondary-400'}>
          {value.name || 'Select a doctor or therapist'}
        </span>
        <FiChevronDown
          size={14}
          className={`ml-2 flex-shrink-0 text-secondary-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-secondary-100 dark:border-secondary-700">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary-50 dark:bg-secondary-700/60">
              <FiSearch size={13} className="text-secondary-400 flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or specialty…"
                className="flex-1 text-sm bg-transparent outline-none text-secondary-900 dark:text-white placeholder-secondary-400"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 scrollbar-thin">
            {loading ? (
              <div className="p-4 text-center text-xs text-secondary-400">Loading providers…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-secondary-400">No providers found</div>
            ) : filtered.map(p => (
              <div
                key={p.id}
                className="px-3 py-2.5 hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer transition-colors"
                onClick={() => {
                  onChange({ id: p.keycloakUserId || String(p.id), name: `${p.firstName} ${p.lastName}`, role: p.role });
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(p.firstName?.[0] ?? '').toUpperCase()}{(p.lastName?.[0] ?? '').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-xs text-secondary-400 truncate">
                      {p.role}{p.specialization ? ` · ${p.specialization}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const PNAME = user?.fullName || user?.username || 'Patient';
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewThread, setViewThread] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [reply, setReply] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ recipientId: '', recipientName: '', recipientRole: '', subject: '', body: '' });
  const [toast, setToast] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setMessages(await messageApi.getAll(PID)); } catch { setMessages([]); }
    finally { setLoading(false); }
  }, [PID]);

  useEffect(() => { load(); }, [load]);

  const openThread = async (msg) => {
    setViewThread(msg);
    try { setThreadMsgs(await messageApi.getThread(msg.threadId)); } catch { setThreadMsgs([msg]); }
    if (!msg.read && msg.recipientId === PID) { try { await messageApi.markRead(msg.id); } catch {} }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    const isMe = viewThread.senderId === PID;
    const recipient = isMe
      ? { id: viewThread.recipientId, name: viewThread.recipientName, role: viewThread.recipientRole }
      : { id: viewThread.senderId, name: viewThread.senderName, role: viewThread.senderRole };
    try {
      await messageApi.send({
        senderId: PID, senderName: PNAME, senderRole: 'PATIENT',
        recipientId: recipient.id, recipientName: recipient.name, recipientRole: recipient.role,
        subject: `Re: ${viewThread.subject}`, body: reply, threadId: viewThread.threadId,
      });
      setReply('');
      setThreadMsgs(await messageApi.getThread(viewThread.threadId));
      showToast('Reply sent');
      load();
    } catch { showToast('Failed to send'); }
  };

  const sendCompose = async () => {
    if (!compose.recipientName.trim() || !compose.subject.trim() || !compose.body.trim()) return;
    try {
      await messageApi.send({
        senderId: PID, senderName: PNAME, senderRole: 'PATIENT',
        recipientId: compose.recipientId || compose.recipientName,
        recipientName: compose.recipientName,
        recipientRole: compose.recipientRole || 'PHYSICIAN',
        subject: compose.subject, body: compose.body,
      });
      setComposeOpen(false);
      showToast('Message sent');
      load();
    } catch { showToast('Failed to send'); }
  };

  const threads = {};
  messages.forEach(m => {
    if (!threads[m.threadId] || new Date(m.sentAt) > new Date(threads[m.threadId].sentAt)) threads[m.threadId] = m;
  });
  const threadList = Object.values(threads).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const formatTime = (iso) => {
    const d = Date.now() - new Date(iso).getTime();
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Messages</h1>
          <p className="text-xs sm:text-sm text-secondary-500">Communicate with your care team.</p>
        </div>
        <button
          onClick={() => {
            setCompose({ recipientId: '', recipientName: '', recipientRole: '', subject: '', body: '' });
            setComposeOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition shadow-sm w-full sm:w-auto"
        >
          <FiMail size={16} /> New Message
        </button>
      </div>

      {/* Thread list */}
      <Card>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
          {loading ? (
            <div className="p-12 text-center text-sm text-secondary-400">Loading…</div>
          ) : threadList.length === 0 ? (
            <div className="p-12 text-center text-secondary-400">
              <FiMessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1 text-secondary-400">Start a conversation with your care team</p>
            </div>
          ) : threadList.map(m => {
            const isFromMe = m.senderId === PID;
            const otherName = isFromMe ? m.recipientName : m.senderName;
            const isUnread = !m.read && m.recipientId === PID;
            return (
              <div
                key={m.threadId}
                onClick={() => openThread(m)}
                className={`px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 cursor-pointer transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50 ${isUnread ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {otherName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-200'}`}>
                        {otherName}
                      </p>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] text-secondary-400 flex-shrink-0 whitespace-nowrap">{formatTime(m.sentAt)}</span>
                  </div>
                  <p className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mt-0.5 truncate">{m.subject}</p>
                  <p className="text-xs text-secondary-400 mt-0.5 line-clamp-1">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Thread view modal */}
      <Modal open={!!viewThread} onClose={() => setViewThread(null)} title={viewThread?.subject || 'Conversation'} size="lg">
        <div className="flex flex-col gap-3 min-h-[35vh] max-h-[50vh] overflow-y-auto scrollbar-thin pr-1 mb-1">
          {threadMsgs.map(m => (
            <div key={m.id} className={`flex ${m.senderId === PID ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${m.senderId === PID ? 'bg-primary-600 text-white rounded-br-md' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-900 dark:text-white rounded-bl-md'}`}>
                <p className={`text-[10px] font-medium ${m.senderId === PID ? 'text-primary-100' : 'text-secondary-500'}`}>{m.senderName}</p>
                <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={`text-[10px] mt-1.5 ${m.senderId === PID ? 'text-primary-200' : 'text-secondary-400'}`}>{formatTime(m.sentAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-4 border-t border-secondary-100 dark:border-secondary-700">
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
            placeholder="Type your reply…"
            className={`${inputClass} flex-1`}
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim()}
            className="px-3 sm:px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex-shrink-0"
          >
            <FiSend size={16} />
          </button>
        </div>
      </Modal>

      {/* Compose modal */}
      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New Message" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">To</label>
            <ProviderDropdown
              value={{ id: compose.recipientId, name: compose.recipientName }}
              onChange={p => setCompose(prev => ({ ...prev, recipientId: p.id, recipientName: p.name, recipientRole: p.role }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Subject</label>
            <input
              value={compose.subject}
              onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))}
              className={inputClass}
              placeholder="Enter subject"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Message</label>
            <textarea
              value={compose.body}
              onChange={e => setCompose(p => ({ ...p, body: e.target.value }))}
              className={`${inputClass} h-32 resize-none leading-relaxed`}
              placeholder="Type your message…"
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button
            onClick={() => setComposeOpen(false)}
            className="px-4 py-2 rounded-lg text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={sendCompose}
            disabled={!compose.recipientName || !compose.subject.trim() || !compose.body.trim()}
            className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition"
          >
            Send Message
          </button>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import LoadingState from '../../components/ui/LoadingState';
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Hash,
  RefreshCw,
  ShieldCheck,
  Lock
} from 'lucide-react';

export const ChatPage = () => {
  const { employee } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('DIRECT'); // 'DIRECT' | 'CHANNEL'
  const [selectedTargetEmp, setSelectedTargetEmp] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async (maintainActive = true) => {
    try {
      const res = await api.chat.listConversations();
      const list = res.data || [];
      setConversations(list);
      if (list.length > 0) {
        if (!maintainActive || !activeConv) {
          setActiveConv(list[0]);
        } else {
          const updated = list.find((c) => c.id === activeConv.id);
          if (updated) setActiveConv(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      setLoadingMessages(true);
      const res = await api.chat.getMessages(convId);
      setMessages(res.data || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations(false);
    api.admin.listEmployees().then((res) => setEmployeesList(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const interval = setInterval(() => {
        api.chat.getMessages(activeConv.id).then((res) => setMessages(res.data || [])).catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await api.chat.sendMessage(activeConv.id, content);
      setMessages((prev) => [...prev, res.data]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      let payload;
      if (modalType === 'DIRECT') {
        if (!selectedTargetEmp) return;
        payload = {
          type: 'DIRECT',
          participant_ids: [selectedTargetEmp],
        };
      } else {
        if (!channelTitle.trim()) return;
        payload = {
          type: 'CHANNEL',
          title: channelTitle.trim(),
        };
      }

      const res = await api.chat.createConversation(payload);
      setIsModalOpen(false);
      setSelectedTargetEmp('');
      setChannelTitle('');
      await fetchConversations(false);
      setActiveConv(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create conversation.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Company Chat & Channels"
        description="Internal corporate messaging with data loss prevention and audit-compliant logging."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Workspace' },
          { label: 'Company Chat' },
        ]}
        actions={
          <PrimaryButton size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
            New Chat
          </PrimaryButton>
        }
      />

      {/* Main Chat Interface */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden h-[620px] flex">
        {/* Left: Conversation List (Width: 260px) */}
        <div className="w-64 border-r border-[#E5E7EB] flex flex-col shrink-0 bg-[#FBFBFC]">
          <div className="p-3 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
            <span className="text-xs font-semibold text-[#172B24] uppercase tracking-wider">
              Conversations
            </span>
            <SecondaryButton
              size="sm"
              onClick={() => fetchConversations(true)}
              icon={RefreshCw}
              title="Refresh"
              className="h-7 w-7 p-0"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {loading ? (
              <LoadingState message="Loading channels..." />
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748B]">
                No active conversations yet.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConv?.id === conv.id;
                const isChannel = conv.type === 'CHANNEL';

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full text-left p-3 text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[#F0FDF4] border-l-2 border-[#166534]'
                        : 'hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#166534] text-white'
                          : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {isChannel ? <Hash className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold truncate ${isActive ? 'text-[#166534]' : 'text-[#172B24]'}`}>
                        {conv.title || 'Direct Conversation'}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Stream & Input */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="h-14 px-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#172B24]">
                    {activeConv.title || 'Direct Conversation'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                    {activeConv.type}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#15803D]">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">DLP Protection Active</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
                {loadingMessages ? (
                  <LoadingState message="Loading messages..." />
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#64748B] text-xs">
                    <MessageSquare className="w-8 h-8 text-[#CBD5E1] mb-2" />
                    <p className="font-semibold text-[#172B24]">No messages yet</p>
                    <p>Send the first message to initiate conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === employee?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold text-[#172B24]">
                            {isMe ? 'You' : msg.sender_name}
                          </span>
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-lg max-w-md text-xs leading-relaxed shadow-xs ${
                            isMe
                              ? 'bg-[#166534] text-white'
                              : 'bg-white border border-[#E5E7EB] text-[#172B24]'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E5E7EB] bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type an internal corporate message..."
                  className="enterprise-input flex-1"
                />
                <PrimaryButton type="submit" disabled={!inputText.trim() || sending} icon={Send}>
                  Send
                </PrimaryButton>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="New Conversation"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateConversation} className="space-y-4">
            <div className="flex bg-[#F1F5F9] p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setModalType('DIRECT')}
                className={`flex-1 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
                  modalType === 'DIRECT' ? 'bg-white text-[#172B24] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setModalType('CHANNEL')}
                className={`flex-1 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
                  modalType === 'CHANNEL' ? 'bg-white text-[#172B24] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Team Channel
              </button>
            </div>

            {modalType === 'DIRECT' ? (
              <FormField label="Select Team Member" required id="emp_chat">
                <select
                  id="emp_chat"
                  value={selectedTargetEmp}
                  onChange={(e) => setSelectedTargetEmp(e.target.value)}
                  required
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="">Choose an employee...</option>
                  {employeesList
                    .filter((e) => e.id !== employee?.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </option>
                    ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Channel Title" required id="ch_title">
                <input
                  type="text"
                  id="ch_title"
                  value={channelTitle}
                  onChange={(e) => setChannelTitle(e.target.value)}
                  placeholder="e.g. #marketing-deliverables"
                  required
                  className="enterprise-input w-full"
                />
              </FormField>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setIsModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={creating}>
                Create Conversation
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ChatPage;

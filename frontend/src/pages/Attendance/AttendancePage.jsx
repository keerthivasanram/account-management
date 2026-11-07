import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export const AttendancePage = () => {
  const { employee, isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [feedback, setFeedback] = useState(null);

  // Leave Request Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'CASUAL',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, histRes, leavesRes] = await Promise.all([
        api.attendance.getSummary(),
        api.attendance.getHistory(),
        api.attendance.listLeaves(),
      ]);
      setSummary(sumRes.data);
      setHistory(histRes.data || []);
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      setError('Failed to fetch attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      await api.attendance.checkIn();
      setFeedback({ type: 'success', text: 'Clocked in successfully for today\'s shift.' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to check in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      await api.attendance.checkOut();
      setFeedback({ type: 'success', text: 'Clocked out successfully.' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to check out.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setActionLoading(true);
      await api.attendance.requestLeave(leaveForm);
      setFeedback({ type: 'success', text: 'Leave request submitted for manager review.' });
      setIsLeaveModalOpen(false);
      setLeaveForm({ leave_type: 'CASUAL', start_date: '', end_date: '', reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to request leave.');
    } finally {
      setActionLoading(false);
    }
  };

  const attendanceColumns = [
    {
      header: 'Shift Date',
      accessor: 'date',
      render: (row) => (
        <span className="font-semibold text-xs text-[#172B24]">
          {new Date(row.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Check In',
      accessor: 'check_in_time',
      render: (row) => (
        <span className="font-mono text-xs text-[#172B24]">
          {row.check_in_time
            ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      ),
    },
    {
      header: 'Check Out',
      accessor: 'check_out_time',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">
          {row.check_out_time
            ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Active Shift'}
        </span>
      ),
    },
    {
      header: 'Logged Hours',
      accessor: 'hours_worked',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-[#172B24]">
          {row.hours_worked ? `${row.hours_worked.toFixed(1)} hrs` : 'In Progress'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'PRESENT'} />,
    },
  ];

  const leaveColumns = [
    {
      header: 'Leave Type',
      accessor: 'leave_type',
      render: (row) => (
        <span className="font-semibold text-xs text-[#172B24]">{row.leave_type}</span>
      ),
    },
    {
      header: 'Duration',
      accessor: 'start_date',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {row.start_date} &rarr; {row.end_date}
        </span>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (row) => (
        <span className="text-xs text-[#172B24] truncate max-w-xs block">{row.reason}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Attendance & Leave Management"
        description="Shift tracking, biometric verification logs, and self-service time-off approvals."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Workspace' },
          { label: 'Attendance' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {summary?.today_status === 'CHECKED_IN' ? (
              <SecondaryButton
                size="sm"
                danger
                onClick={handleCheckOut}
                disabled={actionLoading}
                icon={LogOut}
              >
                Clock Out
              </SecondaryButton>
            ) : (
              <PrimaryButton
                size="sm"
                onClick={handleCheckIn}
                disabled={actionLoading}
                icon={LogIn}
              >
                Clock In (Shift Start)
              </PrimaryButton>
            )}
            <SecondaryButton
              size="sm"
              onClick={() => setIsLeaveModalOpen(true)}
              icon={Plus}
            >
              Request Leave
            </SecondaryButton>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="p-0.5 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* 2. Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Today's Shift Status"
          value={summary?.today_status === 'CHECKED_IN' ? 'Clocked In' : 'Not Checked In'}
          icon={Clock}
          subtext={summary?.today_check_in ? `Started at ${summary.today_check_in}` : 'No active shift'}
          trend={summary?.today_status === 'CHECKED_IN' ? 'Active' : 'Off Duty'}
          trendDirection={summary?.today_status === 'CHECKED_IN' ? 'up' : 'neutral'}
        />
        <MetricCard
          label="Total Hours This Month"
          value={`${summary?.total_hours_this_month || 0} hrs`}
          icon={Calendar}
          subtext="Target: 160 hrs"
          trend="On Track"
          trendDirection="up"
        />
        <MetricCard
          label="Remaining Leave Balance"
          value={`${summary?.remaining_leaves || 14} days`}
          icon={CheckCircle2}
          subtext="Annual paid leave quota"
          trend="Available"
          trendDirection="neutral"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] gap-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Attendance History ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Leave Requests ({leaves.length})
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <DataTable
          columns={attendanceColumns}
          data={history}
          loading={loading}
          emptyTitle="No attendance records found"
          emptyDescription="Clock in to begin recording your daily operational shifts."
        />
      ) : (
        <DataTable
          columns={leaveColumns}
          data={leaves}
          loading={loading}
          emptyTitle="No leave requests submitted"
          emptyDescription="Submit time-off requests using the Request Leave button."
        />
      )}

      {/* Request Leave Modal */}
      {isLeaveModalOpen && (
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="Submit Leave Request"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRequestLeave} className="space-y-4">
            <FormField label="Leave Type" required id="l_type">
              <select
                id="l_type"
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                className="enterprise-input w-full cursor-pointer"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Medical / Sick Leave</option>
                <option value="ANNUAL">Annual Vacation</option>
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date" required id="l_start">
                <input
                  type="date"
                  id="l_start"
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  required
                  className="enterprise-input w-full text-xs"
                />
              </FormField>

              <FormField label="End Date" required id="l_end">
                <input
                  type="date"
                  id="l_end"
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  required
                  className="enterprise-input w-full text-xs"
                />
              </FormField>
            </div>

            <FormField label="Reason & Details" required id="l_reason">
              <textarea
                id="l_reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Reason for leave request..."
                rows={3}
                required
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setIsLeaveModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={actionLoading}>
                Submit Request
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AttendancePage;

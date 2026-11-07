import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterDropdown from '../../components/ui/FilterDropdown';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FolderGit2,
  Calendar,
  X,
  Send,
  Check,
  RotateCcw
} from 'lucide-react';

export const TasksPage = () => {
  const { employee, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'all'
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    due_date: '',
    estimated_effort_hours: '',
  });

  // Action form state inside details modal
  const [submissionDeliverable, setSubmissionDeliverable] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab === 'my') params.assigned_to_me = true;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [tasksRes, projectsRes, empsRes] = await Promise.all([
        api.tasks.list(params),
        api.projects.list().catch(() => ({ data: [] })),
        api.admin.listEmployees().catch(() => ({ data: [] })),
      ]);

      setTasks(tasksRes.data || []);
      setProjects(projectsRes.data || []);
      setEmployees(empsRes.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter, priorityFilter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        project_id: createForm.project_id || undefined,
        assigned_to: createForm.assigned_to || undefined,
        priority: createForm.priority,
        due_date: createForm.due_date ? new Date(createForm.due_date).toISOString() : undefined,
        estimated_effort_hours: createForm.estimated_effort_hours
          ? parseFloat(createForm.estimated_effort_hours)
          : undefined,
      };

      await api.tasks.create(payload);
      setFeedback({ type: 'success', text: 'Task created and delegated successfully.' });
      setShowCreateModal(false);
      setCreateForm({
        project_id: '',
        title: '',
        description: '',
        assigned_to: '',
        priority: 'MEDIUM',
        due_date: '',
        estimated_effort_hours: '',
      });
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to create task.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.tasks.start(taskId);
      setFeedback({ type: 'success', text: 'Task marked as In Progress.' });
      fetchData();
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => ({ ...prev, status: 'IN_PROGRESS' }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start task.');
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!submissionDeliverable.trim()) return;
    setIsSubmitting(true);
    try {
      await api.tasks.submit(selectedTask.id, {
        deliverable_summary: submissionDeliverable.trim(),
      });
      setFeedback({ type: 'success', text: 'Deliverables submitted for review.' });
      setSubmissionDeliverable('');
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveTask = async () => {
    setIsSubmitting(true);
    try {
      await api.tasks.approve(selectedTask.id, {
        remarks: reviewRemarks.trim() || undefined,
      });
      setFeedback({ type: 'success', text: 'Task deliverables approved and marked completed.' });
      setReviewRemarks('');
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Approval failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewRemarks.trim()) {
      alert('Please provide feedback remarks for required changes.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.tasks.requestChanges(selectedTask.id, {
        remarks: reviewRemarks.trim(),
      });
      setFeedback({ type: 'success', text: 'Changes requested. Task returned to assignee.' });
      setReviewRemarks('');
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Task Title',
      accessor: 'title',
      render: (row) => (
        <div>
          <p className="font-semibold text-sm text-[#172B24]">{row.title}</p>
          {row.description && (
            <p className="text-xs text-[#64748B] line-clamp-1 max-w-sm">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Project',
      accessor: 'project_name',
      render: (row) => (
        <span className="text-xs font-medium text-[#172B24]">{row.project_name || 'General Project'}</span>
      ),
    },
    {
      header: 'Assignee',
      accessor: 'assignee_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">{row.assignee_name || 'Unassigned'}</p>
          <p className="text-[10px] text-[#64748B] font-mono">{row.assignee_code}</p>
        </div>
      ),
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => (
        <StatusBadge
          status={row.priority === 'URGENT' ? 'ERROR' : row.priority === 'HIGH' ? 'WARNING' : 'INFO'}
          text={row.priority}
        />
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {row.due_date ? new Date(row.due_date).toLocaleDateString() : 'No Deadline'}
        </span>
      ),
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <SecondaryButton size="sm" onClick={() => setSelectedTask(row)}>
          Details
        </SecondaryButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Tasks & Deliverables"
        description="Delegate assignments, track production milestones, and conduct multi-tier approvals."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Workspace' },
          { label: 'Tasks' },
        ]}
        actions={
          <PrimaryButton size="sm" onClick={() => setShowCreateModal(true)} icon={Plus}>
            Create Task
          </PrimaryButton>
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

      {/* Tabs & Filters Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex bg-[#F1F5F9] p-0.5 rounded-md text-xs">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
              activeTab === 'my'
                ? 'bg-white text-[#172B24] shadow-xs'
                : 'text-[#64748B] hover:text-[#172B24]'
            }`}
          >
            My Assigned Tasks
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-[#172B24] shadow-xs'
                : 'text-[#64748B] hover:text-[#172B24]'
            }`}
          >
            All Team Tasks
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'IN_REVIEW', label: 'In Review' },
              { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
              { value: 'APPROVED', label: 'Approved' },
            ]}
            placeholder="All Statuses"
          />

          <FilterDropdown
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'URGENT', label: 'Urgent' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
            placeholder="All Priorities"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyTitle="No tasks found"
        emptyDescription="There are no tasks matching your selected filters."
        onRowClick={(row) => setSelectedTask(row)}
      />

      {/* Create Task Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Task"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <FormField label="Task Title" required id="t_title">
              <input
                type="text"
                id="t_title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Produce Q4 Brand Launch Carousel"
                required
                className="enterprise-input w-full"
              />
            </FormField>

            <FormField label="Description & Deliverables" id="t_desc">
              <textarea
                id="t_desc"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Requirements, reference links, and guidelines..."
                rows={3}
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Assign to Project" id="t_proj">
                <select
                  id="t_proj"
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                  className="enterprise-input w-full cursor-pointer text-xs"
                >
                  <option value="">General Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Assignee" id="t_assignee">
                <select
                  id="t_assignee"
                  value={createForm.assigned_to}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                  className="enterprise-input w-full cursor-pointer text-xs"
                >
                  <option value="">Self-Assign ({employee?.full_name})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Priority" required id="t_prio">
                <select
                  id="t_prio"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="enterprise-input w-full cursor-pointer text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </FormField>

              <FormField label="Due Date" id="t_due">
                <input
                  type="date"
                  id="t_due"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="enterprise-input w-full text-xs"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setShowCreateModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Create Task
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Details & Approval Modal */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-md flex items-center justify-between">
              <div>
                <span className="text-[#64748B] block">Status</span>
                <StatusBadge status={selectedTask.status} />
              </div>
              <div>
                <span className="text-[#64748B] block">Priority</span>
                <span className="font-semibold text-[#172B24]">{selectedTask.priority}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Assignee</span>
                <span className="font-semibold text-[#172B24]">{selectedTask.assignee_name}</span>
              </div>
            </div>

            {selectedTask.description && (
              <div>
                <span className="font-semibold text-[#172B24] block mb-1">Description</span>
                <p className="text-[#64748B] leading-relaxed p-2.5 bg-white border border-[#E5E7EB] rounded-md">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Workflow Action State */}
            {selectedTask.status === 'TODO' && (
              <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
                <PrimaryButton onClick={() => handleStartTask(selectedTask.id)}>
                  Start Task (In Progress)
                </PrimaryButton>
              </div>
            )}

            {selectedTask.status === 'IN_PROGRESS' && (
              <form onSubmit={handleSubmitTask} className="space-y-3 pt-2 border-t border-[#E5E7EB]">
                <FormField label="Submit Deliverables for Review" required id="deliv">
                  <textarea
                    id="deliv"
                    value={submissionDeliverable}
                    onChange={(e) => setSubmissionDeliverable(e.target.value)}
                    placeholder="Provide link to design files, copy draft, or deliverable summary..."
                    rows={3}
                    required
                    className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                  />
                </FormField>
                <div className="flex justify-end gap-2">
                  <PrimaryButton type="submit" loading={isSubmitting} icon={Send}>
                    Submit for Review
                  </PrimaryButton>
                </div>
              </form>
            )}

            {selectedTask.status === 'IN_REVIEW' && (
              <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
                <FormField label="Reviewer Remarks / Feedback" id="rev_rem">
                  <textarea
                    id="rev_rem"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Enter approval notes or reasons for revision..."
                    rows={2}
                    className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                  />
                </FormField>
                <div className="flex justify-end gap-2">
                  <SecondaryButton danger onClick={handleRequestChanges} disabled={isSubmitting}>
                    Request Changes
                  </SecondaryButton>
                  <PrimaryButton onClick={handleApproveTask} loading={isSubmitting} icon={Check}>
                    Approve Deliverables
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TasksPage;

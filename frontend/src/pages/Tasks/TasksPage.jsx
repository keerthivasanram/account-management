import React, { useCallback, useEffect, useState } from 'react';
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
import { AlertTriangle, Check, MessageSquareWarning, Play, Plus, RotateCcw, Send, X } from 'lucide-react';
import {
  PRIORITY_LABELS, STATUS_LABELS, TASK_PERM, canCreateTasks, dueState, isoDay, latestChangeRequest,
  statusLabel, taskActionsFor,
} from './tasksModel';

const textareaClass =
  'w-full text-sm text-slate-900 p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700';

const EMPTY_FORM = { project_id: '', title: '', description: '', assigned_to: '', priority: 'MEDIUM', due_date: '' };

const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const errText = (err, fallback) => err?.response?.data?.detail || fallback;

const DueCell = ({ task }) => {
  const label = fmtDate(task.due_date);
  if (!label) return <span className="text-xs text-slate-400">No due date</span>;
  const state = dueState(task, isoDay());
  if (state === 'overdue' && task.status !== 'IN_REVIEW') {
    return <span className="text-xs font-medium text-rose-700">{label} · overdue</span>;
  }
  if (state === 'today' && task.status !== 'IN_REVIEW') {
    return <span className="text-xs font-medium text-amber-800">Today</span>;
  }
  return <span className="text-xs text-slate-600">{label}</span>;
};

export const TasksPage = () => {
  const { employee, permissions, isAdmin } = useAuth();
  const canCreate = canCreateTasks(permissions);
  const seesAll = permissions.includes(TASK_PERM.REVIEW_ALL);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Employees only ever see their own tasks; managers/admins can switch to the wider view.
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'team'
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Create form (managers / admins)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [createError, setCreateError] = useState(null);

  // Details modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliverable, setDeliverable] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [actionError, setActionError] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (!canCreate || activeTab === 'my') params.my_tasks_only = true;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await api.tasks.list(params);
      setTasks(res.data || []);
    } catch (err) {
      setTasks([]);
      setError(errText(err, 'Your tasks could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter, canCreate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Only people who can create tasks need projects and assignees.
  const openCreate = async () => {
    setCreateError(null);
    setCreateForm(EMPTY_FORM);
    setShowCreateModal(true);
    try {
      const [proj, ppl] = await Promise.all([
        api.projects.list().then((r) => r.data || []),
        isAdmin
          ? api.admin.listEmployees().then((r) => r.data || [])
          : api.manager.getOverview().then((r) => r.data?.members || []),
      ]);
      setProjects(proj);
      setPeople(ppl.filter((p) => p.id !== employee?.id));
    } catch (err) {
      setCreateError(errText(err, 'Projects or team members could not be loaded.'));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.project_id) return;
    setIsSubmitting(true);
    setCreateError(null);
    try {
      await api.tasks.create({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        project_id: createForm.project_id,
        assigned_to: createForm.assigned_to || employee.id,
        priority: createForm.priority,
        due_date: createForm.due_date || undefined,
      });
      setShowCreateModal(false);
      setFeedback({ type: 'success', text: 'Task created and assigned.' });
      fetchTasks();
    } catch (err) {
      setCreateError(errText(err, 'The task could not be created.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setDeliverable('');
    setReviewRemarks('');
    setActionError(null);
  };

  // Every workflow action returns the updated task; keep the modal open on it so the user sees the result.
  const runAction = async (fn, successText, { close = false } = {}) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fn();
      setFeedback({ type: 'success', text: successText });
      if (close) setSelectedTask(null);
      else if (res?.data) setSelectedTask(res.data);
      fetchTasks();
    } catch (err) {
      setActionError(errText(err, 'That action could not be completed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWork = (e) => {
    e.preventDefault();
    if (!deliverable.trim()) return;
    runAction(() => api.tasks.submit(selectedTask.id, { deliverable_notes: deliverable.trim() }),
      'Submitted for review. Your reviewer has been notified.', { close: true });
  };

  const handleRequestChanges = () => {
    if (!reviewRemarks.trim()) {
      setActionError('Tell the assignee what needs to change.');
      return;
    }
    runAction(() => api.tasks.requestChanges(selectedTask.id, { remarks: reviewRemarks.trim() }),
      'Changes requested. The task went back to the assignee.', { close: true });
  };

  const columns = [
    {
      header: 'Task',
      accessor: 'title',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-sm text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500 truncate max-w-sm">{row.project_name || 'No project'}</p>
        </div>
      ),
    },
    ...(canCreate && activeTab === 'team'
      ? [{
        header: 'Assignee',
        accessor: 'assignee_name',
        render: (row) => <span className="text-xs text-slate-700">{row.assignee_name || 'Unassigned'}</span>,
      }]
      : []),
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => (
        <StatusBadge
          status={row.priority === 'URGENT' ? 'ERROR' : row.priority === 'HIGH' ? 'WARNING' : 'INFO'}
          text={PRIORITY_LABELS[row.priority] || row.priority}
        />
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} text={statusLabel(row.status)} />,
    },
    { header: 'Due', accessor: 'due_date', render: (row) => <DueCell task={row} /> },
    {
      header: '',
      align: 'right',
      render: (row) => (
        <SecondaryButton size="sm" onClick={(e) => { e.stopPropagation(); openTask(row); }}>Open</SecondaryButton>
      ),
    },
  ];

  const actions = selectedTask ? taskActionsFor(selectedTask, employee, permissions) : null;
  const changeRequest = selectedTask?.status === 'CHANGES_REQUESTED' ? latestChangeRequest(selectedTask) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={canCreate ? 'Tasks' : 'My tasks'}
        description={canCreate
          ? 'Assign work, follow progress and review what your people submit.'
          : 'Work assigned to you. Start a task, submit it when it’s done, and see your reviewer’s feedback.'}
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Tasks' }]}
        actions={canCreate && (
          <PrimaryButton size="sm" onClick={openCreate} icon={Plus}>Create task</PrimaryButton>
        )}
      />

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" className="p-1 rounded hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {canCreate ? (
          <div className="flex bg-[#F1F5F9] p-0.5 rounded-md text-xs" role="tablist" aria-label="Which tasks">
            {[['my', 'Assigned to me'], ['team', seesAll ? 'All tasks' : 'My team']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
                  activeTab === id ? 'bg-white text-slate-900 shadow-xs' : 'text-[#64748B] hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-700 px-1">Assigned to you</p>
        )}

        <div className="flex items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={Object.entries(STATUS_LABELS).filter(([k]) => k !== 'COMPLETED').map(([value, label]) => ({ value, label }))}
            placeholder="All statuses"
          />
          <FilterDropdown
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            placeholder="All priorities"
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchTasks} />
      ) : (
        <DataTable
          columns={columns}
          data={tasks}
          loading={loading}
          emptyTitle={statusFilter || priorityFilter ? 'No tasks match these filters' : 'No tasks yet'}
          emptyDescription={statusFilter || priorityFilter
            ? 'Clear the filters to see everything.'
            : canCreate && activeTab === 'team'
              ? 'Tasks you or your team create will appear here.'
              : 'When someone assigns you a task it will appear here, and you’ll get a notification.'}
          onRowClick={openTask}
        />
      )}

      {/* Create task (managers / admins) */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create task" maxWidth="max-w-lg">
          <form onSubmit={handleCreateTask} className="space-y-4">
            {createError && (
              <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{createError}</p>
            )}
            <FormField label="Title" required id="t_title">
              <input
                type="text"
                id="t_title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Produce Q4 brand launch carousel"
                required
                className="enterprise-input w-full"
              />
            </FormField>
            <FormField label="Details" id="t_desc">
              <textarea
                id="t_desc"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Requirements, reference links and guidelines"
                rows={3}
                className={textareaClass}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Project" required id="t_proj">
                <select
                  id="t_proj"
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                  required
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="">{projects.length ? 'Choose a project' : 'No projects yet'}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label="Assign to" id="t_assignee">
                <select
                  id="t_assignee"
                  value={createForm.assigned_to}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="">Myself ({employee?.full_name})</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.employee_code})</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Priority" required id="t_prio">
                <select
                  id="t_prio"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="enterprise-input w-full cursor-pointer"
                >
                  {Object.entries(PRIORITY_LABELS).reverse().map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Due date" id="t_due">
                <input
                  type="date"
                  id="t_due"
                  min={isoDay()}
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="enterprise-input w-full"
                />
              </FormField>
            </div>
            {!projects.length && !createError && (
              <p className="text-xs text-slate-500">Every task belongs to a project. An administrator can add projects from the Projects page.</p>
            )}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting} disabled={!createForm.project_id}>Create task</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Task details & workflow */}
      {selectedTask && (
        <Modal isOpen onClose={() => setSelectedTask(null)} title={selectedTask.title} maxWidth="max-w-lg">
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-xs">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1"><StatusBadge status={selectedTask.status} text={statusLabel(selectedTask.status)} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Priority</dt>
                <dd className="mt-1 font-medium text-slate-900">{PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Due</dt>
                <dd className="mt-1"><DueCell task={selectedTask} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">{selectedTask.assigned_to === employee?.id ? 'Assigned by' : 'Assignee'}</dt>
                <dd className="mt-1 font-medium text-slate-900 truncate">
                  {selectedTask.assigned_to === employee?.id ? selectedTask.creator_name : selectedTask.assignee_name}
                </dd>
              </div>
            </dl>

            {changeRequest && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <MessageSquareWarning className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium">{changeRequest.actor_name} asked for changes</p>
                  <p className="mt-0.5 text-[13px]">{changeRequest.remarks}</p>
                </div>
              </div>
            )}

            {selectedTask.description && (
              <div>
                <h3 className="font-medium text-slate-900 mb-1">Details</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{selectedTask.description}</p>
              </div>
            )}

            {actionError && (
              <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {actionError}
              </p>
            )}

            {actions.start && (
              <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
                <PrimaryButton
                  loading={isSubmitting}
                  icon={Play}
                  onClick={() => runAction(() => api.tasks.start(selectedTask.id), 'Task started.')}
                >
                  Start task
                </PrimaryButton>
              </div>
            )}

            {actions.submit && (
              <form onSubmit={handleSubmitWork} className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <FormField label="What are you handing in?" required id="deliv">
                  <textarea
                    id="deliv"
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="Links to the files, the copy, or a short summary of what you did"
                    rows={3}
                    required
                    className={textareaClass}
                  />
                </FormField>
                <div className="flex flex-wrap justify-end gap-2">
                  {actions.resume && (
                    <SecondaryButton
                      disabled={isSubmitting}
                      icon={RotateCcw}
                      onClick={() => runAction(() => api.tasks.start(selectedTask.id), 'Back in progress.')}
                    >
                      Mark as in progress
                    </SecondaryButton>
                  )}
                  <PrimaryButton type="submit" loading={isSubmitting} icon={Send}>Submit for review</PrimaryButton>
                </div>
              </form>
            )}

            {selectedTask.status === 'IN_REVIEW' && selectedTask.assigned_to === employee?.id && (
              <p className="pt-3 border-t border-[#E5E7EB] text-slate-600">
                Submitted. You’ll get a notification when it’s approved or if changes are needed.
              </p>
            )}

            {actions.review && (
              <div className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <FormField label="Feedback" id="rev_rem">
                  <textarea
                    id="rev_rem"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Approval notes, or what needs to change"
                    rows={2}
                    className={textareaClass}
                  />
                </FormField>
                <div className="flex flex-wrap justify-end gap-2">
                  <SecondaryButton danger onClick={handleRequestChanges} disabled={isSubmitting}>Request changes</SecondaryButton>
                  <PrimaryButton
                    loading={isSubmitting}
                    icon={Check}
                    onClick={() => runAction(
                      () => api.tasks.approve(selectedTask.id, { remarks: reviewRemarks.trim() || undefined }),
                      'Approved. The assignee has been notified.', { close: true },
                    )}
                  >
                    Approve
                  </PrimaryButton>
                </div>
              </div>
            )}

            {selectedTask.activity_events?.length > 0 && (
              <div className="pt-3 border-t border-[#E5E7EB]">
                <h3 className="font-medium text-slate-900 mb-2">History</h3>
                <ol className="space-y-2">
                  {[...selectedTask.activity_events]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((ev) => (
                      <li key={ev.id} className="text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{ev.actor_name}</span>{' '}
                        {ev.new_status ? `→ ${statusLabel(ev.new_status)}` : ev.action.toLowerCase()}
                        <span className="text-slate-400"> · {fmtDateTime(ev.created_at)}</span>
                        {ev.remarks && <span className="block text-slate-500 mt-0.5">{ev.remarks}</span>}
                      </li>
                    ))}
                </ol>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TasksPage;

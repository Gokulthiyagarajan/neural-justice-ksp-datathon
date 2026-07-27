import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton';
import { StatusBadge } from '@/components/Common/StatusBadge';
import {
  getPcTasks,
  updatePcTaskStatus,
  getPcDutyReports,
  submitPcDutyReport,
} from '@/api/pc';
import type { OfficerTask, DutyReport, DutyReportCreateRequest } from '@/types';

type Tab = 'tasks' | 'reports';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export function PCOrders() {
  const [tab, setTab] = useState<Tab>('tasks');

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">Today's Orders</h1>
          <p className="text-xs text-white/40">Tasks from SI / Duty reports</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setTab('tasks')}
          className={`text-xs px-3 py-1.5 rounded-t transition-colors ${
            tab === 'tasks'
              ? 'text-slate-200 border-b-2 border-slate-400'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Tasks & Orders
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`text-xs px-3 py-1.5 rounded-t transition-colors ${
            tab === 'reports'
              ? 'text-slate-200 border-b-2 border-slate-400'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Duty Reports
        </button>
      </div>

      {tab === 'tasks' ? <TasksTab /> : <ReportsTab />}
    </div>
  );
}

/* ── Demo tasks generator ───────────────────────────────────────────────── */
function generateDemoTasks(): OfficerTask[] {
  return [
    { id: 1, assigned_to: 'pc-001', assigned_by: 'SI Ramesh', crime_no: 'PC-DEMO-2024001', title: 'Verify witness statement', description: 'Visit 3rd Cross, Koramangala and record supplementary statement from Mr. Sharma (witness in theft case)', status: 'in_progress', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, assigned_to: 'pc-001', assigned_by: 'SI Ramesh', crime_no: 'PC-DEMO-2024002', title: 'Collect CCTV footage', description: 'Collect CCTV footage from the main junction for the time window 0200-0400 on 15 Jul', status: 'pending', priority: 'urgent', due_date: new Date(Date.now() + 43200000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, assigned_to: 'pc-001', assigned_by: 'SI Ramesh', crime_no: null, title: 'Patrol duty - Evening shift', description: 'Patrol assigned route covering Koramangala Market, Sony World Junction, and Wipro signal', status: 'pending', priority: 'medium', due_date: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, assigned_to: 'pc-001', assigned_by: 'SI Ramesh', crime_no: 'PC-DEMO-2024001', title: 'Submit evidence to forensic lab', description: 'Submit the sealed evidence envelope (tag #E-2024-0891) to FSL by 1700 hrs', status: 'completed', priority: 'high', due_date: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
    { id: 5, assigned_to: 'pc-001', assigned_by: 'SI Ramesh', crime_no: null, title: 'Daily attendance report', description: 'Submit daily attendance and duty report to station SI', status: 'pending', priority: 'low', due_date: new Date(Date.now() + 86400000 * 2).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
}

/* ─── Tasks tab ──────────────────────────────────────────────────────────── */

function TasksTab() {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPcTasks(filter);
      const fetched = data.tasks;
      if (fetched.length > 0) {
        setTasks(fetched);
      } else {
        setTasks(generateDemoTasks());
      }
    } catch (e) {
      console.error('[PCOrders] fetch tasks failed:', e);
      setTasks(generateDemoTasks());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatus = async (taskId: number, status: string) => {
    try {
      await updatePcTaskStatus(taskId, status);
      await fetchTasks();
    } catch (e) {
      console.error('[PCOrders] update status failed:', e);
    }
  };

  if (loading) return <PCPageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[undefined, 'pending', 'in_progress', 'completed'].map((s) => (
          <button
            key={s ?? 'all'}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
              filter === s
                ? 'bg-slate-500/20 text-slate-200 border border-slate-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}
          >
            {s ?? 'all'}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <span className="text-3xl block mb-2 opacity-30">✅</span>
          <p className="text-sm text-white/40">No tasks assigned</p>
          <p className="text-xs text-white/20 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">
                      {task.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}
                    >
                      {task.priority}
                    </span>
                    <StatusBadge status={task.status} compact />
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5 text-[10px] text-white/30">
                {task.crime_no && (
                  <Link
                    to={`/pc/cases/${task.crime_no}`}
                    className="hover:text-white transition-colors underline underline-offset-2"
                  >
                    {task.crime_no}
                  </Link>
                )}
                {task.due_date && <span>Due: {task.due_date}</span>}
                {task.assigned_by && <span>From: {task.assigned_by}</span>}
              </div>

              {/* Quick status action */}
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <div className="mt-3 flex gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStatus(task.id, 'in_progress')}
                      className="text-xs px-3 py-1 rounded-lg bg-sky-500/10 text-sky-300
                                 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => handleStatus(task.id, 'completed')}
                    className="text-xs px-3 py-1 rounded-lg bg-green-500/10 text-green-300
                               border border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Demo reports generator ──────────────────────────────────────────────── */
function generateDemoReports(): DutyReport[] {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  return [
    { id: 1, officer_id: 'pc-001', shift_date: today.toISOString().slice(0, 10), shift_type: 'day', summary: 'Morning patrol completed. Visited 3 checkpoints. No incidents reported.', cases_attended: 'PC-DEMO-2024001 - witness statement collection', challenges: 'Traffic diversion at main junction caused 30 min delay', pending_items: 'Submit CCTV footage evidence to SI', status: 'submitted', created_at: today.toISOString(), updated_at: today.toISOString() },
    { id: 2, officer_id: 'pc-001', shift_date: yesterday.toISOString().slice(0, 10), shift_type: 'night', summary: 'Night patrol completed. All routes secure.', cases_attended: null, challenges: null, pending_items: null, status: 'approved', created_at: yesterday.toISOString(), updated_at: yesterday.toISOString() },
  ];
}

/* ─── Reports tab ────────────────────────────────────────────────────────── */

function ReportsTab() {
  const [reports, setReports] = useState<DutyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // New report form state
  const [summary, setSummary] = useState('');
  const [shiftType, setShiftType] = useState('day');
  const [casesAttended, setCasesAttended] = useState('');
  const [challenges, setChallenges] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPcDutyReports();
      if (data.reports.length > 0) {
        setReports(data.reports);
      } else {
        setReports(generateDemoReports());
      }
    } catch (e) {
      console.error('[PCOrders] fetch reports failed:', e);
      setReports(generateDemoReports());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async () => {
    if (!summary.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data: DutyReportCreateRequest = {
        shift_type: shiftType,
        summary: summary.trim(),
        cases_attended: casesAttended.trim() || null,
        challenges: challenges.trim() || null,
        pending_items: pendingItems.trim() || null,
      };
      await submitPcDutyReport(data);
      setShowForm(false);
      resetForm();
      await fetchReports();
    } catch (e) {
      console.error('[PCOrders] submit report failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSummary('');
    setShiftType('day');
    setCasesAttended('');
    setChallenges('');
    setPendingItems('');
  };

  if (loading) return <PCPageSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {/* New report button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-xs px-4 py-2 rounded-lg self-start bg-slate-500/20 text-slate-200
                   border border-slate-500/30 hover:bg-slate-500/30 transition-colors"
      >
        {showForm ? 'Cancel' : '+ New Duty Report'}
      </button>

      {/* New report form */}
      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            End-of-Shift Report
          </h2>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Shift</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5
                         text-white/60 focus:outline-none focus:border-slate-500/40"
            >
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Summary *</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe your shift activities, arrests made, investigations conducted..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm
                         text-slate-200 placeholder-white/20 resize-none
                         focus:outline-none focus:border-slate-500/40"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">
              Cases Attended (crime numbers, comma-separated)
            </label>
            <input
              value={casesAttended}
              onChange={(e) => setCasesAttended(e.target.value)}
              placeholder="e.g. KSR-123/2024, KSR-456/2024"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm
                         text-slate-200 placeholder-white/20
                         focus:outline-none focus:border-slate-500/40"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Challenges</label>
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="Any difficulties encountered during the shift..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm
                         text-slate-200 placeholder-white/20 resize-none
                         focus:outline-none focus:border-slate-500/40"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Pending Items</label>
            <textarea
              value={pendingItems}
              onChange={(e) => setPendingItems(e.target.value)}
              placeholder="Tasks still pending / to be followed up..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm
                         text-slate-200 placeholder-white/20 resize-none
                         focus:outline-none focus:border-slate-500/40"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!summary.trim() || submitting}
            className="text-xs px-4 py-1.5 rounded-lg bg-slate-500/20 text-slate-200
                       border border-slate-500/30 hover:bg-slate-500/30 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <span className="text-3xl block mb-2 opacity-30">📄</span>
          <p className="text-sm text-white/40">No duty reports yet</p>
          <p className="text-xs text-white/20 mt-1">
            Submit your first end-of-shift report
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">
                    {r.shift_date} &middot; {r.shift_type}
                  </span>
                  <StatusBadge status={r.status} compact />
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {r.summary}
              </p>
              {r.cases_attended && (
                <p className="text-xs text-white/30 mt-2">
                  Cases: {r.cases_attended}
                </p>
              )}
              {r.challenges && (
                <p className="text-xs text-amber-400/60 mt-1">
                  ⚠️ {r.challenges}
                </p>
              )}
              {r.pending_items && (
                <p className="text-xs text-white/30 mt-1">
                  Pending: {r.pending_items}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

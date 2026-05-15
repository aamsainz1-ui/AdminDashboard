import React, { useEffect, useMemo, useState } from 'react';
import { Language, Task, TaskComment, TaskPriority, TaskStatus, SubTask, UserProfile } from '../types';
import { deleteTask, syncTaskComments, syncTasks, upsertComment, upsertTask } from '../services/syncService';

interface TasksProps {
  users: UserProfile[];
  currentUser: UserProfile;
  lang: Language;
}

type ViewMode = 'board' | 'table' | 'list';
type SortMode = 'due' | 'priority' | 'created';

interface TaskFilters {
  status: 'all' | TaskStatus;
  assignee: 'all' | 'unassigned' | string;
  priority: 'all' | TaskPriority;
  tag: string;
  query: string;
}

const STORAGE_TASKS_KEY = 'admin_dashboard_tasks_v1';
const STORAGE_COMMENTS_KEY = 'admin_dashboard_task_comments_v1';

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITY_ORDER: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const COPY = {
  TH: {
    title: 'งาน',
    subtitle: 'บอร์ดงานแบบ Notion สำหรับติดตามงาน ทีม และคอมเมนต์',
    newTask: 'เพิ่มงาน',
    board: 'บอร์ด',
    table: 'ตาราง',
    list: 'ลิสต์',
    search: 'ค้นหางาน',
    status: 'สถานะ',
    assignee: 'ผู้รับผิดชอบ',
    priority: 'ความสำคัญ',
    tag: 'แท็ก',
    sort: 'เรียงตาม',
    all: 'ทั้งหมด',
    unassigned: 'ยังไม่กำหนด',
    due: 'วันครบกำหนด',
    created: 'วันที่สร้าง',
    titleField: 'ชื่องาน',
    description: 'รายละเอียด',
    dueDate: 'วันครบกำหนด',
    tags: 'แท็ก',
    subtasks: 'งานย่อย',
    comments: 'คอมเมนต์',
    addComment: 'ส่งคอมเมนต์',
    commentPlaceholder: 'เขียนคอมเมนต์...',
    addSubtask: 'เพิ่มงานย่อย',
    subtaskPlaceholder: 'ชื่องานย่อย',
    noTasks: 'ยังไม่มีงานในมุมมองนี้',
    createFirst: 'สร้างงานใหม่เพื่อเริ่มจัดการทีม',
    delete: 'ลบ',
    close: 'ปิด',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    confirmDelete: 'ลบงานนี้หรือไม่?',
    backlog: 'Backlog',
    todo: 'To do',
    in_progress: 'กำลังทำ',
    review: 'ตรวจงาน',
    done: 'เสร็จแล้ว',
    low: 'ต่ำ',
    medium: 'กลาง',
    high: 'สูง',
    urgent: 'ด่วน',
    createdBy: 'สร้างโดย',
    updated: 'อัปเดต',
    progress: 'ความคืบหน้า',
    emptyColumn: 'ลากงานมาวางที่นี่',
    loading: 'กำลังโหลดงาน...',
    formTitle: 'สร้างงานใหม่',
    tagHint: 'คั่นด้วย comma',
    clear: 'ล้างตัวกรอง',
    open: 'เปิดรายละเอียด'
  },
  EN: {
    title: 'Tasks',
    subtitle: 'Notion-style task board for ownership, subtasks, and discussion',
    newTask: 'New task',
    board: 'Board',
    table: 'Table',
    list: 'List',
    search: 'Search tasks',
    status: 'Status',
    assignee: 'Assignee',
    priority: 'Priority',
    tag: 'Tag',
    sort: 'Sort by',
    all: 'All',
    unassigned: 'Unassigned',
    due: 'Due date',
    created: 'Created',
    titleField: 'Title',
    description: 'Description',
    dueDate: 'Due date',
    tags: 'Tags',
    subtasks: 'Sub-tasks',
    comments: 'Comments',
    addComment: 'Add comment',
    commentPlaceholder: 'Write a comment...',
    addSubtask: 'Add sub-task',
    subtaskPlaceholder: 'Sub-task title',
    noTasks: 'No tasks in this view',
    createFirst: 'Create a task to start organizing work',
    delete: 'Delete',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Delete this task?',
    backlog: 'Backlog',
    todo: 'To do',
    in_progress: 'In progress',
    review: 'Review',
    done: 'Done',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    createdBy: 'Created by',
    updated: 'Updated',
    progress: 'Progress',
    emptyColumn: 'Drop a task here',
    loading: 'Loading tasks...',
    formTitle: 'Create task',
    tagHint: 'Separate with commas',
    clear: 'Clear filters',
    open: 'Open detail'
  }
};

const statusStyles: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-700 border-slate-200',
  todo: 'bg-blue-50 text-blue-700 border-blue-100',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  review: 'bg-amber-50 text-amber-700 border-amber-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100'
};

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const defaultFilters: TaskFilters = {
  status: 'all',
  assignee: 'all',
  priority: 'all',
  tag: '',
  query: ''
};

const nowIso = () => new Date().toISOString();

const normalizeTags = (value: string) => (
  value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
);

const createEmptyTask = (currentUser: UserProfile): Task => {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: currentUser.id,
    dueDate: '',
    tags: [],
    subtasks: [],
    createdBy: currentUser.id,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

const Icon: React.FC<{ path: string; className?: string }> = ({ path, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
};

const formatDateTime = (date: string) => (
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
);

const priorityWeight = (priority: TaskPriority) => PRIORITY_ORDER.indexOf(priority);

const isOverdue = (task: Task) => (
  !!task.dueDate && task.status !== 'done' && new Date(`${task.dueDate}T23:59:59`).getTime() < Date.now()
);

const Tasks: React.FC<TasksProps> = ({ users, currentUser, lang }) => {
  const t = COPY[lang];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [sortMode, setSortMode] = useState<SortMode>('due');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState<Task>(() => createEmptyTask(currentUser));
  const [newTaskTags, setNewTaskTags] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => task.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const selectedTask = useMemo(() => (
    tasks.find(task => task.id === selectedTaskId) || null
  ), [tasks, selectedTaskId]);

  const selectedComments = useMemo(() => (
    selectedTask ? comments.filter(comment => comment.taskId === selectedTask.id) : []
  ), [comments, selectedTask]);

  const filteredTasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const tag = filters.tag.trim().toLowerCase();

    return tasks
      .filter(task => {
        const assigneeMatch = filters.assignee === 'all'
          || (filters.assignee === 'unassigned' ? !task.assigneeId : task.assigneeId === filters.assignee);
        const textMatch = !query
          || task.title.toLowerCase().includes(query)
          || task.description.toLowerCase().includes(query)
          || task.tags.some(taskTag => taskTag.toLowerCase().includes(query));
        const tagMatch = !tag || task.tags.some(taskTag => taskTag.toLowerCase() === tag);

        return (
          (filters.status === 'all' || task.status === filters.status)
          && (filters.priority === 'all' || task.priority === filters.priority)
          && assigneeMatch
          && tagMatch
          && textMatch
        );
      })
      .sort((a, b) => {
        if (sortMode === 'priority') return priorityWeight(b.priority) - priorityWeight(a.priority);
        if (sortMode === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [filters, sortMode, tasks]);

  const boardColumns = useMemo(() => (
    STATUS_ORDER.map(status => ({
      status,
      tasks: filteredTasks.filter(task => task.status === status)
    }))
  ), [filteredTasks]);

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      try {
        const localTasks = JSON.parse(localStorage.getItem(STORAGE_TASKS_KEY) || '[]');
        const localComments = JSON.parse(localStorage.getItem(STORAGE_COMMENTS_KEY) || '[]');
        const syncedTasks = await syncTasks(Array.isArray(localTasks) ? localTasks : []);
        const syncedComments = await syncTaskComments(Array.isArray(localComments) ? localComments : []);

        if (!cancelled) {
          setTasks(syncedTasks);
          setComments(syncedComments);
        }
      } catch (error) {
        console.error('Load tasks error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(comments));
  }, [comments]);

  const getUserName = (userId?: string) => {
    if (!userId) return t.unassigned;
    return usersById.get(userId)?.name || t.unassigned;
  };

  const getUserAvatar = (userId?: string) => usersById.get(userId || '')?.avatar;

  const patchTask = (taskId: string, updates: Partial<Task>) => {
    let nextTask: Task | null = null;

    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      nextTask = { ...task, ...updates, updatedAt: nowIso() };
      return nextTask;
    }));

    window.setTimeout(() => {
      if (nextTask) void upsertTask(nextTask);
    }, 0);
  };

  const handleCreateTask = () => {
    const task: Task = {
      ...newTask,
      title: newTask.title.trim() || (lang === Language.TH ? 'งานใหม่' : 'Untitled task'),
      description: newTask.description.trim(),
      tags: normalizeTags(newTaskTags),
      dueDate: newTask.dueDate || undefined,
      updatedAt: nowIso()
    };

    setTasks(prev => [task, ...prev]);
    void upsertTask(task);
    setSelectedTaskId(task.id);
    setNewTask(createEmptyTask(currentUser));
    setNewTaskTags('');
    setShowCreate(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setComments(prev => prev.filter(comment => comment.taskId !== taskId));
    setSelectedTaskId(null);
    void deleteTask(taskId);
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTaskId) return;
    patchTask(draggedTaskId, { status });
    setDraggedTaskId(null);
  };

  const handleAddSubtask = () => {
    if (!selectedTask || !subtaskDraft.trim()) return;
    const subtask: SubTask = {
      id: crypto.randomUUID(),
      title: subtaskDraft.trim(),
      completed: false
    };
    patchTask(selectedTask.id, { subtasks: [...selectedTask.subtasks, subtask] });
    setSubtaskDraft('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    patchTask(selectedTask.id, {
      subtasks: selectedTask.subtasks.map(subtask => (
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      ))
    });
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    patchTask(selectedTask.id, {
      subtasks: selectedTask.subtasks.filter(subtask => subtask.id !== subtaskId)
    });
  };

  const handleAddComment = () => {
    if (!selectedTask || !commentDraft.trim()) return;

    const comment: TaskComment = {
      id: crypto.randomUUID(),
      taskId: selectedTask.id,
      authorId: currentUser.id,
      content: commentDraft.trim(),
      createdAt: nowIso()
    };

    setComments(prev => [...prev, comment]);
    setCommentDraft('');
    void upsertComment(comment);
  };

  const subtaskProgress = (task: Task) => {
    if (task.subtasks.length === 0) return 0;
    return Math.round((task.subtasks.filter(subtask => subtask.completed).length / task.subtasks.length) * 100);
  };

  const resetFilters = () => setFilters(defaultFilters);

  const renderViewToggle = () => (
    <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
      {(['board', 'table', 'list'] as ViewMode[]).map(mode => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            viewMode === mode ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {t[mode]}
        </button>
      ))}
    </div>
  );

  const renderSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <label className="flex flex-col gap-1 min-w-[150px]">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );

  const renderTaskCard = (task: Task) => {
    const taskComments = comments.filter(comment => comment.taskId === task.id);
    const progress = subtaskProgress(task);

    return (
      <button
        key={task.id}
        draggable
        onClick={() => setSelectedTaskId(task.id)}
        onDragStart={event => {
          setDraggedTaskId(task.id);
          event.dataTransfer.setData('text/plain', task.id);
        }}
        onDragEnd={() => setDraggedTaskId(null)}
        className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900 leading-snug">{task.title}</h3>
          <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${priorityStyles[task.priority]}`}>
            {t[task.priority]}
          </span>
        </div>
        {task.description && <p className="text-xs text-slate-500 line-clamp-2 mt-2">{task.description}</p>}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {task.tags.map(tag => (
              <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black">
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {task.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase mb-1">
                <span>{t.progress}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2 min-w-0">
              {getUserAvatar(task.assigneeId) ? (
                <img src={getUserAvatar(task.assigneeId)} alt="" className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-3 h-3" />
                </div>
              )}
              <span className="font-bold truncate">{getUserName(task.assigneeId)}</span>
            </div>
            <div className={`flex items-center gap-1 font-bold ${isOverdue(task) ? 'text-red-600' : ''}`}>
              <Icon path="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" className="w-3.5 h-3.5" />
              {formatDate(task.dueDate)}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-black text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Icon path="M9 12l2 2 4-4M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" className="w-3.5 h-3.5" />
              {task.subtasks.filter(subtask => subtask.completed).length}/{task.subtasks.length}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon path="M7 8h10M7 12h6m-8 8l4-4h8a3 3 0 003-3V7a3 3 0 00-3-3H7a3 3 0 00-3 3v6a3 3 0 003 3z" className="w-3.5 h-3.5" />
              {taskComments.length}
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderFilters = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.search}</span>
          <div className="relative">
            <Icon path="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.query}
              onChange={event => setFilters(prev => ({ ...prev, query: event.target.value }))}
              placeholder={t.search}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </label>
        {renderSelect(t.status, filters.status, value => setFilters(prev => ({ ...prev, status: value as TaskFilters['status'] })), [
          { value: 'all', label: t.all },
          ...STATUS_ORDER.map(status => ({ value: status, label: t[status] }))
        ])}
        {renderSelect(t.assignee, filters.assignee, value => setFilters(prev => ({ ...prev, assignee: value })), [
          { value: 'all', label: t.all },
          { value: 'unassigned', label: t.unassigned },
          ...users.map(user => ({ value: user.id, label: user.name }))
        ])}
      </div>
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        {renderSelect(t.priority, filters.priority, value => setFilters(prev => ({ ...prev, priority: value as TaskFilters['priority'] })), [
          { value: 'all', label: t.all },
          ...PRIORITY_ORDER.map(priority => ({ value: priority, label: t[priority] }))
        ])}
        {renderSelect(t.tag, filters.tag, value => setFilters(prev => ({ ...prev, tag: value })), [
          { value: '', label: t.all },
          ...allTags.map(tag => ({ value: tag, label: `#${tag}` }))
        ])}
        {renderSelect(t.sort, sortMode, value => setSortMode(value as SortMode), [
          { value: 'due', label: t.due },
          { value: 'priority', label: t.priority },
          { value: 'created', label: t.created }
        ])}
        <button
          onClick={resetFilters}
          className="lg:ml-auto px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50"
        >
          {t.clear}
        </button>
      </div>
    </div>
  );

  const renderCreatePanel = () => (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-900">{t.formTitle}</h3>
        <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
          <Icon path="M6 18L18 6M6 6l12 12" />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <input
          value={newTask.title}
          onChange={event => setNewTask(prev => ({ ...prev, title: event.target.value }))}
          placeholder={t.titleField}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        />
        <select
          value={newTask.assigneeId || ''}
          onChange={event => setNewTask(prev => ({ ...prev, assigneeId: event.target.value || undefined }))}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        >
          <option value="">{t.unassigned}</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <select
          value={newTask.status}
          onChange={event => setNewTask(prev => ({ ...prev, status: event.target.value as TaskStatus }))}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        >
          {STATUS_ORDER.map(status => <option key={status} value={status}>{t[status]}</option>)}
        </select>
        <select
          value={newTask.priority}
          onChange={event => setNewTask(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        >
          {PRIORITY_ORDER.map(priority => <option key={priority} value={priority}>{t[priority]}</option>)}
        </select>
        <input
          type="date"
          value={newTask.dueDate || ''}
          onChange={event => setNewTask(prev => ({ ...prev, dueDate: event.target.value }))}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        />
        <input
          value={newTaskTags}
          onChange={event => setNewTaskTags(event.target.value)}
          placeholder={t.tagHint}
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        />
      </div>
      <textarea
        value={newTask.description}
        onChange={event => setNewTask(prev => ({ ...prev, description: event.target.value }))}
        placeholder={t.description}
        rows={3}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400 resize-none"
      />
      <div className="flex justify-end gap-3">
        <button onClick={() => setShowCreate(false)} className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100">
          {t.cancel}
        </button>
        <button onClick={handleCreateTask} className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20">
          {t.save}
        </button>
      </div>
    </div>
  );

  const renderBoard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {boardColumns.map(column => (
        <section
          key={column.status}
          onDragOver={event => event.preventDefault()}
          onDrop={() => handleDrop(column.status)}
          className="bg-slate-100/70 rounded-2xl border border-slate-200 p-3 min-h-[420px]"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${statusStyles[column.status]}`}>
                {t[column.status]}
              </span>
              <span className="text-xs font-black text-slate-400">{column.tasks.length}</span>
            </div>
          </div>
          <div className="space-y-3">
            {column.tasks.map(renderTaskCard)}
            {column.tasks.length === 0 && (
              <div className="h-28 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                {t.emptyColumn}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t.titleField, t.status, t.priority, t.assignee, t.dueDate, t.tags, t.subtasks, t.comments].map(header => (
                <th key={header} className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">
                  <button onClick={() => setSelectedTaskId(task.id)} className="font-black text-slate-900 hover:text-indigo-600 text-left">
                    {task.title}
                  </button>
                  {task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>}
                </td>
                <td className="px-4 py-4">
                  <select value={task.status} onChange={event => patchTask(task.id, { status: event.target.value as TaskStatus })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold bg-white">
                    {STATUS_ORDER.map(status => <option key={status} value={status}>{t[status]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${priorityStyles[task.priority]}`}>
                    {t[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-slate-600">{getUserName(task.assigneeId)}</td>
                <td className={`px-4 py-4 text-sm font-bold ${isOverdue(task) ? 'text-red-600' : 'text-slate-600'}`}>{formatDate(task.dueDate)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black">#{tag}</span>)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-slate-600">{task.subtasks.filter(subtask => subtask.completed).length}/{task.subtasks.length}</td>
                <td className="px-4 py-4 text-sm font-bold text-slate-600">{comments.filter(comment => comment.taskId === task.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="space-y-3">
      {filteredTasks.map(task => (
        <button
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
          className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusStyles[task.status]}`}>{t[task.status]}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${priorityStyles[task.priority]}`}>{t[task.priority]}</span>
                {task.tags.map(tag => <span key={tag} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black">#{tag}</span>)}
              </div>
              <h3 className="font-black text-slate-900">{task.title}</h3>
              {task.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-bold text-slate-500 lg:min-w-[420px]">
              <span>{t.assignee}: {getUserName(task.assigneeId)}</span>
              <span className={isOverdue(task) ? 'text-red-600' : ''}>{t.dueDate}: {formatDate(task.dueDate)}</span>
              <span>{t.subtasks}: {task.subtasks.filter(subtask => subtask.completed).length}/{task.subtasks.length}</span>
              <span>{t.comments}: {comments.filter(comment => comment.taskId === task.id).length}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
        <Icon path="M9 5h6M9 3h6a2 2 0 012 2v1h1.5A1.5 1.5 0 0120 7.5v12A1.5 1.5 0 0118.5 21h-13A1.5 1.5 0 014 19.5v-12A1.5 1.5 0 015.5 6H7V5a2 2 0 012-2zm-2 9l2 2 4-4" className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-black text-slate-900">{t.noTasks}</h3>
      <p className="text-sm font-bold text-slate-500 mt-2">{t.createFirst}</p>
      <button onClick={() => setShowCreate(true)} className="mt-5 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
        {t.newTask}
      </button>
    </div>
  );

  const renderDetailPanel = () => {
    if (!selectedTask) return null;
    const progress = subtaskProgress(selectedTask);

    return (
      <div className="fixed inset-0 z-[250]">
        <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)} aria-label={t.close} />
        <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${statusStyles[selectedTask.status]}`}>{t[selectedTask.status]}</span>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${priorityStyles[selectedTask.priority]}`}>{t[selectedTask.priority]}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDeleteTask(selectedTask.id)} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-100">
                {t.delete}
              </button>
              <button onClick={() => setSelectedTaskId(null)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
                <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <input
              value={selectedTask.title}
              onChange={event => patchTask(selectedTask.id, { title: event.target.value })}
              className="w-full text-3xl font-black text-slate-900 tracking-tight outline-none border-none"
            />
            <textarea
              value={selectedTask.description}
              onChange={event => patchTask(selectedTask.id, { description: event.target.value })}
              placeholder={t.description}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 font-semibold outline-none focus:border-indigo-400 resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderSelect(t.status, selectedTask.status, value => patchTask(selectedTask.id, { status: value as TaskStatus }), STATUS_ORDER.map(status => ({ value: status, label: t[status] })))}
              {renderSelect(t.priority, selectedTask.priority, value => patchTask(selectedTask.id, { priority: value as TaskPriority }), PRIORITY_ORDER.map(priority => ({ value: priority, label: t[priority] })))}
              {renderSelect(t.assignee, selectedTask.assigneeId || '', value => patchTask(selectedTask.id, { assigneeId: value || undefined }), [
                { value: '', label: t.unassigned },
                ...users.map(user => ({ value: user.id, label: user.name }))
              ])}
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.dueDate}</span>
                <input
                  type="date"
                  value={selectedTask.dueDate || ''}
                  onChange={event => patchTask(selectedTask.id, { dueDate: event.target.value || undefined })}
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.tags}</span>
              <input
                value={selectedTask.tags.join(', ')}
                onChange={event => patchTask(selectedTask.id, { tags: normalizeTags(event.target.value) })}
                placeholder={t.tagHint}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
              />
            </label>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">{t.subtasks}</h3>
                <span className="text-xs font-black text-indigo-600">{progress}%</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-2">
                {selectedTask.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-3 py-2">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(subtask.id)}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <span className={`flex-1 text-sm font-bold ${subtask.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {subtask.title}
                    </span>
                    <button onClick={() => handleRemoveSubtask(subtask.id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={subtaskDraft}
                  onChange={event => setSubtaskDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleAddSubtask();
                  }}
                  placeholder={t.subtaskPlaceholder}
                  className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                />
                <button onClick={handleAddSubtask} className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
                  {t.addSubtask}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">{t.comments}</h3>
                <span className="text-xs font-black text-slate-400">{selectedComments.length}</span>
              </div>
              <div className="space-y-3">
                {selectedComments.map(comment => (
                  <div key={comment.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {getUserAvatar(comment.authorId) ? (
                        <img src={getUserAvatar(comment.authorId)} alt="" className="w-8 h-8 rounded-xl object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {getUserName(comment.authorId).slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-black text-slate-900">{getUserName(comment.authorId)}</p>
                        <p className="text-[10px] font-bold text-slate-400">{formatDateTime(comment.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <textarea
                  value={commentDraft}
                  onChange={event => setCommentDraft(event.target.value)}
                  placeholder={t.commentPlaceholder}
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none text-sm font-semibold text-slate-700"
                />
                <div className="flex justify-end">
                  <button onClick={handleAddComment} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest">
                    {t.addComment}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
              <span>{t.createdBy}: {getUserName(selectedTask.createdBy)}</span>
              <span>{t.updated}: {formatDateTime(selectedTask.updatedAt)}</span>
            </div>
          </div>
        </aside>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">{t.subtitle}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {renderViewToggle()}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700"
          >
            <Icon path="M12 4v16m8-8H4" />
            {t.newTask}
          </button>
        </div>
      </div>

      {renderFilters()}
      {showCreate && renderCreatePanel()}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm font-black text-slate-500">
          {t.loading}
        </div>
      ) : filteredTasks.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {viewMode === 'board' && renderBoard()}
          {viewMode === 'table' && renderTable()}
          {viewMode === 'list' && renderList()}
        </>
      )}

      {renderDetailPanel()}
    </div>
  );
};

export default Tasks;

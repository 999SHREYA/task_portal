'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { label, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/format';
import { hasErrors, toFormErrors, validateTask, type FormErrors } from '@/lib/validation';
import type { Task, TaskPriority, TaskStatus, UserRef } from '@/lib/types';
import Input, { Select, Textarea } from './ui/Input';
import Button from './ui/Button';
import ErrorMessage from './ui/ErrorMessage';

interface TaskFormProps {
  projectId: string;
  members: UserRef[]; // possible assignees
  task?: Task; // given = edit mode
  onSaved: (task: Task) => void;
  onCancel: () => void;
}

export default function TaskForm({ projectId, members, task, onSaved, onCancel }: TaskFormProps) {
  const [values, setValues] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    assignee: task?.assignee?._id ?? '',
    priority: task?.priority ?? ('medium' as TaskPriority),
    status: task?.status ?? ('todo' as TaskStatus),
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '', // yyyy-mm-dd for <input type="date">
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof values, value: string) => setValues((v) => ({ ...v, [field]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clientErrors = validateTask(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // Empty form fields mean "none" for the API.
    const payload = { ...values, assignee: values.assignee || null, dueDate: values.dueDate || null };

    setSaving(true);
    setFormError('');
    try {
      const res = task
        ? await api.patch<{ data: Task }>(`/tasks/${task._id}`, payload)
        : await api.post<{ data: Task }>('/tasks', { ...payload, project: projectId });
      onSaved(res.data);
    } catch (err) {
      const apiError = err as ApiError;
      setErrors(toFormErrors(apiError.details ?? []));
      setFormError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form">
      {formError && <ErrorMessage message={formError} />}
      <Input label="Title" value={values.title} onChange={(e) => set('title', e.target.value)} error={errors.title} required />
      <Textarea label="Description" value={values.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />
      <Select
        label="Assignee"
        value={values.assignee}
        onChange={(e) => set('assignee', e.target.value)}
        error={errors.assignee}
        placeholder="Unassigned"
        hint={members.length === 0 ? 'Add developers to the project to assign tasks.' : 'The assignee gets an email.'}
        options={members.map((m) => ({ value: m._id, label: m.name }))}
      />
      <div className="form-row">
        <Select label="Priority" value={values.priority} onChange={(e) => set('priority', e.target.value)} options={TASK_PRIORITIES.map((p) => ({ value: p, label: label(p) }))} />
        <Select label="Status" value={values.status} onChange={(e) => set('status', e.target.value)} options={TASK_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      </div>
      <Input label="Due date" type="date" value={values.dueDate} onChange={(e) => set('dueDate', e.target.value)} error={errors.dueDate} />
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {task ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}

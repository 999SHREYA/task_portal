'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { label, PROJECT_STATUSES } from '@/lib/format';
import { hasErrors, toFormErrors, validateProject, type FormErrors } from '@/lib/validation';
import type { Paginated, Project, ProjectStatus, User } from '@/lib/types';
import Input, { Select, Textarea } from './ui/Input';
import Button from './ui/Button';
import ErrorMessage from './ui/ErrorMessage';

interface ProjectFormProps {
  project?: Project; // given = edit mode
  onSaved: (project: Project) => void;
  onCancel: () => void;
}

export default function ProjectForm({ project, onSaved, onCancel }: ProjectFormProps) {
  const [values, setValues] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    client: project?.client._id ?? '',
    status: project?.status ?? ('active' as ProjectStatus),
    members: project?.members.map((m) => m._id) ?? [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const clients = useApi<Paginated<User>>('/users', { role: 'client', limit: 100 });
  const developers = useApi<Paginated<User>>('/users', { role: 'developer', limit: 100 });

  const set = (field: keyof typeof values, value: string | string[]) => setValues((v) => ({ ...v, [field]: value }));

  const toggleMember = (id: string) =>
    set('members', values.members.includes(id) ? values.members.filter((m) => m !== id) : [...values.members, id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clientErrors = validateProject(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSaving(true);
    setFormError('');
    try {
      const res = project
        ? await api.patch<{ data: Project }>(`/projects/${project._id}`, values)
        : await api.post<{ data: Project }>('/projects', values);
      onSaved(res.data);
    } catch (err) {
      const apiError = err as ApiError;
      setErrors(toFormErrors(apiError.details ?? []));
      setFormError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  if (clients.error || developers.error) return <ErrorMessage message={clients.error || developers.error || ''} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="form">
      {formError && <ErrorMessage message={formError} />}
      <Input label="Project name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
      <Textarea label="Description" value={values.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />
      <Select
        label="Client"
        value={values.client}
        onChange={(e) => set('client', e.target.value)}
        error={errors.client}
        placeholder={clients.loading ? 'Loading clients…' : 'Choose a client'}
        options={(clients.data?.data ?? []).map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }))}
      />
      <Select
        label="Status"
        value={values.status}
        onChange={(e) => set('status', e.target.value)}
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: label(s) }))}
      />
      <fieldset className="checkbox-group">
        <legend>Developers on this project</legend>
        {developers.loading && <p className="muted">Loading developers…</p>}
        {developers.data?.data.length === 0 && <p className="muted">No developers yet.</p>}
        {developers.data?.data.map((dev) => (
          <label key={dev._id} className="checkbox">
            <input type="checkbox" checked={values.members.includes(dev._id)} onChange={() => toggleMember(dev._id)} />
            {dev.name}
          </label>
        ))}
      </fieldset>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}

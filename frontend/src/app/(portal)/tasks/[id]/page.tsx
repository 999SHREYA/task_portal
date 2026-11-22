'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';
import { formatDate, label, TASK_STATUSES, TONES } from '@/lib/format';
import type { Project, Task, TaskStatus } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import TaskForm from '@/components/TaskForm';
import CommentSection from '@/components/CommentSection';
import AttachmentList from '@/components/AttachmentList';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const router = useRouter();
  const [modal, setModal] = useState<'edit' | 'delete' | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const task = useApi<{ data: Task }>(`/tasks/${id}`);
  // The edit form needs the project's developers - load them only when editing.
  const projectId = task.data?.data.project._id;
  const project = useApi<{ data: Project }>(modal === 'edit' && projectId ? `/projects/${projectId}` : null);

  async function changeStatus(status: TaskStatus) {
    setActionError('');
    try {
      await api.patch(`/tasks/${id}`, { status });
      task.reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete(`/tasks/${id}`);
      router.replace(`/projects/${projectId}`);
    } catch (err) {
      setActionError((err as Error).message);
      setBusy(false);
      setModal(null);
    }
  }

  if (task.loading && !task.data) return <Loader label="Loading task…" />;
  if (task.error) return <EmptyState title="Task not available" message={task.error} action={<Link href="/tasks">Back to the board</Link>} />;
  if (!task.data) return null;

  const t = task.data.data;
  const closeModal = () => setModal(null);

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/projects/${t.project._id}`}>{t.project.name}</Link> / Task
      </p>
      <PageHeader
        title={t.title}
        subtitle={
          <>
            <Badge tone={TONES[t.status]}>{label(t.status)}</Badge> <Badge tone={TONES[t.priority]}>{label(t.priority)} priority</Badge>
          </>
        }
        actions={
          <>
            {can.editTask(user) && (
              <Button variant="secondary" onClick={() => setModal('edit')}>
                Edit
              </Button>
            )}
            {can.deleteTask(user) && (
              <Button variant="danger" onClick={() => setModal('delete')}>
                Delete
              </Button>
            )}
          </>
        }
      />

      {actionError && <ErrorMessage message={actionError} />}

      <section className="card details-grid">
        <div>
          <h3>Assignee</h3>
          <p>{t.assignee?.name ?? 'Unassigned'}</p>
        </div>
        <div>
          <h3>Due date</h3>
          <p>{formatDate(t.dueDate)}</p>
        </div>
        <div>
          <h3>Created by</h3>
          <p>
            {t.createdBy.name} on {formatDate(t.createdAt)}
          </p>
        </div>
        {can.changeTaskStatus(user, t) && (
          <div>
            <Select
              label="Status"
              value={t.status}
              onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              options={TASK_STATUSES.map((s) => ({ value: s, label: label(s) }))}
            />
          </div>
        )}
        <div className="details-wide">
          <h3>Description</h3>
          <p className="pre-wrap">{t.description || 'No description.'}</p>
        </div>
      </section>

      <AttachmentList taskId={t._id} attachments={t.attachments} canEdit={can.manageAttachments(user, t)} onChange={task.reload} />
      <CommentSection taskId={t._id} />

      <Modal open={modal === 'edit'} title="Edit task" onClose={closeModal}>
        {project.error && <ErrorMessage message={project.error} />}
        {!project.data ? (
          <Loader />
        ) : (
          <TaskForm
            projectId={t.project._id}
            members={project.data.data.members}
            task={t}
            onCancel={closeModal}
            onSaved={() => {
              closeModal();
              task.reload();
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal === 'delete'}
        title="Delete task?"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>
              Delete task
            </Button>
          </>
        }
      >
        <p>
          This permanently deletes <strong>{t.title}</strong> with its comments and files.
        </p>
      </Modal>
    </>
  );
}

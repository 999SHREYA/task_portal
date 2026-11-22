'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';
import { formatDate, label, TONES } from '@/lib/format';
import type { Paginated, Project, Task } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import ProjectForm from '@/components/ProjectForm';
import TaskForm from '@/components/TaskForm';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorMessage from '@/components/ui/ErrorMessage';

type OpenModal = 'edit' | 'delete' | 'task' | null;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const router = useRouter();
  const [taskPage, setTaskPage] = useState(1);
  const [modal, setModal] = useState<OpenModal>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const project = useApi<{ data: Project }>(`/projects/${id}`);
  const tasks = useApi<Paginated<Task>>('/tasks', { project: id, page: taskPage, limit: 10 });

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/projects/${id}`);
      router.replace('/projects');
    } catch (err) {
      setDeleteError((err as Error).message);
      setDeleting(false);
    }
  }

  if (project.loading && !project.data) return <Loader label="Loading project…" />;
  if (project.error) {
    return (
      <EmptyState
        title="Project not available"
        message={project.error}
        action={<Link href="/projects">Back to projects</Link>}
      />
    );
  }
  if (!project.data) return null;

  const p = project.data.data;
  const closeModal = () => setModal(null);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/projects">Projects</Link> / {p.name}
      </p>
      <PageHeader
        title={p.name}
        subtitle={<Badge tone={TONES[p.status]}>{label(p.status)}</Badge>}
        actions={
          <>
            <Link className="btn btn-secondary btn-md" href={`/tasks?project=${p._id}`}>
              Open task board
            </Link>
            {can.editProject(user) && (
              <Button variant="secondary" onClick={() => setModal('edit')}>
                Edit
              </Button>
            )}
            {can.deleteProject(user) && (
              <Button variant="danger" onClick={() => setModal('delete')}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <section className="card details-grid">
        <div>
          <h3>Client</h3>
          <p>{p.client.name}</p>
        </div>
        <div>
          <h3>Manager</h3>
          <p>{p.manager.name}</p>
        </div>
        <div>
          <h3>Developers</h3>
          <p>{p.members.length ? p.members.map((m) => m.name).join(', ') : 'None yet'}</p>
        </div>
        <div>
          <h3>Created</h3>
          <p>{formatDate(p.createdAt)}</p>
        </div>
        <div className="details-wide">
          <h3>Description</h3>
          <p className="pre-wrap">{p.description || 'No description.'}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Tasks</h2>
          {can.createTask(user) && <Button onClick={() => setModal('task')}>+ New task</Button>}
        </div>
        {tasks.error && <ErrorMessage message={tasks.error} onRetry={tasks.reload} />}
        {tasks.loading && !tasks.data && <Loader label="Loading tasks…" />}
        {tasks.data?.data.length === 0 && <EmptyState title="No tasks yet" message="Tasks for this project will appear here." />}
        {!!tasks.data?.data.length && (
          <>
            <Table
              caption="Project tasks"
              rows={tasks.data.data}
              rowKey={(t) => t._id}
              onRowClick={(t) => router.push(`/tasks/${t._id}`)}
              columns={[
                { header: 'Title', render: (t) => <Link href={`/tasks/${t._id}`}>{t.title}</Link> },
                { header: 'Assignee', render: (t) => t.assignee?.name ?? 'Unassigned' },
                { header: 'Status', render: (t) => <Badge tone={TONES[t.status]}>{label(t.status)}</Badge> },
                { header: 'Priority', render: (t) => <Badge tone={TONES[t.priority]}>{label(t.priority)}</Badge> },
                { header: 'Due', render: (t) => formatDate(t.dueDate) },
              ]}
            />
            <Pagination page={tasks.data.pagination.page} totalPages={tasks.data.pagination.totalPages} onPageChange={setTaskPage} />
          </>
        )}
      </section>

      <Modal open={modal === 'edit'} title="Edit project" onClose={closeModal}>
        <ProjectForm
          project={p}
          onCancel={closeModal}
          onSaved={() => {
            closeModal();
            project.reload();
          }}
        />
      </Modal>

      <Modal open={modal === 'task'} title="New task" onClose={closeModal}>
        <TaskForm
          projectId={p._id}
          members={p.members}
          onCancel={closeModal}
          onSaved={() => {
            closeModal();
            tasks.reload();
          }}
        />
      </Modal>

      <Modal
        open={modal === 'delete'}
        title="Delete project?"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Delete project
            </Button>
          </>
        }
      >
        {deleteError && <ErrorMessage message={deleteError} />}
        <p>
          This permanently deletes <strong>{p.name}</strong> and all of its tasks and comments.
        </p>
      </Modal>
    </>
  );
}

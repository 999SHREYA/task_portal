'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { can } from '@/lib/permissions';
import { formatDate, label, PROJECT_STATUSES, TONES } from '@/lib/format';
import type { Paginated, Project } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import ProjectForm from '@/components/ProjectForm';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function ProjectsPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Wait until the user stops typing for 300 ms before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error, reload } = useApi<Paginated<Project>>('/projects', { page, limit: 10, search, status });
  const isFiltered = Boolean(search || status);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={user.role === 'client' ? 'Projects we are building for you.' : undefined}
        actions={can.createProject(user) && <Button onClick={() => setCreating(true)}>+ New project</Button>}
      />

      <div className="filters">
        <Input label="Search" type="search" placeholder="Search by name…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          placeholder="All statuses"
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: label(s) }))}
        />
      </div>

      {error && <ErrorMessage message={error} onRetry={reload} />}
      {loading && !data && <Loader label="Loading projects…" />}

      {data && data.data.length === 0 && (
        <EmptyState
          title={isFiltered ? 'No matching projects' : 'No projects yet'}
          message={isFiltered ? 'Try a different search or status.' : 'Projects you have access to will appear here.'}
          action={!isFiltered && can.createProject(user) ? <Button onClick={() => setCreating(true)}>Create the first project</Button> : undefined}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table
            caption="Projects"
            rows={data.data}
            rowKey={(p) => p._id}
            onRowClick={(p) => router.push(`/projects/${p._id}`)}
            columns={[
              { header: 'Name', render: (p) => <Link href={`/projects/${p._id}`}>{p.name}</Link> },
              { header: 'Client', render: (p) => p.client.name },
              { header: 'Manager', render: (p) => p.manager.name },
              { header: 'Developers', render: (p) => p.members.length },
              { header: 'Status', render: (p) => <Badge tone={TONES[p.status]}>{label(p.status)}</Badge> },
              { header: 'Created', render: (p) => formatDate(p.createdAt) },
            ]}
          />
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={creating} title="New project" onClose={() => setCreating(false)}>
        <ProjectForm onCancel={() => setCreating(false)} onSaved={(project) => router.push(`/projects/${project._id}`)} />
      </Modal>
    </>
  );
}

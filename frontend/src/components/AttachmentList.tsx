'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Attachment } from '@/lib/types';
import Button from './ui/Button';
import ErrorMessage from './ui/ErrorMessage';

const MAX_BYTES = 5 * 1024 * 1024; // must match the backend limit
const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.doc,.docx';

interface AttachmentListProps {
  taskId: string;
  attachments: Attachment[];
  canEdit: boolean;
  onChange: () => void; // ask the parent to reload the task
}

export default function AttachmentList({ taskId, attachments, canEdit, onChange }: AttachmentListProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_BYTES) return setError('File is too large (max 5 MB)');

    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    setError('');
    try {
      await api.post(`/tasks/${taskId}/attachments`, form);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(attachment: Attachment) {
    if (!window.confirm(`Remove ${attachment.filename}?`)) return;
    try {
      await api.delete(`/tasks/${taskId}/attachments/${attachment._id}`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>Attachments</h2>
        {canEdit && (
          <>
            <input ref={fileInput} type="file" accept={ACCEPT} onChange={handleFile} hidden aria-label="Choose a file to attach" />
            <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileInput.current?.click()}>
              Upload file
            </Button>
          </>
        )}
      </div>
      {error && <ErrorMessage message={error} />}
      {attachments.length === 0 ? (
        <p className="muted">No files attached.</p>
      ) : (
        <ul className="attachment-list">
          {attachments.map((a) => (
            <li key={a._id}>
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.filename}
              </a>
              <span className="muted small">
                {a.uploadedBy?.name && `${a.uploadedBy.name} · `}
                {formatDate(a.createdAt)}
              </span>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => handleRemove(a)} aria-label={`Remove ${a.filename}`}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatDateTime, label } from '@/lib/format';
import type { Comment, Paginated } from '@/lib/types';
import { Textarea } from './ui/Input';
import Button from './ui/Button';
import Loader from './ui/Loader';
import EmptyState from './ui/EmptyState';
import ErrorMessage from './ui/ErrorMessage';

const MAX_LENGTH = 2000;

export default function CommentSection({ taskId }: { taskId: string }) {
  const comments = useApi<Paginated<Comment>>(`/tasks/${taskId}/comments`, { limit: 100 });
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return setError('Write something before posting');
    if (text.length > MAX_LENGTH) return setError(`Keep it under ${MAX_LENGTH} characters`);

    setPosting(true);
    setError('');
    try {
      await api.post(`/tasks/${taskId}/comments`, { body: text });
      setBody('');
      comments.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="section">
      <h2>Comments</h2>
      {comments.error && <ErrorMessage message={comments.error} onRetry={comments.reload} />}
      {comments.loading && !comments.data && <Loader label="Loading comments…" />}
      {comments.data?.data.length === 0 && <EmptyState title="No comments yet" message="Start the conversation below." />}

      <ul className="comment-list">
        {comments.data?.data.map((c) => (
          <li key={c._id} className="comment">
            <div className="comment-meta">
              <strong>{c.author.name}</strong> <span className="muted small">· {label(c.author.role)} · {formatDateTime(c.createdAt)}</span>
            </div>
            <p className="pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} noValidate className="form comment-form">
        <Textarea
          label="Add a comment"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={error}
          hint={`${body.length}/${MAX_LENGTH}`}
        />
        <div className="form-actions">
          <Button type="submit" loading={posting}>
            Post comment
          </Button>
        </div>
      </form>
    </section>
  );
}

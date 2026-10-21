'use client';
import { useState } from 'react';
import type { WorkspaceRequest } from '../data/workspace';
import styles from './RequestActions.module.css';

export default function RequestActions({
  request,
  conflict,
  onDecision,
}: {
  request: WorkspaceRequest;
  conflict: boolean;
  onDecision: (id: string, decision: 'Confirmed' | 'Rejected') => void;
}) {
  const [decision, setDecision] = useState<'Confirmed' | 'Rejected' | null>(
    null,
  );
  if (request.status !== 'Pending') return null;
  return (
    <div className={styles.actions}>
      {conflict && (
        <p id={`conflict-${request.id}`}>
          This time overlaps a confirmed appointment for this doctor or an
          unassigned doctor. Approval is unavailable.
        </p>
      )}
      <button
        type="button"
        disabled={conflict}
        aria-describedby={conflict ? `conflict-${request.id}` : undefined}
        onClick={() => setDecision('Confirmed')}
      >
        Approve
      </button>
      <button type="button" onClick={() => setDecision('Rejected')}>
        Reject
      </button>
      {decision && (
        <div
          className={styles.confirmation}
          role="group"
          aria-label="Confirm request decision"
        >
          <p>
            {decision === 'Confirmed' ? 'Approve' : 'Reject'} the request for{' '}
            {request.patient}? This changes this preview only. No patient will
            be notified.
          </p>
          <button type="button" onClick={() => setDecision(null)}>
            Go back
          </button>
          <button
            type="button"
            disabled={decision === 'Confirmed' && conflict}
            onClick={() => {
              onDecision(request.id, decision);
              setDecision(null);
            }}
          >
            Confirm {decision === 'Confirmed' ? 'approval' : 'rejection'}
          </button>
        </div>
      )}
    </div>
  );
}

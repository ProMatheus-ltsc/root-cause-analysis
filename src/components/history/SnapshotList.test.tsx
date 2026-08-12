import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SnapshotList } from './SnapshotList';
import type { Snapshot } from '../../services/db';

const mockSnapshots: Snapshot[] = [
  {
    id: 's1',
    recordId: 'r1',
    data: { title: 'test' },
    label: '快照 08-10 14:30:00',
    createdAt: '2026-08-10T14:30:00.000Z',
  },
  {
    id: 's2',
    recordId: 'r1',
    data: { title: 'older' },
    label: '快照 08-09 10:00:00',
    createdAt: '2026-08-09T10:00:00.000Z',
  },
];

describe('SnapshotList', () => {
  it('renders empty state when no snapshots', () => {
    render(
      <SnapshotList
        snapshots={[]}
        loading={false}
        onRestore={() => {}}
        onDelete={() => {}}
        onCreateSnapshot={() => {}}
      />,
    );
    expect(screen.getByText(/暂无版本历史/)).toBeInTheDocument();
    expect(screen.getByText('创建快照')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <SnapshotList
        snapshots={[]}
        loading={true}
        onRestore={() => {}}
        onDelete={() => {}}
        onCreateSnapshot={() => {}}
      />,
    );
    expect(screen.getByText('加载版本历史…')).toBeInTheDocument();
  });

  it('renders snapshot items', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        loading={false}
        onRestore={() => {}}
        onDelete={() => {}}
        onCreateSnapshot={() => {}}
      />,
    );
    expect(screen.getByText('快照 08-10 14:30:00')).toBeInTheDocument();
    expect(screen.getByText('快照 08-09 10:00:00')).toBeInTheDocument();
    expect(screen.getAllByText('恢复')).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="问题总数" value={12} />);
    expect(screen.getByText('问题总数')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    render(<StatCard label="已完成" value={5} hint="较上周增加 2" />);
    expect(screen.getByText('较上周增加 2')).toBeInTheDocument();
  });

  it('applies accent class name', () => {
    render(<StatCard label="进行中" value={3} accentClassName="text-brand-600" />);
    const valueEl = screen.getByText('3');
    expect(valueEl).toHaveClass('text-brand-600');
  });
});

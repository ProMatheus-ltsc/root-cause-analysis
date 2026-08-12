import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatrixHeatmap } from './MatrixHeatmap';

describe('MatrixHeatmap', () => {
  it('renders empty state when no factors', () => {
    render(<MatrixHeatmap factorNames={[]} matrix={[]} />);
    expect(screen.getByText(/添加因素并填写矩阵后/)).toBeInTheDocument();
  });

  it('renders heatmap table with factor names', () => {
    const factorNames = ['人员不足', '流程复杂', '设备老化'];
    const matrix = [
      [0, 2, 1],
      [0, 0, 4],
      [1, 0, 0],
    ];
    render(<MatrixHeatmap factorNames={factorNames} matrix={matrix} />);
    expect(screen.getByRole('img', { name: /因果矩阵热力图/ })).toBeInTheDocument();
  });

  it('renders legend', () => {
    const factorNames = ['A', 'B'];
    const matrix = [[0, 1], [2, 0]];
    render(<MatrixHeatmap factorNames={factorNames} matrix={matrix} />);
    expect(screen.getByText('弱')).toBeInTheDocument();
    expect(screen.getByText('强')).toBeInTheDocument();
  });
});

import { CustomCell, CustomRenderer, GridCellKind } from '@glideapps/glide-data-grid';

import { roundedRect } from 'kit/DataGrid/custom-renderers/utils';

interface ProgressCellProps {
  readonly kind: 'progress-cell';
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly label?: string;
  readonly measureLabel?: string;
  readonly readonly?: boolean;
  readonly color: string;
}

export type ProgressCell = CustomCell<ProgressCellProps>;

const RANGE_HEIGHT = 6;

const renderer: CustomRenderer<ProgressCell> = {
  draw: (args, cell) => {
    const { ctx, theme, rect } = args;
    const { min, max, value, color } = cell.data;

    const x = rect.x + theme.cellHorizontalPadding;
    const yMid = rect.y + rect.height / 2;

    const rangeSize = max - min;
    const fillRatio = (value - min) / rangeSize;

    ctx.save();

    const rangeWidth = (rect.width - theme.cellHorizontalPadding) * fillRatio;

    ctx.shadowColor = '#D0D0D0';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowOffsetY = 5;
    roundedRect(ctx, x, yMid - RANGE_HEIGHT / 2, rangeWidth, RANGE_HEIGHT, RANGE_HEIGHT / 2);
    ctx.fill();

    ctx.restore();

    return true;
  },
  isMatch: (c): c is ProgressCell => (c.data as ProgressCellProps).kind === 'progress-cell',
  kind: GridCellKind.Custom,
  onPaste: (v, d) => {
    let num = Number.parseFloat(v);
    num = Number.isNaN(num) ? d.value : Math.max(d.min, Math.min(d.max, num));
    return {
      ...d,
      value: num,
    };
  },
  provideEditor: () => undefined,
};

export default renderer;

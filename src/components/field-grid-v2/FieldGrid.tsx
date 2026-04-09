import { Card } from 'antd';
import { useRef } from 'react';

import useFieldGrid from './useFieldGrid';
import type { FieldGridProps } from './interface';

function FieldGrid(props: FieldGridProps) {
  const {
    items: originalItems,
    labelWidth,
    labelAlign,
    wrapCard = false,
    colon = true,
    layoutConfig,
    style,
    className,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, renderGrid } = useFieldGrid({
    items: originalItems,
    labelWidth,
    labelAlign,
    colon,
    layoutConfig,
    containerRef,
  });

  if (wrapCard) {
    return <Card>{renderGrid({ items, style, className })}</Card>;
  }

  return <>{renderGrid({ items, style, className })}</>;
}

FieldGrid.useFieldGrid = useFieldGrid;

export default FieldGrid;
export type { FieldGridProps };

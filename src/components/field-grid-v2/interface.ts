import type { CSSProperties, Key, ReactNode, RefObject } from 'react';
import type { FormItemProps } from 'antd';

export interface FieldGridItem
  extends Omit<FormItemProps, 'children' | 'noStyle' | 'shouldUpdate'> {
  value?: FormItemProps['children'];
  render?: (props: FormItemProps) => ReactNode;
  colSpan?: number | 'max';
  colStart?: number;
  colEnd?: number;
  key?: Key;
  renderable?: boolean;
}

export interface FieldGridProps {
  items: FieldGridItem[];
  labelWidth?: number | string | 'auto';
  labelAlign?: FormItemProps['labelAlign'];
  wrapCard?: boolean;
  style?: CSSProperties;
  className?: string;
  colon?: boolean;
  layoutConfig?: FieldGridLayoutConfig;
}

export interface FieldGridLayoutConfig {
  minColumnWidth?: number;
  columnGap?: number;
  rowGap?: number;
}

export interface UseFieldGridProps
  extends Partial<
    Pick<
      FieldGridProps,
      'items' | 'labelWidth' | 'labelAlign' | 'colon' | 'layoutConfig'
    >
  > {
  containerRef: RefObject<HTMLDivElement | null>;
}

export interface FormItemWithGrid
  extends FormItemProps,
    Pick<FieldGridItem, 'value' | 'render' | 'key'> {
  colStart: number;
  colEnd: number;
  rowIndex: number;
}

import { Space, Table, Tooltip } from 'antd';
import type { TablePaginationConfig } from 'antd';
import cs from 'classnames';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
  Ref,
  RefAttributes,
  ThHTMLAttributes,
} from 'react';

import type {
  ProTableColumnType,
  ProTableColumnsType,
  ProTableProps,
  ProTableRef,
  SettingItem,
  TableStoreValue,
} from './interface';
import SettingPanel from './SettingPanel';
import styles from './ProTable.module.less';
import { connectStore } from './utils/indexedDB';
import { isEmpty } from './utils/isEmpty';

const serialColumnKey = '__pro_table_serial__';
const minColumnWidth = 80;

type SettingStateItem = SettingItem & TableStoreValue;

interface ResizableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement> {
  width?: number;
  resizable?: boolean;
  resizing?: boolean;
  onResizeStart?: (
    event: ReactMouseEvent<HTMLSpanElement>,
    currentWidth: number
  ) => void;
}

function ResizableHeaderCell({
  children,
  className,
  resizable,
  resizing,
  width,
  onResizeStart,
  ...restProps
}: ResizableHeaderCellProps) {
  return (
    <th
      {...restProps}
      className={cs(className, {
        [styles.resizableHeaderCell]: resizable,
      })}
    >
      {children}
      {resizable && width ? (
        <Tooltip
          title="可拖拽调整宽度"
          placement="top"
          open={resizing ? false : undefined}
          mouseEnterDelay={0.35}
          destroyTooltipOnHide
        >
          <span
            className={styles.resizeHandle}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => onResizeStart?.(event, width)}
          />
        </Tooltip>
      ) : null}
    </th>
  );
}

function normalizeColumnKey(value: unknown) {
  if (Array.isArray(value)) {
    return value.join('.');
  }

  return String(value);
}

function getColumnKey<RecordType extends object>(
  column: ProTableColumnType<RecordType>
) {
  if (column.key !== undefined) {
    return normalizeColumnKey(column.key);
  }

  if (column.dataIndex !== undefined) {
    return normalizeColumnKey(column.dataIndex);
  }

  throw new Error(`${JSON.stringify(column)} need a dataIndex or key`);
}

function getSettingLabel<RecordType extends object>(
  column: ProTableColumnType<RecordType>
) {
  if (typeof column.title === 'function') {
    return getColumnKey(column);
  }

  return column.title ?? getColumnKey(column);
}

function getGroupTitle<RecordType extends object>(column: ProTableColumnType<RecordType>) {
  if (typeof column.title === 'string' || typeof column.title === 'number') {
    return String(column.title);
  }

  return '';
}

function isSerialColumn<RecordType extends object>(
  column: ProTableColumnType<RecordType>
) {
  return column.key === serialColumnKey;
}

function getSerialNumber(
  index: number,
  pagination?: false | TablePaginationConfig
) {
  if (!pagination) {
    return index + 1;
  }

  return (pagination.pageSize ?? 10) * ((pagination.current ?? 1) - 1) + index + 1;
}

function collectSettingLeafItems<RecordType extends object>(
  columns: ProTableColumnType<RecordType>[],
  tableKey: string,
  parentIndexes: number[] = [],
  parentTitles: string[] = []
): (SettingStateItem & { defaultSortIndex?: number })[] {
  const result: (SettingStateItem & { defaultSortIndex?: number })[] = [];

  columns.forEach((column, index) => {
    const nextIndexes = [...parentIndexes, index];

    if (column.children?.length) {
      const groupTitle = getGroupTitle(column);
      result.push(
        ...collectSettingLeafItems(
          column.children,
          tableKey,
          nextIndexes,
          groupTitle ? [...parentTitles, groupTitle] : parentTitles
        )
      );
      return;
    }

    if (column.fixed) {
      return;
    }

    const key = getColumnKey(column);
    result.push({
      id: `${tableKey}:${key}`,
      tableKey,
      key,
      label: getSettingLabel(column),
      hidden: Boolean(column.setting?.defaultHide),
      hideable: Boolean(column.setting?.hideable ?? true),
      sort: result.length,
      width: typeof column.width === 'number' ? column.width : undefined,
      defaultSortIndex: column.setting?.defaultSortIndex,
      sortGroupKey: parentIndexes.length > 0 ? parentIndexes.join('.') : 'root',
      groupPath: parentTitles,
    });
  });

  return result.map((item, index) => ({
    ...item,
    sort: index,
  }));
}

function applySettingToColumns<RecordType extends object>(
  columns: ProTableColumnType<RecordType>[],
  settingItems: SettingStateItem[],
  draftColumnWidths: Record<string, number>
): ProTableColumnType<RecordType>[] {
  const settingMap = new Map(settingItems.map((item) => [item.key, item]));

  const walk = (
    sourceColumns: ProTableColumnType<RecordType>[]
  ): (ProTableColumnType<RecordType> & { sort: number; originalIndex: number })[] => {
    const hasGroupedSiblings = sourceColumns.some((column) => column.children?.length);

    const nextColumns = sourceColumns.flatMap((column, index) => {
      if (column.children?.length) {
        const nextChildren = walk(column.children).map(
          ({ sort: _sort, originalIndex: _originalIndex, ...childColumn }) => childColumn
        );

        if (nextChildren.length === 0) {
          return [];
        }

        return [
          {
            ...column,
            children: nextChildren,
            sort: index,
            originalIndex: index,
          },
        ];
      }

      if (
        isSerialColumn(column) ||
        column.fixed === true ||
        column.fixed === 'left'
      ) {
        return [
          {
            ...column,
            sort: -10000 + index,
            originalIndex: index,
          },
        ];
      }

      if (column.fixed === 'right') {
        return [
          {
            ...column,
            sort: 10000 + index,
            originalIndex: index,
          },
        ];
      }

      const settingItem = settingMap.get(getColumnKey(column));
      if (settingItem?.hidden === true) {
        return [];
      }

      const columnKey = getColumnKey(column);
      const resolvedWidth =
        draftColumnWidths[columnKey] ?? settingItem?.width ?? column.width;

      return [
        {
          ...column,
          width: resolvedWidth,
          sort: settingItem?.sort ?? index,
          originalIndex: index,
        },
      ];
    });

    if (hasGroupedSiblings) {
      return nextColumns;
    }

    return nextColumns.sort((left, right) => {
      if (left.sort === right.sort) {
        return left.originalIndex - right.originalIndex;
      }

      return left.sort - right.sort;
    });
  };

  return walk(columns).map(({ sort: _sort, originalIndex: _originalIndex, ...column }) => column);
}

function applyResizableWidthsToColumns<RecordType extends object>(
  columns: ProTableColumnType<RecordType>[],
  settingItems: SettingStateItem[],
  draftColumnWidths: Record<string, number>
): ProTableColumnType<RecordType>[] {
  const settingMap = new Map(settingItems.map((item) => [item.key, item]));

  return columns.map((column) => {
    const nextColumn: ProTableColumnType<RecordType> = { ...column };

    if (nextColumn.children?.length) {
      nextColumn.children = applyResizableWidthsToColumns(
        nextColumn.children,
        settingItems,
        draftColumnWidths
      );
      return nextColumn;
    }

    if (
      isSerialColumn(nextColumn) ||
      nextColumn.fixed === true ||
      nextColumn.fixed === 'left' ||
      nextColumn.fixed === 'right'
    ) {
      return nextColumn;
    }

    const columnKey = getColumnKey(nextColumn);
    const resolvedWidth =
      draftColumnWidths[columnKey] ??
      settingMap.get(columnKey)?.width ??
      nextColumn.width;

    return {
      ...nextColumn,
      width: resolvedWidth,
    };
  });
}

function flattenLeafColumns<RecordType extends object>(
  columns: ProTableColumnType<RecordType>[]
): ProTableColumnType<RecordType>[] {
  return columns.flatMap((column) => {
    if (column.children?.length) {
      return flattenLeafColumns(column.children);
    }

    return [column];
  });
}

function InternalProTable<RecordType extends object>(
  props: ProTableProps<RecordType>,
  ref: Ref<ProTableRef>
) {
  const {
    uniqueKey,
    caption,
    rowSelection,
    pagination,
    footer,
    columns,
    renderEmptyContent = '-',
    columnResizable = true,
    sticky,
    serial = true,
    dataSource,
    rowKey,
    summary: propSummary,
    className,
    ...restProps
  } = props;

  const [settingItems, setSettingItems] = useState<
    (SettingItem & TableStoreValue)[] | null
  >(null);
  const [draftColumnWidths, setDraftColumnWidths] = useState<Record<string, number>>(
    {}
  );
  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const draftColumnWidthsRef = useRef<Record<string, number>>({});
  const resizeSessionRef = useRef<{
    key: string;
    nextKey: string;
    startX: number;
    startWidth: number;
    nextWidth: number;
  } | null>(null);
  const canUseIndexedDB =
    typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

  const settingEnabled = useMemo(() => {
    const enabled = caption !== false && Boolean(caption?.setting);
    if (enabled && !uniqueKey) {
      throw new Error('ProTable requires uniqueKey when caption.setting is enabled.');
    }
    return enabled;
  }, [caption, uniqueKey]);

  const tableKey = useMemo(() => {
    const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
    return `${pathname}:${uniqueKey ?? ''}`;
  }, [uniqueKey]);

  const preferenceEnabled = settingEnabled || columnResizable;

  const originalSettingItems = useMemo<
    ((SettingItem & TableStoreValue) & { defaultSortIndex?: number })[]
  >(() => {
    if (!columns || !preferenceEnabled) {
      return [];
    }

    return collectSettingLeafItems(columns, tableKey);
  }, [columns, preferenceEnabled, tableKey]);

  useEffect(() => {
    if (!preferenceEnabled) {
      setSettingItems(null);
      return;
    }

    if (originalSettingItems.length === 0) {
      setSettingItems([]);
      return;
    }

    if (!uniqueKey || !canUseIndexedDB) {
      setSettingItems(originalSettingItems);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const { get, getAll, close } = await connectStore(tableKey);
      try {
        const all = await getAll();

        if (cancelled) {
          return;
        }

        if (all.length === 0) {
          setSettingItems(originalSettingItems);
          return;
        }

        const nextItems = await Promise.all(
          originalSettingItems.map(async (item) => {
            const { defaultSortIndex, sort, ...restItem } = item;
            const stored = await get(restItem.key);

            return {
              ...restItem,
              sort: stored?.sort ?? defaultSortIndex ?? 10000 + sort,
              hidden: restItem.hideable ? stored?.hidden ?? false : false,
              width: stored?.width ?? restItem.width,
            };
          })
        );

        if (cancelled) {
          return;
        }

        setSettingItems(
          nextItems
            .sort((left, right) => left.sort - right.sort)
            .map((item, index) => ({
              ...item,
              sort: index,
            }))
        );
      } finally {
        close();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [canUseIndexedDB, originalSettingItems, preferenceEnabled, tableKey, uniqueKey]);

  useEffect(() => {
    if (!uniqueKey || !canUseIndexedDB || !preferenceEnabled || settingItems === null) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const { put, close } = await connectStore(tableKey);
      try {
        if (cancelled) {
          return;
        }

        await put(
          settingItems.map((item) => ({
            id: item.id,
            tableKey: item.tableKey,
            key: item.key,
            hidden: item.hidden,
            sort: item.sort,
            width: item.width,
          }))
        );
      } finally {
        close();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [canUseIndexedDB, preferenceEnabled, settingItems, tableKey, uniqueKey]);

  const resetSetting = () => {
    setSettingItems(originalSettingItems);
  };

  const selectAllSetting = () => {
    setSettingItems(
      originalSettingItems.map((item) => ({
        ...item,
        hidden: false,
      }))
    );
  };

  const finalPagination = useMemo<false | TablePaginationConfig | undefined>(() => {
    if (pagination === undefined) {
      return undefined;
    }

    if (pagination === false) {
      return false;
    }

    return {
      showQuickJumper: true,
      showSizeChanger: true,
      position: ['bottomCenter'],
      ...pagination,
    };
  }, [pagination]);

  useEffect(() => {
    draftColumnWidthsRef.current = draftColumnWidths;
  }, [draftColumnWidths]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, []);

  const resizableEnabled = columnResizable && settingItems !== null;

  const commitColumnWidth = (columnKey: string, width: number) => {
    setSettingItems((current) => {
      if (!current) {
        return current;
      }

      return current.map((item) =>
        item.key === columnKey
          ? {
              ...item,
              width,
            }
          : item
      );
    });
  };

  const onStartColumnResize = (
    columnKey: string,
    nextColumnKey: string,
    currentWidth: number,
    nextWidth: number,
    event: ReactMouseEvent<HTMLSpanElement>
  ) => {
    if (!resizableEnabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    resizeSessionRef.current = {
      key: columnKey,
      nextKey: nextColumnKey,
      startX: event.clientX,
      startWidth: currentWidth,
      nextWidth,
    };
    setIsColumnResizing(true);

    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentSession = resizeSessionRef.current;
      if (!currentSession) {
        return;
      }

      const delta = moveEvent.clientX - currentSession.startX;
      const minDelta = minColumnWidth - currentSession.startWidth;
      const maxDelta = currentSession.nextWidth - minColumnWidth;
      const clampedDelta = Math.min(Math.max(delta, minDelta), maxDelta);
      const nextCurrentWidth = Math.max(
        minColumnWidth,
        Math.round(currentSession.startWidth + clampedDelta)
      );
      const nextNeighborWidth = Math.max(
        minColumnWidth,
        Math.round(currentSession.nextWidth - clampedDelta)
      );

      setDraftColumnWidths((current) => {
        const next = {
          ...current,
          [currentSession.key]: nextCurrentWidth,
          [currentSession.nextKey]: nextNeighborWidth,
        };
        draftColumnWidthsRef.current = next;
        return next;
      });
    };

    const handleMouseUp = () => {
      const currentSession = resizeSessionRef.current;
      if (!currentSession) {
        return;
      }

      const nextWidth =
        draftColumnWidthsRef.current[currentSession.key] ?? currentSession.startWidth;
      const nextNeighborWidth =
        draftColumnWidthsRef.current[currentSession.nextKey] ?? currentSession.nextWidth;
      commitColumnWidth(currentSession.key, nextWidth);
      commitColumnWidth(currentSession.nextKey, nextNeighborWidth);
      resizeSessionRef.current = null;
      setIsColumnResizing(false);
      setDraftColumnWidths((current) => {
        const next = { ...current };
        delete next[currentSession.key];
        delete next[currentSession.nextKey];
        draftColumnWidthsRef.current = next;
        return next;
      });

      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const withResizableHeaderCells = (
    sourceColumns: ProTableColumnType<RecordType>[],
    resizePairs: Map<string, { nextKey: string; nextWidth: number }>
  ): ProTableColumnType<RecordType>[] => {
    return sourceColumns.map((column) => {
      const nextColumn: ProTableColumnType<RecordType> = { ...column };

      if (nextColumn.children?.length) {
        nextColumn.children = withResizableHeaderCells(
          nextColumn.children,
          resizePairs
        );
        return nextColumn;
      }

      if (
        !resizableEnabled ||
        isSerialColumn(nextColumn) ||
        nextColumn.resizable === false ||
        nextColumn.fixed === true ||
        nextColumn.fixed === 'left' ||
        nextColumn.fixed === 'right'
      ) {
        return nextColumn;
      }

      const columnKey = getColumnKey(nextColumn);
      const resizePair = resizePairs.get(columnKey);
      const currentWidth =
        draftColumnWidths[columnKey] ??
        settingItems?.find((item) => item.key === columnKey)?.width ??
        (typeof nextColumn.width === 'number' ? nextColumn.width : undefined);

      if (!currentWidth || !resizePair) {
        return nextColumn;
      }

      const originalOnHeaderCell = nextColumn.onHeaderCell;
      nextColumn.onHeaderCell = (columnItem) => {
        const originalCellProps = originalOnHeaderCell?.(columnItem) ?? {};

        return {
          ...originalCellProps,
          width: currentWidth,
          resizable: true,
          resizing: isColumnResizing,
          onResizeStart: (event: ReactMouseEvent<HTMLSpanElement>) =>
            onStartColumnResize(
              columnKey,
              resizePair.nextKey,
              currentWidth,
              resizePair.nextWidth,
              event
            ),
        };
      };

      return nextColumn;
    });
  };

  const resolvedColumns = useMemo(() => {
    const wrapColumns = (
      sourceColumns?: ProTableColumnType<RecordType>[]
    ): ProTableColumnsType<RecordType> => {
      return (sourceColumns ?? []).map((column) => {
        const nextColumn: ProTableColumnType<RecordType> = { ...column };

        if (!nextColumn.render) {
          nextColumn.render = (text: unknown) => {
            return isEmpty(text) ? renderEmptyContent : (text as ReactNode);
          };
        } else {
          const originalRender = nextColumn.render;
          nextColumn.render = (
            ...args: Parameters<Exclude<ProTableColumnType<RecordType>['render'], undefined>>
          ) => {
            const result = originalRender(...args);
            return isEmpty(result) ? renderEmptyContent : result;
          };
        }

        if (nextColumn.children?.length) {
          nextColumn.children = wrapColumns(nextColumn.children);
        }

        return nextColumn;
      });
    };

    const nextColumns = wrapColumns(columns);

    if (serial) {
      const serialColumnConfig = serial === true ? {} : serial;
      const originalSerialRender = serialColumnConfig.render;
      const serialColumn: ProTableColumnType<RecordType> = {
        key: serialColumnKey,
        align: 'center',
        fixed: 'left',
        width: 80,
        ...serialColumnConfig,
        render: (_value, record, index) => {
          const serialNo = getSerialNumber(index, finalPagination);
          if (!originalSerialRender) {
            return serialNo;
          }
          return originalSerialRender(serialNo, record, index);
        },
      };
      nextColumns.unshift(serialColumn);
    }

    if (settingItems === null) {
      return nextColumns;
    }

    if (!settingEnabled) {
      return applyResizableWidthsToColumns(
        nextColumns,
        settingItems,
        draftColumnWidths
      );
    }

    return applySettingToColumns(nextColumns, settingItems, draftColumnWidths);
  }, [
    columns,
    columnResizable,
    draftColumnWidths,
    finalPagination,
    preferenceEnabled,
    renderEmptyContent,
    serial,
    settingEnabled,
    settingItems,
  ]);

  const finalColumns = useMemo(() => {
    if (!resizableEnabled) {
      return resolvedColumns;
    }

    const leafColumns = flattenLeafColumns(resolvedColumns);
    const resizePairs = new Map<string, { nextKey: string; nextWidth: number }>();

    for (let index = 0; index < leafColumns.length - 1; index += 1) {
      const currentColumn = leafColumns[index];
      const nextColumn = leafColumns[index + 1];

      if (
        isSerialColumn(currentColumn) ||
        isSerialColumn(nextColumn) ||
        currentColumn.resizable === false ||
        nextColumn.resizable === false ||
        currentColumn.fixed === true ||
        currentColumn.fixed === 'left' ||
        currentColumn.fixed === 'right' ||
        nextColumn.fixed === true ||
        nextColumn.fixed === 'left' ||
        nextColumn.fixed === 'right'
      ) {
        continue;
      }

      const currentKey = getColumnKey(currentColumn);
      const nextKey = getColumnKey(nextColumn);
      const currentWidth =
        draftColumnWidths[currentKey] ??
        settingItems?.find((item) => item.key === currentKey)?.width ??
        (typeof currentColumn.width === 'number' ? currentColumn.width : undefined);
      const nextWidth =
        draftColumnWidths[nextKey] ??
        settingItems?.find((item) => item.key === nextKey)?.width ??
        (typeof nextColumn.width === 'number' ? nextColumn.width : undefined);

      if (!currentWidth || !nextWidth) {
        continue;
      }

      resizePairs.set(currentKey, {
        nextKey,
        nextWidth,
      });
    }

    return withResizableHeaderCells(resolvedColumns, resizePairs);
  }, [draftColumnWidths, isColumnResizing, resizableEnabled, resolvedColumns, settingItems]);

  const finalDataSource = useMemo(() => {
    return (dataSource ?? []) as RecordType[];
  }, [dataSource]);

  const normalizedRowSelection = useMemo(() => {
    if (!rowSelection) {
      return undefined;
    }

    const { desc: _desc, actions: _actions, ...restRowSelection } = rowSelection;
    return restRowSelection;
  }, [rowSelection]);

  const mergedComponents = useMemo(() => {
    const originalComponents = restProps.components;
    if (originalComponents?.header?.cell) {
      return originalComponents;
    }

    return {
      ...originalComponents,
      header: {
        ...originalComponents?.header,
        cell: ResizableHeaderCell,
      },
    };
  }, [restProps.components]);

  const mergedTableLayout = useMemo(() => {
    if (restProps.tableLayout) {
      return restProps.tableLayout;
    }

    if (resizableEnabled) {
      return 'fixed';
    }

    return undefined;
  }, [resizableEnabled, restProps.tableLayout]);

  const finalFooter = useMemo(() => {
    if (footer) {
      return footer;
    }

    if (!rowSelection) {
      return undefined;
    }

    return () => (
      <div className={styles.selection}>
        <div className={styles.selectionDesc}>
          {(() => {
            if (rowSelection.desc) {
              if (typeof rowSelection.desc === 'function') {
                return rowSelection.desc({
                  dataSource: finalDataSource,
                  pagination: finalPagination,
                });
              }

              return rowSelection.desc;
            }

            return (
              <>
                共选中
                <span className={styles.selectionDescPrimary}>
                  {rowSelection.selectedRowKeys?.length ?? 0}
                </span>
                条数据
              </>
            );
          })()}
        </div>
        <Space className={styles.selectionActions}>{rowSelection.actions}</Space>
      </div>
    );
  }, [finalDataSource, finalPagination, footer, rowSelection]);

  const finalSummary = useMemo(() => {
    if (propSummary) {
      return () => propSummary(finalDataSource, settingItems ?? undefined);
    }

    if (finalDataSource.length === 0) {
      return undefined;
    }

    const hasSummary = finalColumns.some((column) => column.summary);
    if (!hasSummary) {
      return undefined;
    }

    const summaryCells = finalColumns.map((column, index) => {
      const { summary, align, colSpan, children } = column;
      let span = 1;

      if (children) {
        span = children.length;
      }

      if (colSpan) {
        span = colSpan;
      }

      return (
        <Table.Summary.Cell
          key={column.key ?? String(column.dataIndex ?? index)}
          index={index}
          align={align}
          colSpan={span}
        >
          {summary?.(finalDataSource)}
        </Table.Summary.Cell>
      );
    });

    return () => <Table.Summary.Row>{summaryCells}</Table.Summary.Row>;
  }, [finalColumns, finalDataSource, propSummary, settingItems]);

  useImperativeHandle(
    ref,
    () => ({
      setSettingItems: (handle) => {
        if (!settingEnabled) {
          throw new Error('ProTable setting is not enabled.');
        }

        setSettingItems((current) => {
          const fallback = current ?? originalSettingItems;
          return typeof handle === 'function' ? handle(fallback) : handle;
        });
      },
    }),
    [originalSettingItems, settingEnabled]
  );

  return (
    <div className={cs(styles.root, className)}>
      {caption !== false && (
        <div className={styles.caption}>
          <div className={styles.captionDesc}>
            {(() => {
              if (caption?.desc) {
                if (typeof caption.desc === 'function') {
                  return caption.desc({
                    dataSource: finalDataSource,
                    pagination: finalPagination,
                  });
                }

                return caption.desc;
              }

      if (finalPagination) {
        return (
          <>
            <span className={styles.captionDescItem}>
                      本页: {finalDataSource.length}条
                    </span>
                    <span className={styles.captionDescItem}>
                      总计: {finalPagination.total ?? 0}条
                    </span>
                  </>
                );
              }

              return null;
            })()}
          </div>
          <Space className={styles.captionActions}>
            {caption?.actions}
            {caption?.setting && originalSettingItems.length > 0 && (
              <SettingPanel
                value={settingItems ?? originalSettingItems}
                onChange={setSettingItems}
                onReset={resetSetting}
                onSelectAll={selectAllSetting}
              />
            )}
          </Space>
        </div>
      )}
      <Table<RecordType>
        {...restProps}
        components={mergedComponents}
        sticky={sticky}
        tableLayout={mergedTableLayout}
        rowKey={rowKey}
        columns={finalColumns as NonNullable<ProTableProps<RecordType>['columns']>}
        dataSource={finalDataSource}
        pagination={finalPagination}
        rowSelection={normalizedRowSelection}
        footer={finalFooter}
        summary={finalSummary}
      />
    </div>
  );
}

const ProTable = forwardRef(InternalProTable) as unknown as (<
  RecordType extends object = Record<string, any>,
>(
  props: ProTableProps<RecordType> & RefAttributes<ProTableRef>
) => ReactElement);

export default ProTable;

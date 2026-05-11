import { Card } from 'antd';
import { useCallback, useMemo } from 'react';

import ProTable from '../pro-table';
import type {
  ObjectType,
  UseSearchTableProps,
  UseSearchTableResult,
} from './interface';
import usePaginatedSearch from './usePaginatedSearch';

export default function useSearchTable<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
>(
  props: UseSearchTableProps<ValueType, Condition, ResExtra>
): UseSearchTableResult<ValueType, ResExtra> {
  const { layout = 'card', ...restProps } = props;
  const {
    requestMethod,
    conditions,
    pagination,
    ready = true,
    manual = false,
    onChange: externalOnChange,
    onError,
    ...tableProps
  } = restProps;

  const {
    data,
    error,
    loading,
    run,
    refresh,
    mutate,
    onChange,
    paginationProps,
  } = usePaginatedSearch({
    requestMethod,
    conditions,
    pagination,
    ready,
    manual,
    onError,
  });

  const mergedOnChange = useCallback<
    NonNullable<UseSearchTableProps<ValueType, Condition, ResExtra>['onChange']>
  >(
    (tablePagination, filters, sorter, extra) => {
      onChange(tablePagination, filters, sorter, extra);
      externalOnChange?.(tablePagination, filters, sorter, extra);
    },
    [externalOnChange, onChange]
  );

  const render = useMemo(() => {
    const { onChange: _ignoredOnChange, ...restPaginationProps } = paginationProps;

    const table = (
      <ProTable<ValueType>
        {...tableProps}
        onChange={mergedOnChange}
        pagination={
          pagination === false
            ? false
            : {
                ...(pagination ?? {}),
                ...restPaginationProps,
              }
        }
        loading={loading}
        dataSource={data?.records}
      />
    );

    if (layout === 'card') {
      return <Card>{table}</Card>;
    }

    return table;
  }, [
    data?.records,
    layout,
    loading,
    mergedOnChange,
    pagination,
    paginationProps,
    tableProps,
  ]);

  const refreshTable = useCallback<UseSearchTableResult<ValueType, ResExtra>['refresh']>(
    async (toFirst?: boolean) => {
      if (toFirst) {
        return run({
          pageNum: 1,
        });
      }

      return refresh();
    },
    [refresh, run]
  );

  return {
    refresh: refreshTable,
    run,
    mutate,
    error,
    loading,
    data,
    render,
  };
}

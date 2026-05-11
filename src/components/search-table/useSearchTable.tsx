import { Card } from 'antd';
import { useCallback, useMemo } from 'react';

import ProTable from '../pro-table';
import type { ObjectType, SearchTableProps } from './interface';
import usePaginatedSearch from './usePaginatedSearch';

export default function useSearchTable<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
>(props: SearchTableProps<ValueType, Condition, ResExtra>) {
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
    changeCurrent,
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
    NonNullable<SearchTableProps<ValueType, Condition, ResExtra>['onChange']>
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

  return {
    refresh: (toFirst?: boolean) => {
      if (toFirst) {
        changeCurrent(1);
        return;
      }

      void refresh();
    },
    run,
    mutate,
    error,
    loading,
    data,
    render,
  };
}

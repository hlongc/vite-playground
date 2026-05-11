import { Pagination } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SorterResult } from 'antd/es/table/interface';
import type { TablePaginationConfig } from 'antd';

import type {
  ObjectType,
  PaginatedSearchProps,
  SearchTableRequestParams,
  SearchTableRes,
  TableParams,
  UsePaginatedSearchResult,
} from './interface';

function normalizeResult<ValueType extends ObjectType, ResExtra>(
  result?: SearchTableRes<ValueType, ResExtra>
) {
  return {
    records: result?.records ?? [],
    totalCount: result?.totalCount ?? 0,
    extra: result?.extra,
  };
}

export default function usePaginatedSearch<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
>({
  requestMethod,
  conditions,
  manual = false,
  ready = true,
  pagination,
  onError,
}: PaginatedSearchProps<ValueType, Condition, ResExtra>): UsePaginatedSearchResult<
  ValueType,
  ResExtra
> {
  const [tableFilter, setTableFilter] = useState<TableParams>({
    pageNum: pagination === false ? 1 : pagination?.defaultCurrent ?? 1,
    pageSize: pagination === false ? 10 : pagination?.defaultPageSize ?? 10,
  });
  const [data, setData] = useState<SearchTableRes<ValueType, ResExtra>>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  const loadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const requestMethodRef = useRef(requestMethod);
  const conditionsRef = useRef(conditions);
  const tableFilterRef = useRef(tableFilter);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    requestMethodRef.current = requestMethod;
  }, [requestMethod]);

  useEffect(() => {
    conditionsRef.current = conditions;
  }, [conditions]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    tableFilterRef.current = tableFilter;
  }, [tableFilter]);

  const run = useCallback(
    async (tableParams?: Partial<TableParams>) => {
      const nextTableFilter = {
        ...tableFilterRef.current,
        ...tableParams,
      };

      tableFilterRef.current = nextTableFilter;
      setTableFilter(nextTableFilter);

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(undefined);

      const params: SearchTableRequestParams<Condition> = {
        ...nextTableFilter,
        param: conditionsRef.current,
      };

      try {
        const result = normalizeResult(
          await requestMethodRef.current(params)
        ) as SearchTableRes<ValueType, ResExtra>;

        if (requestId === requestIdRef.current) {
          setData(result);
          setError(undefined);
        }

        return result;
      } catch (nextError) {
        if (requestId === requestIdRef.current) {
          setError(nextError);
          onErrorRef.current?.(nextError, params);
        }
        throw nextError;
      } finally {
        loadedRef.current = true;
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const changeCurrent = useCallback(
    (pageNum: number, pageSize?: number) => {
      const nextTableParams = {
        ...tableFilterRef.current,
        pageNum,
        pageSize: pageSize ?? tableFilterRef.current.pageSize,
      };

      tableFilterRef.current = nextTableParams;
      setTableFilter(nextTableParams);
      void run(nextTableParams).catch(() => undefined);
    },
    [run]
  );

  const refresh = useCallback(() => {
    return run(tableFilterRef.current);
  }, [run]);

  useEffect(() => {
    if (!manual && ready && !loadedRef.current) {
      void run(tableFilterRef.current).catch(() => undefined);
    }
  }, [manual, ready, run]);

  useEffect(() => {
    if (!manual && ready && loadedRef.current) {
      changeCurrent(1);
    }
  }, [changeCurrent, conditions, manual, ready]);

  const onChange = useCallback<
    NonNullable<UsePaginatedSearchResult<ValueType, ResExtra>['onChange']>
  >(
    (tablePagination, _filters, sorter) => {
      const { current, pageSize } = tablePagination as TablePaginationConfig;
      const nextTableParams: TableParams = {
        pageNum: current ?? 1,
        pageSize: pageSize ?? tableFilterRef.current.pageSize,
      };

      if (!Array.isArray(sorter)) {
        const nextSorter = sorter as SorterResult<ValueType>;
        if (nextSorter.order) {
          nextTableParams.orderBy = String(
            nextSorter.columnKey ?? nextSorter.field ?? ''
          );
          nextTableParams.direction =
            nextSorter.order === 'ascend' ? 'ASC' : 'DESC';
        }
      }

      tableFilterRef.current = nextTableParams;
      setTableFilter(nextTableParams);

      if (manual && !data) {
        return;
      }

      void run(nextTableParams).catch(() => undefined);
    },
    [data, manual, run]
  );

  const mutate = useCallback<
    UsePaginatedSearchResult<ValueType, ResExtra>['mutate']
  >((actuator) => {
    setData((current) => {
      if (!current?.records) {
        return current;
      }

      const nextRecords = actuator?.(current.records);
      return {
        ...current,
        records: [...(nextRecords ?? current.records)],
      };
    });
  }, []);

  return {
    data,
    error,
    loading,
    run,
    refresh,
    mutate,
    changeCurrent,
    onChange,
    paginationProps: {
      total: data?.totalCount,
      current: tableFilter.pageNum,
      pageSize: tableFilter.pageSize,
      onChange: changeCurrent,
    },
    renderPagination: () => {
      if (pagination === false) {
        return null;
      }

      return (
        <div
          style={{
            margin: '16px 0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            showQuickJumper
            showSizeChanger
            {...pagination}
            total={data?.totalCount}
            current={tableFilter.pageNum}
            pageSize={tableFilter.pageSize}
            onChange={changeCurrent}
          />
        </div>
      );
    },
  };
}

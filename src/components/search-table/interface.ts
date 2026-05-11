import type { TablePaginationConfig } from 'antd';
import type { ReactElement } from 'react';

import type { ProTableProps } from '../pro-table';

export type ObjectType = Record<string, any>;

export interface TableParams {
  /** 当前页码，从 1 开始。 */
  pageNum: number;
  /** 每页条数。 */
  pageSize: number;
  /** 当前排序字段。 */
  orderBy?: string;
  /** 当前排序方向。 */
  direction?: 'ASC' | 'DESC';
}

export interface SearchTableRequestParams<Condition> extends TableParams {
  /** 当前查询条件。 */
  param: Condition;
}

export interface SearchTableRes<ValueType, Extra = unknown> {
  /** 当前页数据。 */
  records: ValueType[];
  /** 总条数。 */
  totalCount: number;
  /** 额外返回信息，按需透出给页面。 */
  extra?: Extra;
}

export interface SearchTableProps<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
> extends ProTableProps<ValueType> {
  /** 列表请求方法，入参会自动拼上分页和排序参数。 */
  requestMethod: (
    params: SearchTableRequestParams<Condition>
  ) => Promise<SearchTableRes<ValueType, ResExtra>>;
  /** 当前查询条件；变化后会参与下一次请求。 */
  conditions: Condition;
  /** 为 true 时不自动请求，需手动调用 run / refresh。 */
  manual?: boolean;
  /** 为 false 时禁止请求，常用于等待外部依赖准备完成。 */
  ready?: boolean;
  /** 是否默认用 Card 包一层表格；传 false 时只渲染表格本体。 */
  layout?: 'card' | false;
  /** 请求失败回调，不接管页面错误展示，只透出错误和当次请求参数。 */
  onError?: (
    error: unknown,
    params: SearchTableRequestParams<Condition>
  ) => void;
}

export type PaginatedSearchProps<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
> = Pick<
  SearchTableProps<ValueType, Condition, ResExtra>,
  'requestMethod' | 'conditions' | 'manual' | 'ready' | 'pagination' | 'onError'
>;

export interface UsePaginatedSearchResult<
  ValueType extends ObjectType,
  ResExtra = unknown,
> {
  /** 最近一次成功请求返回的数据。 */
  data?: SearchTableRes<ValueType, ResExtra>;
  /** 最近一次请求失败时的错误对象。 */
  error?: unknown;
  loading: boolean;
  /** 主动发起请求，可覆写部分分页/排序参数。 */
  run: (
    tableParams?: Partial<TableParams>
  ) => Promise<SearchTableRes<ValueType, ResExtra>>;
  /** 使用最近一次参数重新请求。 */
  refresh: () => Promise<SearchTableRes<ValueType, ResExtra>>;
  /** 在本地直接修改当前 records，适合做轻量乐观更新。 */
  mutate: (
    actuator?: (
      records: SearchTableRes<ValueType, ResExtra>['records']
    ) => SearchTableRes<ValueType, ResExtra>['records'] | void
  ) => void;
  /** 切换页码；通常不需要直接调，保留给外部特殊场景。 */
  changeCurrent: (pageNum: number, pageSize?: number) => void;
  /** 透传给 ProTable 的 onChange，会自动处理分页和排序。 */
  onChange: NonNullable<ProTableProps<ValueType>['onChange']>;
  /** 已封装好的分页配置，可直接透传给表格。 */
  paginationProps: TablePaginationConfig;
  /** 独立渲染分页器，通常给非表格布局场景使用。 */
  renderPagination: () => ReactElement | null;
}

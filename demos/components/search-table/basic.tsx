import { Input, Select, Space } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import SearchFormV2 from '@components/search-form-v2';
import SearchTable from '@components/search-table';
import type { SearchTableRequestParams, SearchTableRes } from '@components/search-table';

interface SearchRow {
  id: number;
  name: string;
  category: string;
  owner: string;
  status: 'draft' | 'running' | 'done';
  amount: number;
}

interface SearchConditions {
  keyword?: string;
  status?: SearchRow['status'];
}

const rows: SearchRow[] = [
  { id: 1, name: '供应商准入审批', category: '供应商', owner: '林峰', status: 'running', amount: 182000 },
  { id: 2, name: '采购框架询价', category: '采购', owner: '周宁', status: 'draft', amount: 64000 },
  { id: 3, name: '履约节点校验', category: '履约', owner: '陈默', status: 'done', amount: 98000 },
  { id: 4, name: '付款计划核对', category: '财务', owner: '叶青', status: 'running', amount: 73000 },
];

export default function Demo() {
  const [conditions, setConditions] = useState<SearchConditions>({});

  const columns = useMemo(
    () => [
      { title: '标题', dataIndex: 'name' },
      { title: '分类', dataIndex: 'category', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 120 },
      { title: '金额', dataIndex: 'amount', width: 120, sorter: true },
    ],
    [],
  );

  const requestMethod = useCallback(
    async (
      params: SearchTableRequestParams<SearchConditions>,
    ): Promise<SearchTableRes<SearchRow>> => {
      const { pageNum, pageSize, param } = params;
      const filtered = rows.filter((item) => {
        return (
          (!param.keyword || item.name.includes(param.keyword)) &&
          (!param.status || item.status === param.status)
        );
      });

      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;

      return {
        records: filtered.slice(start, end),
        totalCount: filtered.length,
      };
    },
    [],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SearchFormV2
        onSearch={(value) => setConditions(value as SearchConditions)}
        onReset={(value) => setConditions(value as SearchConditions)}
        labelWidth={88}
        items={[
          {
            label: '关键字',
            name: 'keyword',
            value: <Input allowClear placeholder="搜标题关键字" />,
          },
          {
            label: '状态',
            name: 'status',
            value: (
              <Select
                allowClear
                placeholder="全部状态"
                options={[
                  { label: '草稿', value: 'draft' },
                  { label: '进行中', value: 'running' },
                  { label: '已完成', value: 'done' },
                ]}
              />
            ),
          },
        ]}
      />

      <SearchTable
        uniqueKey="docs-search-table-basic"
        rowKey="id"
        requestMethod={requestMethod}
        conditions={conditions}
        columns={columns as any}
        pagination={{ defaultCurrent: 1, defaultPageSize: 2 }}
        caption={{ setting: true }}
      />
    </Space>
  );
}

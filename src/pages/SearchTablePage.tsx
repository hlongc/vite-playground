import { Card, Input, Select, Space, Tag, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";

import DemoBlock from "../components/demo-block";
import SearchFormV2 from "../components/search-form-v2";
import SearchTable from "../components/search-table";
import type {
  SearchTableProps,
  SearchTableRequestParams,
  SearchTableRes,
} from "../components/search-table";
import ResultCard from "./ResultCard";
import styles from "./Page.module.less";

const { Paragraph } = Typography;
const searchTableDemoCode = `const [conditions, setConditions] = useState({});

<SearchFormV2
  onSearch={(value) => setConditions(value)}
  onReset={(value) => setConditions(value)}
  items={[
    { label: '关键字', name: 'keyword', value: <Input allowClear placeholder="搜标题关键字" /> },
    { label: '状态', name: 'status', value: <Select allowClear placeholder="全部状态" /> },
  ]}
/>

<SearchTable
  uniqueKey="playground-search-table"
  rowKey="id"
  requestMethod={requestMethod}
  conditions={conditions}
  columns={columns}
  pagination={{ defaultCurrent: 1, defaultPageSize: 5 }}
  caption={{ setting: true }}
/>`;

interface SearchRow {
  id: number;
  name: string;
  category: string;
  owner: string;
  status: "draft" | "running" | "done";
  amount: number;
  updatedAt: string;
}

interface SearchConditions {
  keyword?: string;
  status?: SearchRow["status"];
  owner?: string;
  category?: string;
}

const mockRows: SearchRow[] = [
  {
    id: 1,
    name: "供应商准入审批",
    category: "供应商",
    owner: "林峰",
    status: "running",
    amount: 182000,
    updatedAt: "2026-05-01 09:12",
  },
  {
    id: 2,
    name: "采购框架询价",
    category: "采购",
    owner: "周宁",
    status: "draft",
    amount: 64000,
    updatedAt: "2026-05-01 16:20",
  },
  {
    id: 3,
    name: "履约节点校验",
    category: "履约",
    owner: "陈默",
    status: "done",
    amount: 98000,
    updatedAt: "2026-05-02 10:33",
  },
  {
    id: 4,
    name: "付款计划核对",
    category: "财务",
    owner: "叶青",
    status: "running",
    amount: 73000,
    updatedAt: "2026-05-02 17:08",
  },
  {
    id: 5,
    name: "季度供应商盘点",
    category: "供应商",
    owner: "宋然",
    status: "draft",
    amount: 55000,
    updatedAt: "2026-05-03 11:41",
  },
  {
    id: 6,
    name: "项目比价结果复核",
    category: "采购",
    owner: "林峰",
    status: "done",
    amount: 138000,
    updatedAt: "2026-05-03 15:55",
  },
  {
    id: 7,
    name: "合同条款抽检",
    category: "法务",
    owner: "陈默",
    status: "running",
    amount: 41000,
    updatedAt: "2026-05-04 08:26",
  },
  {
    id: 8,
    name: "履约质量评分",
    category: "履约",
    owner: "周宁",
    status: "draft",
    amount: 92000,
    updatedAt: "2026-05-04 14:02",
  },
  {
    id: 9,
    name: "采购策略回顾",
    category: "采购",
    owner: "叶青",
    status: "running",
    amount: 126000,
    updatedAt: "2026-05-05 09:57",
  },
  {
    id: 10,
    name: "供应商红黄牌复盘",
    category: "供应商",
    owner: "林峰",
    status: "done",
    amount: 30000,
    updatedAt: "2026-05-05 19:40",
  },
  {
    id: 11,
    name: "预算锁定确认",
    category: "财务",
    owner: "宋然",
    status: "running",
    amount: 159000,
    updatedAt: "2026-05-06 13:14",
  },
  {
    id: 12,
    name: "法务风险提示单",
    category: "法务",
    owner: "周宁",
    status: "draft",
    amount: 48000,
    updatedAt: "2026-05-07 10:06",
  },
];

function includesText(source: string, keyword?: string) {
  if (!keyword) {
    return true;
  }

  return source.toLowerCase().includes(keyword.trim().toLowerCase());
}

export default function SearchTablePage() {
  const [conditions, setConditions] = useState<SearchConditions>({});

  const columns = useMemo<
    NonNullable<SearchTableProps<SearchRow, SearchConditions>["columns"]>
  >(
    () => [
      {
        title: "标题",
        dataIndex: "name",
      },
      {
        title: "分类",
        dataIndex: "category",
        width: 120,
        setting: {
          defaultSortIndex: 0,
        },
      },
      {
        title: "负责人",
        dataIndex: "owner",
        width: 120,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 120,
        render: (value) =>
          ({
            draft: "草稿",
            running: "进行中",
            done: "已完成",
          })[value as SearchRow["status"]],
      },
      {
        title: "金额",
        dataIndex: "amount",
        width: 120,
        sorter: true,
        render: (value) => `¥ ${Number(value).toLocaleString("zh-CN")}`,
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        width: 160,
      },
    ],
    [],
  );

  const requestMethod = useCallback(
    async (
      params: SearchTableRequestParams<SearchConditions>,
    ): Promise<SearchTableRes<SearchRow>> => {
      const { pageNum, pageSize, orderBy, direction, param } = params;

      let filtered = mockRows.filter((item) => {
        return (
          includesText(item.name, param.keyword) &&
          (!param.status || item.status === param.status) &&
          (!param.owner || item.owner === param.owner) &&
          (!param.category || item.category === param.category)
        );
      });

      if (orderBy === "amount") {
        filtered = [...filtered].sort((left, right) => {
          return direction === "DESC"
            ? right.amount - left.amount
            : left.amount - right.amount;
        });
      }

      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;

      await new Promise((resolve) => {
        window.setTimeout(resolve, 320);
      });

      return {
        records: filtered.slice(start, end),
        totalCount: filtered.length,
      };
    },
    [],
  );

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页串起 <code>SearchFormV2</code> 和迁移后的{" "}
            <code>SearchTable</code>。
            你可以直接验证条件查询、分页、排序和列设置是否能在新项目里一起工作。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">requestMethod</Tag>
            <Tag color="cyan">pagination</Tag>
            <Tag color="purple">sorter</Tag>
            <Tag color="magenta">conditions</Tag>
          </Space>
        </Space>
      </Card>

      <DemoBlock
        title="查询表格联动"
        description="这是 SearchFormV2 和 SearchTable 的典型联动写法：表单负责更新 conditions，SearchTable 负责请求、分页和排序。"
        code={searchTableDemoCode}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <SearchFormV2
            onSearch={(value) => setConditions(value as SearchConditions)}
            onReset={(value) => setConditions(value as SearchConditions)}
            labelWidth={88}
            items={[
              {
                label: "关键字",
                name: "keyword",
                value: <Input allowClear placeholder="搜标题关键字" />,
              },
              {
                label: "状态",
                name: "status",
                value: (
                  <Select
                    allowClear
                    placeholder="全部状态"
                    options={[
                      { label: "草稿", value: "draft" },
                      { label: "进行中", value: "running" },
                      { label: "已完成", value: "done" },
                    ]}
                  />
                ),
              },
              {
                label: "负责人",
                name: "owner",
                value: (
                  <Select
                    allowClear
                    placeholder="全部负责人"
                    options={[
                      { label: "林峰", value: "林峰" },
                      { label: "周宁", value: "周宁" },
                      { label: "陈默", value: "陈默" },
                      { label: "叶青", value: "叶青" },
                      { label: "宋然", value: "宋然" },
                    ]}
                  />
                ),
              },
              {
                label: "分类",
                name: "category",
                value: (
                  <Select
                    allowClear
                    placeholder="全部分类"
                    options={[
                      { label: "采购", value: "采购" },
                      { label: "供应商", value: "供应商" },
                      { label: "履约", value: "履约" },
                      { label: "财务", value: "财务" },
                      { label: "法务", value: "法务" },
                    ]}
                  />
                ),
              },
            ]}
          />

          <SearchTable<SearchRow, SearchConditions>
            uniqueKey="playground-search-table"
            rowKey="id"
            requestMethod={requestMethod}
            conditions={conditions}
            columns={columns}
            pagination={{
              defaultCurrent: 1,
              defaultPageSize: 5,
            }}
            caption={{
              setting: true,
              actions: [],
            }}
          />
        </Space>
      </DemoBlock>

      <ResultCard title="最近一次搜索条件" value={conditions} />
    </div>
  );
}

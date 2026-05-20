import { Card, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import DemoBlock from '../components/demo-block';
import ProTable from '../components/pro-table';
import type { ProTableProps } from '../components/pro-table';
import ResultCard from './ResultCard';
import styles from './Page.module.less';

const { Paragraph } = Typography;
const groupedTableCode = `const columns = [
  {
    title: '基础信息',
    children: [
      { title: '单据编号', dataIndex: 'code', width: 140 },
      { title: '标题', dataIndex: 'title', width: 220, setting: { defaultSortIndex: 0 } },
    ],
  },
  {
    title: '业务信息',
    children: [
      { title: '负责人', dataIndex: 'owner', width: 120 },
      { title: '归属部门', dataIndex: 'department', width: 160 },
      { title: '金额', dataIndex: 'amount', width: 140, align: 'right' },
    ],
  },
];

<ProTable
  uniqueKey="playground-grouped-pro-table"
  rowKey="id"
  serial={{ title: '序号', width: 72 }}
  scroll={{ x: 1180 }}
  columns={columns}
  dataSource={groupedRows}
  caption={{ setting: true }}
/>`;

interface GroupedRow {
  id: number;
  code: string;
  title: string;
  owner: string;
  department: string;
  amount: number;
  status: 'draft' | 'running' | 'done';
  updatedAt: string;
}

const groupedRows: GroupedRow[] = [
  {
    id: 1,
    code: 'GRP-001',
    title: '框架采购评审',
    owner: '林峰',
    department: '采购中心',
    amount: 128000,
    status: 'running',
    updatedAt: '2026-05-08 10:20',
  },
  {
    id: 2,
    code: 'GRP-002',
    title: '供应商质量抽检',
    owner: '陈默',
    department: '风控合规',
    amount: 86000,
    status: 'draft',
    updatedAt: '2026-05-08 15:32',
  },
  {
    id: 3,
    code: 'GRP-003',
    title: '履约节点复盘',
    owner: '周宁',
    department: '交付管理',
    amount: 234000,
    status: 'done',
    updatedAt: '2026-05-09 09:46',
  },
];

function getStatusText(status: GroupedRow['status']) {
  return {
    draft: '草稿',
    running: '进行中',
    done: '已完成',
  }[status];
}

export default function GroupedProTablePage() {
  const columns = useMemo<
    NonNullable<ProTableProps<GroupedRow>['columns']>
  >(
    () => [
      {
        title: '基础信息',
        children: [
          {
            title: '单据编号',
            dataIndex: 'code',
            width: 140,
          },
          {
            title: '标题',
            dataIndex: 'title',
            width: 220,
            setting: {
              defaultSortIndex: 0,
            },
          },
        ],
      },
      {
        title: '业务信息',
        children: [
          {
            title: '负责人',
            dataIndex: 'owner',
            width: 120,
          },
          {
            title: '归属部门',
            dataIndex: 'department',
            width: 160,
          },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 140,
            align: 'right',
            render: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
          },
        ],
      },
      {
        title: '状态信息',
        children: [
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (value) => getStatusText(value),
          },
          {
            title: '最近更新',
            dataIndex: 'updatedAt',
            width: 160,
          },
        ],
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页专门验证 <code>ProTable</code> 的“分组表头 + 列设置”策略。
            当前规则是：setting 面板只展示叶子列，父分组列只是容器；拖拽排序只允许发生在同一组叶子列内，不会破坏表头结构。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">group columns</Tag>
            <Tag color="cyan">leaf-only setting</Tag>
            <Tag color="purple">stable header structure</Tag>
          </Space>
        </Space>
      </Card>

      <DemoBlock
        title="分组表头列设置验证"
        description="setting 面板只处理叶子列，父分组列只作为结构容器；拖拽排序也只在同组叶子列内进行。"
        code={groupedTableCode}
      >
        <ProTable<GroupedRow>
          uniqueKey="playground-grouped-pro-table"
          rowKey="id"
          serial={{ title: '序号', width: 72 }}
          scroll={{ x: 1180 }}
          columns={columns}
          dataSource={groupedRows}
          caption={{
            setting: true,
          }}
        />
      </DemoBlock>

      <ResultCard
        title="当前分组列策略说明"
        value={{
          rule: 'setting 面板只处理叶子列',
          groupedHeaders: ['基础信息', '业务信息', '状态信息'],
          leafColumns: ['单据编号', '标题', '负责人', '归属部门', '金额', '状态', '最近更新'],
          reorderConstraint: '只允许同组叶子列之间拖拽排序',
        }}
      />
    </div>
  );
}

import { Card, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import ProTable from '../components/pro-table';
import type { ProTableProps } from '../components/pro-table';
import ResultCard from './ResultCard';
import styles from './Page.module.less';

const { Paragraph } = Typography;

interface NestedGroupedRow {
  id: number;
  code: string;
  title: string;
  contractType: string;
  amount: number;
  taxAmount: number;
  owner: string;
  department: string;
  approver: string;
  status: 'draft' | 'running' | 'done';
  updatedAt: string;
}

const rows: NestedGroupedRow[] = [
  {
    id: 1,
    code: 'NEST-001',
    title: '年度框架采购',
    contractType: '框架协议',
    amount: 520000,
    taxAmount: 31200,
    owner: '林峰',
    department: '采购中心',
    approver: '陈默',
    status: 'running',
    updatedAt: '2026-05-09 10:08',
  },
  {
    id: 2,
    code: 'NEST-002',
    title: '供应商复核项目',
    contractType: '服务合同',
    amount: 186000,
    taxAmount: 11160,
    owner: '周宁',
    department: '风控合规',
    approver: '叶青',
    status: 'draft',
    updatedAt: '2026-05-09 14:36',
  },
];

function getStatusText(status: NestedGroupedRow['status']) {
  return {
    draft: '草稿',
    running: '进行中',
    done: '已完成',
  }[status];
}

export default function NestedGroupedProTablePage() {
  const columns = useMemo<
    NonNullable<ProTableProps<NestedGroupedRow>['columns']>
  >(
    () => [
      {
        title: '基础信息',
        children: [
          {
            title: '单据',
            children: [
              {
                title: '单据编号',
                dataIndex: 'code',
                width: 140,
              },
              {
                title: '标题',
                dataIndex: 'title',
                width: 200,
                setting: {
                  defaultSortIndex: 0,
                },
              },
            ],
          },
          {
            title: '合同',
            children: [
              {
                title: '合同类型',
                dataIndex: 'contractType',
                width: 140,
              },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 140,
                align: 'right',
                render: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
              },
              {
                title: '税额',
                dataIndex: 'taxAmount',
                width: 120,
                align: 'right',
                render: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
              },
            ],
          },
        ],
      },
      {
        title: '流程信息',
        children: [
          {
            title: '责任链',
            children: [
              {
                title: '负责人',
                dataIndex: 'owner',
                width: 120,
              },
              {
                title: '归属部门',
                dataIndex: 'department',
                width: 140,
              },
              {
                title: '审批人',
                dataIndex: 'approver',
                width: 120,
              },
            ],
          },
          {
            title: '状态',
            children: [
              {
                title: '当前状态',
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
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页专门验证多级嵌套分组在 setting 面板里的展示。现在的策略是：父级路径用面包屑分组标题承载，叶子列自己只显示字段名，避免每一项都重复长路径。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">nested groups</Tag>
            <Tag color="cyan">breadcrumb panel</Tag>
            <Tag color="purple">leaf-only labels</Tag>
          </Space>
        </Space>
      </Card>

      <Card className={styles.gridCard} title="多级分组列设置验证">
        <ProTable<NestedGroupedRow>
          uniqueKey="playground-nested-grouped-pro-table"
          rowKey="id"
          serial={{ title: '序号', width: 72 }}
          scroll={{ x: 1540 }}
          columns={columns}
          dataSource={rows}
          caption={{
            setting: true,
          }}
        />
      </Card>

      <ResultCard
        title="多级面包屑分组说明"
        value={{
          rule: '父级路径只出现在分组标题，叶子项不重复显示路径',
          examplePaths: [
            '基础信息 / 单据',
            '基础信息 / 合同',
            '流程信息 / 责任链',
            '流程信息 / 状态',
          ],
          leafExamples: ['单据编号', '标题', '金额', '审批人', '当前状态'],
        }}
      />
    </div>
  );
}

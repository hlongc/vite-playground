import { Card, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import ProTable from '../components/pro-table';
import type { ProTableProps } from '../components/pro-table';
import styles from './Page.module.less';

const { Paragraph } = Typography;

interface ResizableRow {
  id: number;
  code: string;
  title: string;
  owner: string;
  department: string;
  amount: number;
  updatedAt: string;
}

const rows: ResizableRow[] = [
  {
    id: 1,
    code: 'RSZ-001',
    title: '采购需求确认',
    owner: '林峰',
    department: '采购中心',
    amount: 180000,
    updatedAt: '2026-05-09 10:20',
  },
  {
    id: 2,
    code: 'RSZ-002',
    title: '供应商入围评审',
    owner: '周宁',
    department: '风控合规',
    amount: 86000,
    updatedAt: '2026-05-09 15:44',
  },
];

export default function ResizableColumnsPage() {
  const baseColumns = useMemo<
    NonNullable<ProTableProps<ResizableRow>['columns']>
  >(
    () => [
      {
        title: '单据编号',
        dataIndex: 'code',
        width: 140,
      },
      {
        title: '标题',
        dataIndex: 'title',
        width: 220,
      },
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
      {
        title: '最近更新',
        dataIndex: 'updatedAt',
        width: 160,
      },
    ],
    []
  );

  const partialLockedColumns = useMemo<
    NonNullable<ProTableProps<ResizableRow>['columns']>
  >(
    () => [
      {
        title: '单据编号',
        dataIndex: 'code',
        width: 140,
      },
      {
        title: '标题',
        dataIndex: 'title',
        width: 220,
        resizable: false,
      },
      {
        title: '负责人',
        dataIndex: 'owner',
        width: 120,
      },
      {
        title: '归属部门',
        dataIndex: 'department',
        width: 160,
        resizable: false,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 140,
        align: 'right',
        render: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
      },
      {
        title: '最近更新',
        dataIndex: 'updatedAt',
        width: 160,
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页专门验证列宽拖拽配置。上半部分演示整表关闭拖宽；下半部分演示整表开启拖宽，但个别列通过 <code>resizable: false</code> 单独禁用。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">columnResizable</Tag>
            <Tag color="cyan">resizable: false</Tag>
            <Tag color="purple">width persistence</Tag>
          </Space>
        </Space>
      </Card>

      <Card className={styles.gridCard} title="整表关闭拖宽">
        <ProTable<ResizableRow>
          uniqueKey="playground-resizable-disabled"
          rowKey="id"
          columnResizable={false}
          scroll={{ x: 1080 }}
          columns={baseColumns}
          dataSource={rows}
          caption={{
            setting: true,
          }}
        />
      </Card>

      <Card className={styles.gridCard} title="局部列禁用拖宽">
        <ProTable<ResizableRow>
          uniqueKey="playground-resizable-partial-locked"
          rowKey="id"
          columnResizable
          scroll={{ x: 1080 }}
          columns={partialLockedColumns}
          dataSource={rows}
          caption={{
            setting: true,
          }}
        />
      </Card>
    </div>
  );
}

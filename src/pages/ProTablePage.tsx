import { Button, Card, Space, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import type { Key } from 'react';

import ProTable from '../components/pro-table';
import type { ProTableProps } from '../components/pro-table';
import ResultCard from './ResultCard';
import styles from './Page.module.less';

const { Paragraph } = Typography;

interface ProductRow {
  id: number;
  code: string;
  name: string;
  department: string;
  owner: string;
  amount: number;
  status: 'draft' | 'running' | 'done';
  updatedAt: string;
}

interface MutationDebugState {
  targetId: number;
  hitByReference: boolean;
  previousAmount: number;
  nextAmount: number;
}

const initialRows: ProductRow[] = [
  {
    id: 1,
    code: 'PO-2026-001',
    name: '北区采购框架协议',
    department: '采购中心',
    owner: '林峰',
    amount: 128000,
    status: 'running',
    updatedAt: '2026-05-06 10:12',
  },
  {
    id: 2,
    code: 'PO-2026-002',
    name: '供应商入围复核',
    department: '风控合规',
    owner: '陈默',
    amount: 86000,
    status: 'draft',
    updatedAt: '2026-05-07 14:28',
  },
  {
    id: 3,
    code: 'PO-2026-003',
    name: '履约质量周报',
    department: '交付管理',
    owner: '宋然',
    amount: 42000,
    status: 'done',
    updatedAt: '2026-05-08 09:03',
  },
  {
    id: 4,
    code: 'PO-2026-004',
    name: '重点项目询比价',
    department: '采购中心',
    owner: '周宁',
    amount: 231000,
    status: 'running',
    updatedAt: '2026-05-08 17:46',
  },
  {
    id: 5,
    code: 'PO-2026-005',
    name: '供应商季度复盘',
    department: '供应商管理',
    owner: '叶青',
    amount: 67000,
    status: 'draft',
    updatedAt: '2026-05-09 11:20',
  },
];

function getStatusText(status: ProductRow['status']) {
  return {
    draft: '草稿',
    running: '进行中',
    done: '已完成',
  }[status];
}

function getStatusColor(status: ProductRow['status']) {
  return {
    draft: 'default',
    running: 'processing',
    done: 'success',
  }[status] as 'default' | 'processing' | 'success';
}

export default function ProTablePage() {
  const [rows, setRows] = useState<ProductRow[]>(initialRows);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [mutationDebug, setMutationDebug] = useState<MutationDebugState | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const columns = useMemo<NonNullable<ProTableProps<ProductRow>['columns']>>(
    () => [
      {
        title: '单据编号',
        dataIndex: 'code',
        width: 140,
        fixed: 'left',
      },
      {
        title: '标题',
        dataIndex: 'name',
        width: 220,
      },
      {
        title: '归属部门',
        dataIndex: 'department',
        width: 140,
        setting: {
          defaultSortIndex: 0,
        },
      },
      {
        title: '负责人',
        dataIndex: 'owner',
        width: 120,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        align: 'right',
        width: 140,
        render: (value) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
        summary: (data) => {
          const total = (data ?? []).reduce((sum, item) => sum + item.amount, 0);
          return `¥ ${total.toLocaleString('zh-CN')}`;
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (value) => <Tag color={getStatusColor(value)}>{getStatusText(value)}</Tag>,
        setting: {
          defaultHide: false,
        },
      },
      {
        title: '引用验证',
        key: 'debug-action',
        width: 180,
        render: (_, record) => (
          <Button
            size="small"
            onClick={() => {
              const nextAmount = record.amount + 1000;

              setRows((current) => {
                const hitByReference = current.some((item) => item === record);

                setMutationDebug({
                  targetId: record.id,
                  hitByReference,
                  previousAmount: record.amount,
                  nextAmount,
                });

                if (!hitByReference) {
                  messageApi.error('当前 record 不是原始对象引用，引用更新失败');
                  return current;
                }

                messageApi.success(`命中原始引用，已把 ${record.code} 金额 +1000`);
                return current.map((item) =>
                  item === record
                    ? {
                        ...item,
                        amount: nextAmount,
                      }
                    : item
                );
              });
            }}
          >
            引用更新 +1000
          </Button>
        ),
      },
      {
        title: '最近更新',
        dataIndex: 'updatedAt',
        width: 160,
        fixed: 'right',
      },
    ],
    [messageApi]
  );

  return (
    <div className={styles.page}>
      {contextHolder}
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页直接验证迁移后的 <code>ProTable</code>，重点包括序号列、空值兜底、
            caption、rowSelection、summary，以及列设置的显隐和拖拽排序。
            其中“引用验证”列会直接用 render 里拿到的 <code>record</code> 做
            <code>===</code> 命中更新。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">column setting</Tag>
            <Tag color="cyan">indexedDB</Tag>
            <Tag color="gold">rowSelection</Tag>
            <Tag color="green">summary</Tag>
            <Tag color="volcano">record reference</Tag>
          </Space>
        </Space>
      </Card>

      <Card className={styles.gridCard} title="ProTable 迁移验证">
        <ProTable<ProductRow>
          uniqueKey="playground-pro-table"
          rowKey="id"
          serial={{ title: '序号', width: 72 }}
          scroll={{ x: 1120 }}
          columns={columns}
          dataSource={rows}
          caption={{
            setting: true,
            actions: [
              <Button
                key="restore"
                onClick={() => {
                  setRows(initialRows);
                  messageApi.success('已恢复默认数据');
                }}
              >
                恢复数据
              </Button>,
            ],
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            actions: [
              <Button
                key="batch"
                type="primary"
                disabled={selectedRowKeys.length === 0}
                onClick={() =>
                  messageApi.success(`模拟批量操作 ${selectedRowKeys.length} 条数据`)
                }
              >
                批量处理
              </Button>,
            ],
          }}
          summary={(data) => {
            const total = (data ?? []).reduce((sum, item) => sum + item.amount, 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  当前可见数据 {data?.length ?? 0} 条
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  合计金额
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  ¥ {total.toLocaleString('zh-CN')}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} colSpan={2} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <ResultCard
        title="当前选中行"
        value={{
          selectedRowKeys,
          selectedRows: rows.filter((item) => selectedRowKeys.includes(item.id)),
        }}
      />

      <ResultCard
        title="render(record) 引用验证"
        value={{
          mutationDebug,
          latestRows: rows.map((item) => ({
            id: item.id,
            code: item.code,
            amount: item.amount,
          })),
        }}
      />
    </div>
  );
}

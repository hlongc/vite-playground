import { Button } from 'antd';

import ProTable from '@components/pro-table';

const columns = [
  {
    title: '单据编号',
    dataIndex: 'code',
    width: 140,
  },
  {
    title: '标题',
    dataIndex: 'name',
    width: 220,
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    width: 120,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right' as const,
    render: (value: number) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
  },
] as const;

const rows = [
  { id: 1, code: 'PO-001', name: '采购框架协议', owner: '林峰', amount: 128000 },
  { id: 2, code: 'PO-002', name: '供应商入围复核', owner: '陈默', amount: 86000 },
] as const;

export default function Demo() {
  return (
    <ProTable
      uniqueKey="docs-pro-table-basic"
      rowKey="id"
      serial={{ title: '序号', width: 72 }}
      columns={columns as any}
      dataSource={rows as any}
      caption={{
        setting: true,
        actions: [<Button key="add">新增</Button>],
      }}
    />
  );
}

import ProTable from '@components/pro-table';

const columns = [
  { title: '单据编号', dataIndex: 'code', width: 140 },
  { title: '标题', dataIndex: 'title', width: 220, resizable: false },
  { title: '负责人', dataIndex: 'owner', width: 120 },
  { title: '归属部门', dataIndex: 'department', width: 160 },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right' as const,
    render: (value: number) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
  },
] as const;

const rows = [
  { id: 1, code: 'RSZ-001', title: '采购需求确认', owner: '林峰', department: '采购中心', amount: 180000 },
  { id: 2, code: 'RSZ-002', title: '供应商入围评审', owner: '周宁', department: '风控合规', amount: 86000 },
] as const;

export default function Demo() {
  return (
    <ProTable
      uniqueKey="docs-pro-table-resizable"
      rowKey="id"
      columnResizable
      scroll={{ x: 980 }}
      columns={columns as any}
      dataSource={rows as any}
      caption={{ setting: true }}
    />
  );
}

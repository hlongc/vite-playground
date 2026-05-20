import ProTable from '@components/pro-table';

const columns = [
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
      {
        title: '金额',
        dataIndex: 'amount',
        width: 140,
        align: 'right' as const,
        render: (value: number) => `¥ ${Number(value).toLocaleString('zh-CN')}`,
      },
    ],
  },
] as const;

const rows = [
  { id: 1, code: 'GRP-001', title: '框架采购评审', owner: '林峰', department: '采购中心', amount: 128000 },
  { id: 2, code: 'GRP-002', title: '供应商质量抽检', owner: '陈默', department: '风控合规', amount: 86000 },
] as const;

export default function Demo() {
  return (
    <ProTable
      uniqueKey="docs-pro-table-grouped"
      rowKey="id"
      serial={{ title: '序号', width: 72 }}
      scroll={{ x: 980 }}
      columns={columns as any}
      dataSource={rows as any}
      caption={{ setting: true }}
    />
  );
}

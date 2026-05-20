import { Button, Popconfirm } from 'antd';

import OperationGroup from '@components/operation-group';

const authList = ['view', 'edit', 'delete', 'copy'];

const items = [
  {
    key: 'view',
    authKey: 'view',
    render: <Button type="link">查看</Button>,
  },
  {
    key: 'edit',
    authKey: 'edit',
    render: <Button type="link">编辑</Button>,
  },
  {
    key: 'delete',
    authKey: 'delete',
    render: (
      <Popconfirm title="确认删除当前记录？">
        <Button danger type="link">
          删除
        </Button>
      </Popconfirm>
    ),
  },
  {
    key: 'copy',
    authKey: 'copy',
    render: <Button type="link">复制</Button>,
  },
] as const;

export default function Demo() {
  return <OperationGroup items={items as any} max={3} authList={authList} />;
}

import { Button } from 'antd';

import OperationGroup from '@components/operation-group';

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
    key: 'archive',
    authKey: 'archive',
    render: <Button type="link">归档</Button>,
  },
  {
    key: 'copy',
    authKey: 'copy',
    render: <Button type="link">复制</Button>,
  },
] as const;

export default function Demo() {
  return (
    <OperationGroup
      items={items as any}
      max={3}
      authList={['view', 'edit', 'copy']}
    />
  );
}

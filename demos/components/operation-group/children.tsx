import { Button } from 'antd';

import OperationGroup from '@components/operation-group';

export default function Demo() {
  return (
    <OperationGroup max={3}>
      <Button type="link">查看</Button>
      <Button type="link">编辑</Button>
      <Button danger type="link">
        删除
      </Button>
      <Button type="link">复制</Button>
    </OperationGroup>
  );
}

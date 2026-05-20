import { Button, Card, Typography, message } from 'antd';
import { useState } from 'react';
import type { ReactNode } from 'react';

import styles from './DemoBlock.module.less';

const { Title, Paragraph } = Typography;

interface DemoBlockProps {
  title: ReactNode;
  description?: ReactNode;
  code: string;
  children: ReactNode;
  extra?: ReactNode;
  defaultExpanded?: boolean;
}

export default function DemoBlock({
  title,
  description,
  code,
  children,
  extra,
  defaultExpanded = false,
}: DemoBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [messageApi, contextHolder] = message.useMessage();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      messageApi.success('代码已复制');
    } catch (_error) {
      messageApi.error('复制失败，请手动复制');
    }
  };

  return (
    <Card className={styles.block} bodyStyle={{ padding: 0 }}>
      {contextHolder}
      <div className={styles.preview}>{children}</div>
      <div className={styles.meta}>
        <div className={styles.titleRow}>
          <Title level={5} className={styles.title}>
            {title}
          </Title>
          {extra}
        </div>
        {description ? (
          <Paragraph className={styles.description}>{description}</Paragraph>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Button type="text" size="small" onClick={copyCode}>
          复制代码
        </Button>
        <Button type="text" size="small" onClick={() => setExpanded((current) => !current)}>
          {expanded ? '收起代码' : '查看代码'}
        </Button>
      </div>
      {expanded ? (
        <div className={styles.codeWrap}>
          <pre className={styles.code}>
            <code>{code}</code>
          </pre>
        </div>
      ) : null}
    </Card>
  );
}

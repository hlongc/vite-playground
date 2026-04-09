import { Card, Typography } from 'antd';

import styles from './Page.module.less';

const { Text } = Typography;

interface ResultCardProps {
  title: string;
  value: unknown;
}

export default function ResultCard({ title, value }: ResultCardProps) {
  return (
    <Card title={title} className={styles.resultCard}>
      <Text type="secondary">最近一次输出会展示在这里，方便你对照调试。</Text>
      <pre className={styles.pre}>{JSON.stringify(value, null, 2)}</pre>
    </Card>
  );
}

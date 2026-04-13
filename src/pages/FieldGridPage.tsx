import { Card, Form, Input, InputNumber, Select, Space, Typography } from 'antd';

import FieldGridV2 from '../components/field-grid-v2';
import styles from './Page.module.less';

const { Paragraph } = Typography;

export default function FieldGridPage() {
  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Paragraph>
          这页单独验证 `field-grid-v2` 的布局算法，包括 `colSpan`、`colStart`
          和整行占满的能力。这里额外传了 `layoutConfig.maxColumns=3`，
          方便观察“最多 3 列，但窄容器仍然自动降列”的效果。
        </Paragraph>
      </Card>

      <Card title="FieldGrid V2 独立调试" className={styles.gridCard}>
        <Form layout="inline">
          <FieldGridV2
            labelWidth={96}
            layoutConfig={{
              minColumnWidth: 260,
              columnGap: 16,
              rowGap: 16,
              maxColumns: 3,
            }}
            items={[
              {
                label: '名称',
                name: 'name',
                value: <Input placeholder="请输入名称" />,
              },
              {
                label: '分类',
                name: 'category',
                value: (
                  <Select
                    placeholder="请选择分类"
                    options={[
                      { label: 'A 类', value: 'A' },
                      { label: 'B 类', value: 'B' },
                    ]}
                  />
                ),
              },
              {
                label: '数量',
                name: 'count',
                value: <InputNumber style={{ width: '100%' }} min={0} />,
              },
              {
                label: '备注',
                name: 'description',
                colSpan: 'max',
                value: (
                  <Input.TextArea
                    placeholder="这里验证整行占满"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                ),
              },
              {
                label: '自定义渲染',
                key: 'custom-render',
                colSpan: 2,
                render: () => (
                  <Space
                    style={{
                      width: '100%',
                      padding: 16,
                      borderRadius: 12,
                      background: 'rgba(22, 119, 255, 0.08)',
                    }}
                  >
                    自定义 render 区块
                  </Space>
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </div>
  );
}

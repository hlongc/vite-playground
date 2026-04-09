import { Alert, Card, Input, InputNumber, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';

import SearchFormV2 from '../components/search-form-v2';
import styles from './Page.module.less';
import ResultCard from './ResultCard';

const { Paragraph } = Typography;

export default function AutoSearchPage() {
  const [searchValue, setSearchValue] = useState<Record<string, unknown>>({});
  const [count, setCount] = useState(0);

  const countLabel = useMemo(() => `已触发 ${count} 次自动搜索`, [count]);

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页主要验证 `autoSearch`、`searchTrigger="onChange"` 和
            `requiredFields` 的联动。
          </Paragraph>
          <Alert type="info" showIcon message={countLabel} />
        </Space>
      </Card>

      <SearchFormV2
        searchTrigger="onChange"
        autoSearch
        requiredFields={['keyword']}
        cacheRequiredInit={false}
        submitButtonProps={{ style: { display: 'none' } }}
        resetButtonProps={{ style: { display: 'none' } }}
        onSearch={(value) => {
          setCount((current) => current + 1);
          setSearchValue(value as Record<string, unknown>);
        }}
        items={[
          {
            label: '关键字',
            name: 'keyword',
            required: true,
            value: <Input allowClear placeholder="输入后自动触发查询" />,
          },
          {
            label: '分类',
            name: 'category',
            value: (
              <Select
                allowClear
                placeholder="选择分类"
                options={[
                  { label: '合同', value: 'contract' },
                  { label: '商品', value: 'goods' },
                  { label: '供应商', value: 'vendor' },
                ]}
              />
            ),
          },
          {
            label: '金额上限',
            name: 'price',
            value: (
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="输入金额"
              />
            ),
          },
        ]}
      />

      <ResultCard title="自动搜索输出" value={searchValue} />
    </div>
  );
}

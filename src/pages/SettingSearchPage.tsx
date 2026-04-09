import { Card, Input, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';

import SearchFormV2 from '../components/search-form-v2';
import styles from './Page.module.less';
import ResultCard from './ResultCard';

const { Paragraph } = Typography;

export default function SettingSearchPage() {
  const [searchValue, setSearchValue] = useState<Record<string, unknown>>({});

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页主要看展开/收起和字段设置是否正常，设置结果会通过
            IndexedDB 保留。这里额外演示了 `layoutConfig` 和
            `collapseConfig` 的可配置能力。
          </Paragraph>
          <Space wrap>
            <Tag color="purple">setting.uniqueKey</Tag>
            <Tag color="magenta">minRows=1</Tag>
            <Tag color="orange">IndexedDB</Tag>
          </Space>
        </Space>
      </Card>

      <SearchFormV2
        setting={{ uniqueKey: 'playground-search-setting' }}
        minRows={1}
        isDefaultExpand={false}
        layoutConfig={{
          minColumnWidth: 280,
          columnGap: 16,
          rowGap: 16,
        }}
        collapseConfig={{
          singleColumnExtraRows: 2,
        }}
        onSearch={(value) => setSearchValue(value as Record<string, unknown>)}
        items={[
          {
            label: '标题',
            name: 'title',
            value: <Input allowClear placeholder="标题" />,
          },
          {
            label: '编码',
            name: 'code',
            value: <Input allowClear placeholder="编码" />,
          },
          {
            label: '负责人',
            name: 'owner',
            value: <Input allowClear placeholder="负责人" />,
          },
          {
            label: '业务线',
            name: 'line',
            value: (
              <Select
                allowClear
                placeholder="选择业务线"
                options={[
                  { label: '采购', value: 'purchase' },
                  { label: '合同', value: 'contract' },
                  { label: '履约', value: 'delivery' },
                ]}
              />
            ),
          },
          {
            label: '审批状态',
            name: 'approveStatus',
            value: (
              <Select
                allowClear
                placeholder="审批状态"
                options={[
                  { label: '草稿', value: 'draft' },
                  { label: '审批中', value: 'approving' },
                  { label: '已通过', value: 'approved' },
                ]}
              />
            ),
          },
          {
            label: '供应商',
            name: 'vendor',
            value: <Input allowClear placeholder="供应商" />,
          },
          {
            label: '采购员',
            name: 'buyer',
            value: <Input allowClear placeholder="采购员" />,
          },
        ]}
      />

      <ResultCard title="字段设置页输出" value={searchValue} />
    </div>
  );
}

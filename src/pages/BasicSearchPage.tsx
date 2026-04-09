import { Card, DatePicker, Input, Select, Space, Tag, Typography } from "antd";

import SearchFormV2 from "../components/search-form-v2";
import styles from "./Page.module.less";
import ResultCard from "./ResultCard";
import { useState } from "react";

const { Paragraph } = Typography;

export default function BasicSearchPage() {
  const [searchValue, setSearchValue] = useState<Record<string, unknown>>({});

  return (
    <div className={styles.page}>
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            这页主要验证基础搜索能力、跨列和提交结果。关键字现在也是
            `requiredFields`，清空后查询按钮会立刻禁用。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">SearchFormV2</Tag>
            <Tag color="cyan">layout=card</Tag>
            <Tag color="geekblue">colSpan=max</Tag>
          </Space>
        </Space>
      </Card>

      <SearchFormV2
        onSearch={(value) => setSearchValue(value as Record<string, unknown>)}
        onReset={(value) => setSearchValue(value as Record<string, unknown>)}
        labelWidth={92}
        requiredFields={['keyword']}
        items={[
          {
            label: "关键字",
            name: "keyword",
            value: <Input placeholder="输入商品名/编号" allowClear />,
          },
          {
            label: "状态",
            name: "status",
            value: (
              <Select
                allowClear
                placeholder="请选择状态"
                options={[
                  { label: "待审核", value: "pending" },
                  { label: "进行中", value: "running" },
                  { label: "已完成", value: "done" },
                ]}
              />
            ),
          },
          {
            label: "更新时间",
            name: "dateRange",
            value: <DatePicker.RangePicker style={{ width: "100%" }} />,
          },
          {
            label: "供应商",
            name: "supplier",
            value: <Input placeholder="输入供应商名称" allowClear />,
          },
          {
            label: "备注",
            name: "remark",
            colSpan: "max",
            value: (
              <Input.TextArea
                placeholder="支持整行跨列"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            ),
          },
        ]}
      />

      <ResultCard title="基础搜索输出" value={searchValue} />
    </div>
  );
}

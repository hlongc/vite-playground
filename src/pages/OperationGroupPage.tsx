import {
  Button,
  Card,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from "antd";

import DemoBlock from "../components/demo-block";
import OperationGroup from "../components/operation-group";
import type { OperationItem } from "../components/operation-group";
import styles from "./Page.module.less";

const { Paragraph, Text } = Typography;
const demoAuthList = ['view', 'edit', 'delete', 'copy'];
const childrenDemoCode = `<OperationGroup max={3}>
  <Button type="link">查看</Button>
  <Button type="link">编辑</Button>
  <Button danger type="link">删除</Button>
  <Button type="link">复制</Button>
</OperationGroup>`;
const baseItemsDemoCode = `const items = [
  { key: 'view', authKey: 'view', render: <Button type="link">查看</Button> },
  { key: 'edit', authKey: 'edit', render: <Button type="link">编辑</Button> },
  { key: 'delete', authKey: 'delete', render: <Button danger type="link">删除</Button> },
  { key: 'copy', authKey: 'copy', render: <Button type="link">复制</Button> },
];

<OperationGroup items={items} max={3} authList={['view', 'edit', 'delete', 'copy']} />`;
const functionRenderDemoCode = `const items = [
  { key: 'view', authKey: 'view', render: <Button type="link">查看</Button> },
  {
    key: 'custom',
    hidden: true,
    authKey: 'not-granted',
    render: () => <Button type="link">函数 render 自己处理逻辑</Button>,
  },
  { key: 'delete', authKey: 'delete', render: <Button danger type="link">删除</Button> },
  { key: 'copy', authKey: 'copy', render: <Button type="link">复制</Button> },
];

<OperationGroup items={items} max={3} split="|" />`;
const overridePermissionDemoCode = `<OperationGroup
  items={items}
  max={4}
  authList={['view', 'edit', 'delete', 'copy']}
  hasPermission={(authKey) => authKey !== 'copy'}
/>`;
const nonCompactDemoCode = `<OperationGroup compactMode={false} max={3}>
  <Button type="link">查看</Button>
  <Button type="link">编辑</Button>
  <Button danger type="link">删除</Button>
  <Button type="link">复制</Button>
</OperationGroup>`;

const baseItems = (
  messageApi: ReturnType<typeof message.useMessage>[0],
): OperationItem[] => [
  {
    key: "view",
    authKey: "view",
    render: <Button type="link">查看</Button>,
  },
  {
    key: "edit",
    authKey: "edit",
    render: (
      <Button
        type="link"
        onClick={() => {
          messageApi.info("编辑");
        }}
      >
        编辑
      </Button>
    ),
  },
  {
    key: "delete",
    authKey: "delete",
    render: (
      <Popconfirm
        title="确认删除当前记录？"
        onConfirm={() => {
          messageApi.success("已删除");
        }}
      >
        <Button danger type="link">
          删除
        </Button>
      </Popconfirm>
    ),
  },
  {
    key: "copy",
    authKey: "copy",
    render: (
      <Button
        type="link"
        onClick={() => {
          messageApi.success("已复制");
        }}
      >
        复制
      </Button>
    ),
  },
];

export default function OperationGroupPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const functionRenderItems: OperationItem[] = [
    {
      key: "view",
      authKey: "view",
      render: <Button type="link">查看</Button>,
    },
    {
      key: "draft-only",
      hidden: true,
      authKey: "not-granted",
      render: () => (
        <Button
          type="link"
          onClick={() => {
            messageApi.info("函数 render 自己接管了可见性和权限逻辑");
          }}
        >
          函数 render（忽略 hidden/authKey）
        </Button>
      ),
    },
    {
      key: "delete",
      authKey: "delete",
      render: (
        <Popconfirm
          title="确认删除当前记录？"
          onConfirm={() => {
            messageApi.success("已删除");
          }}
        >
          <Button danger type="link">
            删除
          </Button>
        </Popconfirm>
      ),
    },
    {
      key: "copy",
      authKey: "copy",
      render: (
        <Button
          type="link"
          onClick={() => {
            messageApi.success("已复制");
          }}
        >
          复制
        </Button>
      ),
    },
  ];

  const permissionFilteredItems: OperationItem[] = [
    {
      key: "view",
      authKey: "view",
      render: <Button type="link">查看</Button>,
    },
    {
      key: "edit",
      authKey: "edit",
      render: <Button type="link">编辑</Button>,
    },
    {
      key: "archive",
      authKey: "archive",
      render: <Button type="link">归档（无权限）</Button>,
    },
    {
      key: "hidden",
      hidden: true,
      render: <Button type="link">隐藏项</Button>,
    },
    {
      key: "copy",
      authKey: "copy",
      render: <Button type="link">复制</Button>,
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}
      <Card className={styles.tipCard}>
        <Space direction="vertical" size={8}>
          <Paragraph>
            <code>OperationGroup</code> 这版只负责编排，不帮业务生成按钮。
            你可以直接在 <code>render</code> 里返回普通 <code>Button</code>、
            <code>Popconfirm</code> 包裹按钮，或者后面迁移真实权限逻辑时改成
            <code>authKey</code> 驱动。简单场景也支持直接传
            <code>children</code>，不必额外写 <code>items</code>。默认开启
            <code>compactMode</code>，会压缩 link 按钮的横向 padding；放在
            Card extra 等区域时可以传 <code>compactMode=false</code>。
          </Paragraph>
          <Space wrap>
            <Tag color="blue">max overflow</Tag>
            <Tag color="cyan">authKey</Tag>
            <Tag color="gold">hidden</Tag>
            <Tag color="green">custom render</Tag>
          </Space>
        </Space>
      </Card>

      <Card className={styles.gridCard} title="OperationGroup 编排示例">
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <DemoBlock
            title="极简 children 用法"
            description="如果只是几个普通操作按钮，直接写 children 就行，不需要 items，也不需要手动补 key。"
            code={childrenDemoCode}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <OperationGroup max={3}>
                <Button type="link">查看</Button>
                <Button type="link">编辑</Button>
                <Button danger type="link">
                  删除
                </Button>
                <Button type="link">复制</Button>
              </OperationGroup>
            </Space>
          </DemoBlock>

          <DemoBlock
            title="基础收纳"
            description="max=3，前两个常驻，后面的操作自动进入“更多”。"
            code={baseItemsDemoCode}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <OperationGroup items={baseItems(messageApi)} max={3} authList={demoAuthList} />
            </Space>
          </DemoBlock>

          <DemoBlock
            title="权限和隐藏过滤"
            description="元素 render 会先走 hidden/authKey 过滤；这页 demo 传入的 authList 里不包含 archive。"
            code={baseItemsDemoCode}
          >
            <Space direction="vertical" size={8}>
              <OperationGroup
                items={permissionFilteredItems}
                max={3}
                authList={demoAuthList}
              />
              <Text type="secondary">
                当前 demo authList：view、edit、delete、copy
              </Text>
            </Space>
          </DemoBlock>

          <DemoBlock
            title="函数 render 自处理"
            description="当 render 是函数时，OperationGroup 不再处理 hidden 和 authKey，默认交给函数内部自行决定。"
            code={functionRenderDemoCode}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <OperationGroup items={functionRenderItems} max={3} split="|" />
            </Space>
          </DemoBlock>

          <DemoBlock
            title="自定义权限判断"
            description="外部可以传 hasPermission 覆盖默认权限逻辑，方便后面接你们真实权限体系。"
            code={overridePermissionDemoCode}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <OperationGroup
                items={permissionFilteredItems}
                max={4}
                authList={demoAuthList}
                hasPermission={(authKey) => authKey !== "copy"}
              />
            </Space>
          </DemoBlock>

          <DemoBlock
            title="非紧凑模式"
            description="在 Card extra 这类不需要节约横向空间的位置，可以关闭 compactMode，保留 antd link 按钮默认 padding。"
            code={nonCompactDemoCode}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <OperationGroup compactMode={false} max={3}>
                <Button type="link">查看</Button>
                <Button type="link">编辑</Button>
                <Button danger type="link">
                  删除
                </Button>
                <Button type="link">复制</Button>
              </OperationGroup>
            </Space>
          </DemoBlock>
        </Space>
      </Card>
    </div>
  );
}

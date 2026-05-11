import { Layout, Tabs, Typography } from 'antd';

import styles from './App.module.less';
import BasicSearchPage from './pages/BasicSearchPage';
import AutoSearchPage from './pages/AutoSearchPage';
import FieldGridPage from './pages/FieldGridPage';
import GroupedProTablePage from './pages/GroupedProTablePage';
import NestedGroupedProTablePage from './pages/NestedGroupedProTablePage';
import OperationGroupPage from './pages/OperationGroupPage';
import ProTablePage from './pages/ProTablePage';
import ResizableColumnsPage from './pages/ResizableColumnsPage';
import SearchTablePage from './pages/SearchTablePage';
import SettingSearchPage from './pages/SettingSearchPage';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

function App() {
  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Title level={3} className={styles.title}>
          Pro Components Playground
        </Title>
        <Paragraph className={styles.subtitle}>
          Vite + antd 5 + less，用来隔离验证迁移后的 SearchForm、ProTable 和
          SearchTable 组件。
        </Paragraph>
      </Header>
      <Content className={styles.content}>
        <Tabs
          className={styles.tabs}
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '基础搜索',
              children: <BasicSearchPage />,
            },
            {
              key: 'auto',
              label: '自动搜索',
              children: <AutoSearchPage />,
            },
            {
              key: 'setting',
              label: '字段设置',
              children: <SettingSearchPage />,
            },
            {
              key: 'grid',
              label: 'FieldGrid V2',
              children: <FieldGridPage />,
            },
            {
              key: 'pro-table',
              label: 'ProTable',
              children: <ProTablePage />,
            },
            {
              key: 'grouped-pro-table',
              label: '分组表头',
              children: <GroupedProTablePage />,
            },
            {
              key: 'nested-grouped-pro-table',
              label: '多级分组',
              children: <NestedGroupedProTablePage />,
            },
            {
              key: 'resizable-columns',
              label: '列宽拖拽',
              children: <ResizableColumnsPage />,
            },
            {
              key: 'operation-group',
              label: '操作收纳',
              children: <OperationGroupPage />,
            },
            {
              key: 'search-table',
              label: 'SearchTable',
              children: <SearchTablePage />,
            },
          ]}
        />
      </Content>
    </Layout>
  );
}

export default App;

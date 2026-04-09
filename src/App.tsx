import { Layout, Tabs, Typography } from 'antd';

import styles from './App.module.less';
import BasicSearchPage from './pages/BasicSearchPage';
import AutoSearchPage from './pages/AutoSearchPage';
import FieldGridPage from './pages/FieldGridPage';
import SettingSearchPage from './pages/SettingSearchPage';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

function App() {
  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Title level={3} className={styles.title}>
          SearchForm V2 Playground
        </Title>
        <Paragraph className={styles.subtitle}>
          Vite + antd 5 + less, used to verify the migrated components in an
          isolated project.
        </Paragraph>
      </Header>
      <Content className={styles.content}>
        <Tabs
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
          ]}
        />
      </Content>
    </Layout>
  );
}

export default App;

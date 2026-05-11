import type {
  TablePaginationConfig as AntdTablePaginationConfig,
  TableProps as AntdTableProps,
} from 'antd';
import type { ColumnType as AntdColumnType } from 'antd/es/table/interface';
import type { ReactNode, SetStateAction } from 'react';

export interface TableStoreValue {
  id: string;
  tableKey: string;
  key: string;
  hidden: boolean;
  sort: number;
  /** 用户拖拽后持久化的列宽。 */
  width?: number;
}

export interface SettingItem extends Pick<TableStoreValue, 'key' | 'hidden'> {
  /** 设置面板里展示的列名。 */
  label: ReactNode;
  /** 为 false 时，该列只展示不允许隐藏。 */
  hideable: boolean;
  /** 分组表头场景下，用于限制只在同一叶子组内排序。 */
  sortGroupKey?: string;
  /** 分组表头路径，仅用于设置面板展示。 */
  groupPath?: string[];
}

export type ProTableColumnType<RecordType extends object> = AntdColumnType<RecordType> & {
  /** 是否允许用户拖拽调整当前列宽；默认跟随表级 columnResizable。 */
  resizable?: boolean;
  /** 列设置相关配置。 */
  setting?: {
    /** 是否允许在设置面板中隐藏该列，默认 true。 */
    hideable?: boolean;
    /** 默认排序位置，常用于给部分列预设更靠前的顺序。 */
    defaultSortIndex?: number;
    /** 初始是否隐藏，仅在首次生成偏好设置时生效。 */
    defaultHide?: boolean;
  };
  children?: ProTableColumnType<RecordType>[];
  /** 列级汇总，未传 summary prop 时会自动拼到表格 summary 行中。 */
  summary?: (data?: RecordType[]) => ReactNode;
};

export type ProTableColumnsType<RecordType extends object> =
  ProTableColumnType<RecordType>[];

export interface ProTableDescParam<RecordType extends object> {
  /** 当前表格实际渲染的数据。 */
  dataSource?: RecordType[];
  /** 当前分页配置；关闭分页时为 false。 */
  pagination?: AntdTablePaginationConfig | false;
}

export interface ProTableProps<RecordType extends object>
  extends Omit<
    AntdTableProps<RecordType>,
    'rowSelection' | 'columns' | 'summary' | 'caption'
  > {
  /** 扩展版 rowSelection，支持底部选中描述和批量操作区。 */
  rowSelection?: AntdTableProps<RecordType>['rowSelection'] & {
    /** 底部左侧描述，未传时默认展示“共选中 x 条数据”。 */
    desc?: ReactNode | ((params: ProTableDescParam<RecordType>) => ReactNode);
    /** 底部右侧批量操作按钮。 */
    actions?: ReactNode[];
  };
  /** 表格标题区配置；传 false 可关闭整块 caption。 */
  caption?:
    | {
        /** 标题区左侧描述。 */
        desc?: ReactNode | ((params: ProTableDescParam<RecordType>) => ReactNode);
        /** 标题区右侧操作按钮。 */
        actions?: ReactNode[];
        /** 是否开启列设置面板；开启时要求传 uniqueKey。 */
        setting?: boolean;
      }
    | false;
  /** 单元格值为空时的统一兜底展示，默认 '-'。 */
  renderEmptyContent?: ReactNode;
  /** 是否开启列宽拖拽，默认 true。 */
  columnResizable?: boolean;
  /**
   * 是否展示序号列。
   * 传对象时可以覆写序号列的 title / width / fixed / render / summary 等配置。
   */
  serial?:
    | boolean
    | Pick<
        ProTableColumnType<RecordType>,
        'title' | 'align' | 'fixed' | 'className' | 'width' | 'render' | 'summary'
      >;
  /** 扩展版 columns，支持列设置、列宽拖拽和列级 summary。 */
  columns?: ProTableColumnType<RecordType>[];
  /**
   * 当前表格的唯一标识。
   * 开启 caption.setting 或需要持久化列宽时必须传，用于存储列顺序 / 显隐 / 宽度偏好。
   */
  uniqueKey?: string;
  /**
   * 自定义 summary。
   * 传入后会直接接管表格汇总区；第二个参数会返回当前生效的列设置状态。
   */
  summary?: (
    data?: readonly RecordType[],
    settingItems?: (SettingItem & TableStoreValue)[]
  ) => ReactNode;
}

export interface SettingPanelProps {
  value: (SettingItem & TableStoreValue)[];
  onChange: (value: (SettingItem & TableStoreValue)[]) => void;
  onReset: () => void;
  onSelectAll: () => void;
}

export interface ProTableRef {
  /** 允许外部直接覆盖当前列设置状态。 */
  setSettingItems: (
    handle: SetStateAction<(SettingItem & TableStoreValue)[]>
  ) => void;
}

import type { ReactElement, RefObject } from 'react';

import ProTable from './ProTable';
import type { ProTableProps, ProTableRef } from './interface';

const ProTableWrapper = ProTable as unknown as (<
  RecordType extends object = Record<string, any>,
>(
  props: ProTableProps<RecordType> & {
    ref?: RefObject<ProTableRef | null>;
  }
) => ReactElement);

export default ProTableWrapper;
export type {
  ProTableColumnType,
  ProTableColumnsType,
  ProTableDescParam,
  ProTableProps,
  ProTableRef,
  SettingItem,
  TableStoreValue,
} from './interface';

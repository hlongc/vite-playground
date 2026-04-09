import type { ButtonProps, FormInstance, FormItemProps, FormProps } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type {
  FieldData,
  NamePath,
  Store,
} from 'rc-field-form/es/interface';

import type {
  FieldGridItem,
  FieldGridLayoutConfig,
} from '../field-grid-v2/interface';

export type SearchFormItemProps = FieldGridItem;
export type { FieldData, NamePath, Store };

export interface SearchFormProps {
  items: FieldGridItem[];
  onSearch: (val: Store) => void;
  onReset?: (val: Store) => void;
  onFieldsChange?: (
    changedFields: FormProps['fields'],
    allFields: FormProps['fields']
  ) => void;
  requiredFields?: NamePath[];
  searchLoading?: boolean;
  layout?: 'card' | false;
  labelWidth?: number | string | 'auto';
  initSearchValues?: Store;
  autoSearch?: boolean;
  isDefaultExpand?: boolean;
  minRows?: number;
  layoutConfig?: FieldGridLayoutConfig;
  collapseConfig?: SearchFormCollapseConfig;
  setting?:
    | false
    | {
        uniqueKey: string;
      };
  actions?: ReactNode[];
  uniqueKey?: string;
  style?: CSSProperties;
  className?: string;
  resetButtonProps?: ButtonProps;
  submitButtonProps?: ButtonProps;
  searchTrigger?: 'onSubmit' | 'onChange';
  cacheRequiredInit?: boolean;
}

export interface SearchFormRef {
  search: () => void;
  reset: () => void;
  setPartialFieldsValue: (value: Store) => void;
  setFields: (fields: FieldData[]) => void;
  getFieldsValue: FormInstance['getFieldsValue'];
}

export interface SearchFormStoreValue {
  id: string;
  formKey: string;
  key: string;
  hidden: boolean;
}

export interface SearchFormCollapseConfig {
  singleColumnExtraRows?: number;
}

export interface SettingItem extends Pick<SearchFormStoreValue, 'key' | 'hidden'> {
  label: ReactNode;
}

export interface SettingPopoverProps {
  value: (SettingItem & SearchFormStoreValue)[];
  onChange: (value: (SettingItem & SearchFormStoreValue)[]) => void;
  onReset: () => void;
  triggerClassName?: string;
}

export type SearchFormFieldItem = FormItemProps;

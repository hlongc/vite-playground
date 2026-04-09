import { Button, Checkbox, Dropdown } from 'antd';

import styles from './SettingPanel.module.less';
import type {
  SearchFormStoreValue,
  SettingItem,
  SettingPopoverProps,
} from './interface';

export default function SettingPanel({
  value,
  onChange,
  onReset,
  triggerClassName,
}: SettingPopoverProps) {
  const toggleChecked = (target: SettingItem) => {
    onChange(
      value.map((item) => {
        if (item.key !== target.key) {
          return item;
        }

        return {
          ...item,
          hidden: !item.hidden,
        } as SettingItem & SearchFormStoreValue;
      })
    );
  };

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      dropdownRender={() => (
        <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
          <div className={styles.list}>
            {value.map((item) => (
              <div key={item.key} className={styles.item}>
                <Checkbox
                  checked={!item.hidden}
                  onChange={() => toggleChecked(item)}
                >
                  {item.label}
                </Checkbox>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <Button block onClick={onReset}>
              重置
            </Button>
          </div>
        </div>
      )}
    >
      <Button
        type="link"
        className={triggerClassName}
      >
        设置
      </Button>
    </Dropdown>
  );
}

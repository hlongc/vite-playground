import { Button, Checkbox, Dropdown } from 'antd';
import cs from 'classnames';
import { useMemo, useState } from 'react';

import type {
  SettingItem,
  SettingPanelProps,
  TableStoreValue,
} from './interface';
import styles from './SettingPanel.module.less';

type DragPosition = 'upward' | 'downward' | null;
type SettingValueItem = SettingItem & TableStoreValue;

interface SettingSection {
  key: string;
  groupPath: string[] | null;
  items: SettingValueItem[];
}

function withSortedValue(
  items: SettingValueItem[]
): SettingValueItem[] {
  return items.map((item, index) => ({
    ...item,
    sort: index,
  }));
}

function reorderItems(
  items: SettingValueItem[],
  activeKey: string,
  overKey: string,
  position: Exclude<DragPosition, null>
) {
  if (activeKey === overKey) {
    return withSortedValue(items);
  }

  const activeItem = items.find((item) => item.key === activeKey);
  const overItem = items.find((item) => item.key === overKey);

  if (!activeItem || !overItem) {
    return withSortedValue(items);
  }

  // Grouped header mode only supports reordering inside the same leaf group.
  if (activeItem.sortGroupKey !== overItem.sortGroupKey) {
    return withSortedValue(items);
  }

  const itemsWithoutActive = items.filter((item) => item.key !== activeKey);
  const targetIndex = itemsWithoutActive.findIndex((item) => item.key === overKey);

  if (targetIndex < 0) {
    return withSortedValue(items);
  }

  const insertIndex = position === 'downward' ? targetIndex + 1 : targetIndex;
  itemsWithoutActive.splice(insertIndex, 0, activeItem);

  return withSortedValue(itemsWithoutActive);
}

function getSectionPath(item: SettingValueItem) {
  if (!item.groupPath?.length) {
    return null;
  }

  return item.groupPath;
}

export default function SettingPanel({
  value,
  onChange,
  onReset,
  onSelectAll,
}: SettingPanelProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    key: string;
    position: DragPosition;
  } | null>(null);

  const sortedValue = useMemo(
    () => [...value].sort((left, right) => left.sort - right.sort),
    [value]
  );
  const sections = useMemo<SettingSection[]>(() => {
    const result: SettingSection[] = [];
    const sectionMap = new Map<string, SettingSection>();

    sortedValue.forEach((item) => {
      const groupPath = getSectionPath(item);
      const key = groupPath?.join('__') ?? '__root__';
      const currentSection = sectionMap.get(key);

      if (currentSection) {
        currentSection.items.push(item);
        return;
      }

      const nextSection: SettingSection = {
        key,
        groupPath,
        items: [item],
      };
      sectionMap.set(key, nextSection);
      result.push(nextSection);
    });

    return result;
  }, [sortedValue]);

  const toggleChecked = (target: SettingItem) => {
    onChange(
      sortedValue.map((item) => {
        if (item.key !== target.key) {
          return item;
        }

        return {
          ...item,
          hidden: !item.hidden,
        };
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
            {sections.map((section) => (
              <div key={section.key} className={styles.section}>
                {section.groupPath?.length && (
                  <div className={styles.sectionTitle}>
                    {section.groupPath.map((segment, index) => (
                      <span key={`${section.key}-${segment}-${index}`} className={styles.breadcrumbItem}>
                        {index > 0 && <span className={styles.breadcrumbDivider}>/</span>}
                        <span className={styles.breadcrumbPill}>{segment}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.sectionItems}>
                  {section.items.map((item) => {
                    const dragPosition =
                      dragOver?.key === item.key ? dragOver.position : null;

                    return (
                      <div
                        key={item.key}
                        draggable
                        className={cs(styles.item, {
                          [styles.itemDragging]: draggingKey === item.key,
                          [styles.dropOverUpward]: dragPosition === 'upward',
                          [styles.dropOverDownward]: dragPosition === 'downward',
                        })}
                        onDragStart={(event) => {
                          setDraggingKey(item.key);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', item.key);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggingKey === item.key) {
                            return;
                          }

                          const rect = event.currentTarget.getBoundingClientRect();
                          const position =
                            event.clientY - rect.top < rect.height / 2
                              ? 'upward'
                              : 'downward';

                          setDragOver({
                            key: item.key,
                            position,
                          });
                        }}
                        onDragLeave={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null
                            )
                          ) {
                            setDragOver((current) =>
                              current?.key === item.key ? null : current
                            );
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const activeKey = event.dataTransfer.getData('text/plain');
                          const position = dragOver?.position;

                          if (!activeKey || !position) {
                            setDraggingKey(null);
                            setDragOver(null);
                            return;
                          }

                          onChange(
                            reorderItems(sortedValue, activeKey, item.key, position)
                          );
                          setDraggingKey(null);
                          setDragOver(null);
                        }}
                        onDragEnd={() => {
                          setDraggingKey(null);
                          setDragOver(null);
                        }}
                      >
                        <span className={styles.dragHandle} aria-hidden="true" />
                        <div className={styles.itemLabel}>
                          {item.hideable ? (
                            <Checkbox
                              checked={!item.hidden}
                              onChange={() => toggleChecked(item)}
                            >
                              {item.label}
                            </Checkbox>
                          ) : (
                            <span className={styles.nonHideableLabel}>{item.label}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <Button size="small" onClick={onSelectAll}>
              全选
            </Button>
            <Button size="small" onClick={onReset}>
              重置
            </Button>
          </div>
        </div>
      )}
    >
      <Button type="link" className={styles.trigger}>
        设置
      </Button>
    </Dropdown>
  );
}

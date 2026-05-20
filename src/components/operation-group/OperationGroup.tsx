import { Button, Dropdown, Space } from "antd";
import cs from "classnames";
import { Children, Fragment, isValidElement, useMemo } from "react";
import type { Key, ReactElement, ReactNode } from "react";

import type {
  OperationGroupProps,
  OperationItem,
  OperationRender,
} from "./interface";
import styles from "./OperationGroup.module.less";

const DEFAULT_MAX = 3;

function isRenderFunction(
  render: OperationRender,
): render is () => ReactElement {
  return typeof render === "function";
}

function normalizeMax(max: number | undefined) {
  if (!Number.isFinite(max)) {
    return DEFAULT_MAX;
  }

  return Math.max(1, Math.floor(max as number));
}

function defaultHasPermission(authKey: Key, authList?: Key[]) {
  // Align with the existing PButton permission source so migration stays smooth.
  const globalWindow =
    typeof window === "undefined"
      ? undefined
      : (window as {
          microApp?: {
            getData?: () => {
              userInfo?: {
                buttons?: Key[];
              };
            };
          };
        });
  const list =
    authList ??
    globalWindow?.microApp?.getData?.()?.userInfo?.buttons ??
    [];

  return list.some((code) => String(code) === String(authKey));
}

function shouldKeepItem(
  item: OperationItem,
  hasPermission: (authKey: Key, authList?: Key[]) => boolean,
  authList?: Key[],
) {
  if (isRenderFunction(item.render)) {
    return true;
  }

  if (item.hidden) {
    return false;
  }

  if (item.authKey != null) {
    return hasPermission(item.authKey, authList);
  }

  return true;
}

function renderOperation(item: OperationItem) {
  const content = isRenderFunction(item.render) ? item.render() : item.render;

  return <Fragment key={item.key}>{content}</Fragment>;
}

interface NormalizedOperation {
  key: Key;
  node: ReactNode;
}

export default function OperationGroup({
  items,
  children,
  max = DEFAULT_MAX,
  moreText = "更多",
  size = 4,
  split,
  compactMode = true,
  className,
  style,
  dropdownProps,
  moreButtonProps,
  authList,
  hasPermission = defaultHasPermission,
}: OperationGroupProps) {
  const visibleItems = useMemo<NormalizedOperation[]>(() => {
    if (items?.length) {
      return items
        .filter((item) => shouldKeepItem(item, hasPermission, authList))
        .map((item) => ({
          key: item.key,
          node: renderOperation(item),
        }));
    }

    return Children.toArray(children).map((child, index) => {
      if (isValidElement(child) && child.key != null) {
        return {
          key: child.key,
          node: child,
        };
      }

      return {
        key: `child-${index}`,
        node: child,
      };
    });
  }, [authList, children, hasPermission, items]);
  const normalizedMax = normalizeMax(max);
  const { inlineItems, overflowItems } = useMemo(() => {
    if (visibleItems.length <= normalizedMax) {
      return {
        inlineItems: visibleItems,
        overflowItems: [] as NormalizedOperation[],
      };
    }

    return {
      inlineItems: visibleItems.slice(0, normalizedMax - 1),
      overflowItems: visibleItems.slice(normalizedMax - 1),
    };
  }, [normalizedMax, visibleItems]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div
      className={cs(styles.group, compactMode && styles.compact, className)}
      style={style}
    >
      <Space size={size} split={split}>
        {inlineItems.map((item) => (
          <Fragment key={item.key}>{item.node}</Fragment>
        ))}
        {overflowItems.length > 0 && (
          <Dropdown
            trigger={["hover"]}
            placement="bottomLeft"
            {...dropdownProps}
            dropdownRender={() => (
              <div
                className={cs(
                  styles.dropdown,
                  compactMode && styles.compactDropdown,
                )}
              >
                <div className={styles.dropdownList}>
                  {overflowItems.map((item) => (
                    <div key={item.key} className={styles.dropdownItem}>
                      {item.node}
                    </div>
                  ))}
                </div>
              </div>
            )}
          >
            <Button
              type="link"
              {...moreButtonProps}
              className={moreButtonProps?.className}
            >
              <span className={styles.moreText}>{moreText}</span>
            </Button>
          </Dropdown>
        )}
      </Space>
    </div>
  );
}

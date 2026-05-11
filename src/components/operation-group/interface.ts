import type { ButtonProps, DropdownProps, SpaceProps } from 'antd';
import type { CSSProperties, Key, ReactElement, ReactNode } from 'react';

export type OperationRender = ReactElement | (() => ReactElement);

export interface OperationItem {
  /** 用于稳定标识操作项，也是 items 模式下切分“更多”时的唯一 key。 */
  key: Key;
  /** 仅在 render 为 ReactElement 时生效；为 true 时该项会在编排前被过滤。 */
  hidden?: boolean;
  /** 仅在 render 为 ReactElement 时生效；传值后会先做权限校验，再决定是否参与编排。 */
  authKey?: Key;
  /**
   * 支持两种形态：
   * 1. ReactElement：hidden / authKey 会先参与过滤，再渲染该元素
   * 2. () => ReactElement：视为外部完全接管渲染逻辑，hidden / authKey 默认失效
   */
  render: OperationRender;
}

export interface OperationGroupProps {
  /**
   * 复杂模式：支持 hidden / authKey 等编排能力。
   * 如果同时传了 items 和 children，优先使用 items。
   */
  items?: OperationItem[];
  /**
   * 极简模式：适合普通按钮收纳，不需要额外写 items。
   * 注意：children 模式无法提前拿到子组件的最终渲染结果，因此不适合放内部可能返回 null 的权限组件。
   */
  children?: ReactNode;
  /** 最多在行内展示的操作总数，包含“更多”按钮本身，默认 3。 */
  max?: number;
  /** “更多”触发器文案，默认“更多”。 */
  moreText?: ReactNode;
  /** 透传给 antd Space 的 size。 */
  size?: SpaceProps['size'];
  /** 透传给 antd Space 的 split。 */
  split?: ReactNode;
  /** 外层容器 className。 */
  className?: string;
  /** 外层容器 style。 */
  style?: CSSProperties;
  /** 透传给 antd Dropdown，方便覆盖 placement / trigger 等行为。 */
  dropdownProps?: Omit<DropdownProps, 'dropdownRender' | 'menu' | 'children'>;
  /** 透传给“更多”按钮本身。 */
  moreButtonProps?: ButtonProps;
  /**
   * 对齐 PButton 的权限列表输入。
   * 未传时会尝试读取 window.microApp?.getData()?.userInfo?.buttons。
   */
  authList?: Key[];
  /**
   * 自定义权限判断函数。
   * 未传时会使用内置的 PButton 同源逻辑。
   */
  hasPermission?: (authKey: Key, authList?: Key[]) => boolean;
}

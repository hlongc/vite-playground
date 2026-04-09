import { Form } from 'antd';
import cs from 'classnames';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';

import styles from './FieldGrid.module.less';
import type {
  FieldGridItem,
  FieldGridLayoutConfig,
  FormItemWithGrid,
  UseFieldGridProps,
} from './interface';

const emptyItems: FieldGridItem[] = [];
const defaultLayoutConfig: Required<FieldGridLayoutConfig> = {
  minColumnWidth: 340,
  columnGap: 24,
  rowGap: 12,
};
const resizeThreshold = 10;

/**
 * useFieldGrid 负责把“声明式的表单项配置”转换成“可以直接渲染到 CSS Grid 里的布局数据”。
 *
 * 这层逻辑主要解决 3 个问题：
 * 1. 当前容器宽度下，一行最多能摆几列。
 * 2. 每个 item 最终应该落在哪一行、哪两条栅格线之间。
 * 3. 渲染时既要保留 antd Form.Item 的能力，又要把每个格子的位置信息暴露给上层。
 *
 * SearchFormV2 的收起/展开能力依赖这里算出来的 rowIndex / colStart / colEnd，
 * 所以后续如果要改折叠规则，通常也要先理解这一层的布局算法。
 */
export default function useFieldGrid(props: UseFieldGridProps) {
  const {
    items: originalItems = emptyItems,
    labelWidth = 100,
    colon = true,
    layoutConfig,
    containerRef,
  } = props;
  const mergedLayoutConfig = useMemo(
    () => ({
      ...defaultLayoutConfig,
      ...layoutConfig,
    }),
    [layoutConfig]
  );
  const { minColumnWidth, columnGap, rowGap } = mergedLayoutConfig;

  const prevContainerWidth = useRef(0);
  const [rowNum, setRowNum] = useState(0);

  const setRowNumHandle = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const diffContainerWidth = Math.abs(
      containerWidth - prevContainerWidth.current
    );

    setRowNum((previous) => {
      /**
       * 这里沿用旧组件的经验值：
       * - 每列最小宽度按 340px 估算
       * - 列间距固定 24px
       *
       * 公式的结果不是“像素精确布局”，而是一个足够稳定的列数估算值。
       * 后续真正的宽度仍由 CSS Grid 的 minmax(340px, 1fr) 接管。
       *
       * 10px 阈值是为了避免 ResizeObserver 在浏览器缩放、滚动条抖动等场景下
       * 反复触发微小尺寸变化，导致 rowNum 高频重算。
       */
      if (previous === 0 || diffContainerWidth >= resizeThreshold) {
        const next = Math.floor(
          (containerWidth - minColumnWidth) / (minColumnWidth + columnGap) + 1
        );
        prevContainerWidth.current = containerWidth;
        return Math.max(next, 1);
      }

      return previous;
    });
  }, [columnGap, containerRef, minColumnWidth]);

  useEffect(() => {
    // 首次挂载先主动算一次，避免必须等 ResizeObserver 回调后才有布局。
    setRowNumHandle();

    if (typeof window === 'undefined') {
      return undefined;
    }

    if (typeof window.ResizeObserver === 'undefined') {
      // 老环境没有 ResizeObserver 时，退化成 window resize。
      window.addEventListener('resize', setRowNumHandle);
      return () => {
        window.removeEventListener('resize', setRowNumHandle);
      };
    }

    // 现代浏览器优先监听容器自身尺寸变化，这样父容器伸缩也能及时重排。
    const observer = new window.ResizeObserver(() => {
      setRowNumHandle();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerRef, setRowNumHandle]);

  const items = useMemo<FormItemWithGrid[]>(() => {
    const edge = (line: number, isStart: boolean) => {
      let nextLine = line;
      /**
       * 这里做两件事：
       * 1. 兼容负数栅格线，含义和 CSS Grid 接近，例如 -1 表示从右往左数。
       * 2. 把超出当前可用列数的值收敛回合法范围，避免小屏幕下出现非法 grid line。
       *
       * isStart / isEnd 的边界不完全一样：
       * - start 最小能到 -(rowNum + 1)
       * - end   最小能到 -rowNum
       * 因为结束线天然比开始线多一条。
       */
      nextLine = Math.max(0 - rowNum - (isStart ? 1 : 0), nextLine);
      nextLine = Math.min(rowNum + (isStart ? 0 : 1), nextLine);

      if (nextLine < 0) {
        nextLine = rowNum + line + 2;
      }

      return nextLine;
    };

    const result: FormItemWithGrid[] = [];
    const sortedItems = originalItems
      .filter((item) => item.renderable ?? true)
      .sort((left, right) => {
        /**
         * hidden 项仍然需要参与“统一的一套布局推导”，
         * 这样 SearchFormV2 才能继续复用 rowIndex / colEnd 等信息做折叠和按钮定位。
         *
         * 但如果把 hidden 项直接留在原位，会把可见项挤出一堆不直观的空洞，
         * 所以这里把它们统一排到后面，尽量让可见区域保持紧凑。
         */
        if ((left.hidden && right.hidden) || (!left.hidden && !right.hidden)) {
          return 0;
        }
        return left.hidden ? 1 : -1;
      });

    for (let index = 0, rowIndex = 1; index < sortedItems.length; index += 1) {
      const item = sortedItems[index];
      const { labelAlign, colStart, colEnd, colSpan, style, ...rest } = item;

      let nextColStart = colStart;
      if (nextColStart === undefined) {
        /**
         * 默认布局策略：
         * - 如果调用方没有显式指定 colStart，就从上一个 item 的 colEnd 开始接着排。
         * - 如果接下来已经超过本行最大列数，则自动回到第 1 列，相当于换行。
         *
         * 这让调用方只写 items 数组也能得到自然的“从左到右、放不下就换行”的行为。
         */
        nextColStart = index > 0 ? result[index - 1].colEnd : 1;
        if (nextColStart > rowNum) {
          nextColStart = 1;
        }
      }
      nextColStart = edge(nextColStart, true);

      let nextColEnd = colEnd;
      if (colSpan === 'max') {
        /**
         * colSpan = 'max' 是最特殊的模式，语义是“无论当前列数是多少都铺满整行”。
         * 所以这里直接把 start 固定为 1，end 固定为 rowNum + 1。
         */
        nextColStart = 1;
        nextColEnd = rowNum + 1;
      } else if (nextColEnd === undefined) {
        /**
         * 常规模式下如果没有显式传 colEnd，就根据 colSpan 推导。
         * 默认 colSpan 为 1，也就是占一个单元格宽度。
         */
        nextColEnd = nextColStart + (colSpan ?? 1);
        if (nextColEnd > rowNum + 1) {
          // 当前行剩余位置不够时，回到下一行重新算。
          nextColStart = 1;
          nextColEnd = nextColStart + (colSpan ?? 1);
        }
      }
      nextColEnd = edge(nextColEnd, false);

      if (item.hidden) {
        /**
         * hidden 项不应该真正占据网格空间，但又不能让后续 item 的相对关系全部失真。
         * 所以这里给它保留一个“虚拟位置”：
         * - colEnd 继承上一个可见格子的 colEnd
         * - colStart 退一格
         *
         * 这样它渲染出来会被 CSS 隐藏，但布局推导链条不会断。
         */
        nextColEnd = index > 0 ? result[index - 1].colEnd : 1;
        nextColStart = nextColEnd - 1;
      } else if (index > 0) {
        /**
         * rowIndex 只对可见项有意义。
         * 当起始列回到 1，或者“插入位置”跑到上一个格子左侧时，说明发生了换行。
         */
        if (nextColStart === 1 || nextColStart < result[index - 1].colEnd) {
          rowIndex += 1;
        }
      }

      result.push({
        labelAlign: labelAlign ?? props.labelAlign ?? 'right',
        labelCol: {
          flex: `0 0 ${
            typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth
          }`,
        },
        wrapperCol: {
          flex: 1,
          style: {
            width: 0,
          },
        },
        style: {
          ...style,
          gridColumnStart: nextColStart,
          gridColumnEnd: nextColEnd,
        },
        colon,
        colStart: nextColStart,
        colEnd: nextColEnd,
        rowIndex,
        ...rest,
      });
    }

    // 最终返回的是“增强版 FormItem 配置”，额外带上网格坐标给上层消费。
    return result;
  }, [colon, labelWidth, originalItems, props.labelAlign, rowNum]);

  const renderGrid = useCallback(
    ({
      items: nextItems,
      style,
      className,
      extra,
    }: {
      items: FormItemWithGrid[];
      style?: CSSProperties;
      className?: string;
      extra?: ReactNode;
    }) => {
      return (
        <div
          className={cs(styles.grid, className)}
          style={{
            /**
             * 列数是运行时算出来的，不适合预先写死在 less 里，
             * 所以 gridTemplateColumns 直接走行内样式。
             */
            columnGap: `${columnGap}px`,
            gridTemplateColumns: `repeat(${rowNum}, minmax(${minColumnWidth}px, 1fr))`,
            rowGap: `${rowGap}px`,
            ...style,
          }}
          ref={containerRef}
        >
          {rowNum > 0 && (
            <>
              {nextItems.map((item, index) => {
                const {
                  value,
                  render,
                  colStart,
                  colEnd,
                  rowIndex,
                  style: itemStyle,
                  className: itemClassName,
                  ...formItemProps
                } = item;

                return (
                  <div
                    key={item.key ?? index}
                    className={cs(
                      styles.item,
                      {
                        [styles.itemHidden]: item.hidden,
                      },
                      itemClassName
                    )}
                    data-row-index={rowIndex}
                    data-col-start={colStart}
                    data-col-end={colEnd}
                    style={itemStyle}
                  >
                    {render ? (
                      // render 优先级最高，给调用方完全接管这个格子的渲染方式。
                      render(formItemProps)
                    ) : (
                      <Form.Item
                        {...formItemProps}
                        label={
                          typeof formItemProps.label !== 'string' ||
                          labelWidth === 'auto' ? (
                            // labelWidth=auto 时直接交给 antd 自然撑开，不做截断包装。
                            formItemProps.label
                          ) : (
                            <span
                              className={styles.labelText}
                              title={formItemProps.label}
                            >
                              {formItemProps.label}
                            </span>
                          )
                        }
                      >
                        {value}
                      </Form.Item>
                    )}
                  </div>
                );
              })}
              // extra 一般给 SearchFormV2 放按钮区使用，让按钮区和字段一起走同一套网格。
              {extra}
            </>
          )}
        </div>
      );
    },
    [columnGap, containerRef, labelWidth, minColumnWidth, rowGap, rowNum]
  );

  return { rowNum, items, renderGrid };
}

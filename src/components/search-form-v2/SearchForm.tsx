import { Button, Card, Form } from 'antd';
import cs from 'classnames';
import { debounce, get, merge, set } from 'lodash';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Ref } from 'react';

import FieldGridV2 from '../field-grid-v2';
import type { FormItemWithGrid } from '../field-grid-v2/interface';
import SettingPanel from './SettingPanel';
import type {
  FieldData,
  NamePath,
  SearchFormItemProps,
  SearchFormProps,
  SearchFormRef,
  SearchFormStoreValue,
  SettingItem,
  Store,
} from './interface';
import styles from './SearchForm.module.less';
import { connectStore } from './utils/indexedDB';
import { trimStringField } from './utils';

const emptyArray: any[] = [];
const defaultSingleColumnExtraRows = 1;

/**
 * SearchFormV2 的整体工作流可以按下面这条链路理解：
 *
 * 1. 外部传入 items。
 * 2. 如果开启字段设置(setting)，先把 items 和 IndexedDB 里的 hidden 配置合并。
 * 3. 把合并后的 items 交给 FieldGridV2，得到每个字段的布局坐标。
 * 4. 根据 rowIndex / colEnd 判断哪些字段在“收起状态”下应该被隐藏。
 * 5. 统一通过 antd Form 管理值变化、提交、重置和 ref 能力。
 *
 * 这意味着：
 * - “字段显隐”主要发生在 item 配置层。
 * - “收起展开”主要发生在布局结果层。
 * - “自动搜索/必填联动”主要发生在 Form 值变化层。
 */
function getItemKey(item: SearchFormItemProps): string {
  if (item.key) {
    return String(item.key);
  }

  if (item.name) {
    // name 允许是 NamePath，所以数组场景下要转成稳定字符串作为存储 key。
    return Array.isArray(item.name) ? item.name.join('.') : String(item.name);
  }

  throw new Error(`${JSON.stringify(item)} need a name or key`);
}

function hasRequiredFieldValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function isRequiredFieldsSatisfied(values: Store, requiredFields: NamePath[]) {
  if (!requiredFields.length) {
    return true;
  }

  return requiredFields.every((field) =>
    hasRequiredFieldValue(get(values, field))
  );
}

function getRequiredFieldsSnapshot(values: Store, requiredFields: NamePath[]) {
  const snapshot: Store = {};

  requiredFields.forEach((field) => {
    const value = get(values, field);
    if (value !== undefined) {
      set(snapshot, field as any, value);
    }
  });

  return snapshot;
}

function shouldHideCollapsedItem(
  item: FormItemWithGrid,
  rowNum: number,
  minRows: number,
  singleColumnExtraRows: number
) {
  if (item.hidden || rowNum === 0) {
    return false;
  }

  const collapsedRows =
    rowNum === 1 ? minRows + singleColumnExtraRows : minRows;
  /**
   * 折叠规则不是“简单只保留前 N 行”。
   *
   * 这里还要额外处理一个旧组件就存在的细节：
   * - 当 rowNum === 1 时，按钮区会单独占掉一行，所以真实可显示行数需要 +1。
   * - 如果某个字段正好落在折叠阈值那一行，并且它的 colEnd = rowNum + 1，
   *   说明它顶到了最右边，会把按钮区挤到下一行，所以这个字段也需要在收起时隐藏。
   */
  return (
    item.rowIndex > collapsedRows ||
    (item.rowIndex === collapsedRows && item.colEnd === rowNum + 1)
  );
}

function SearchForm(props: SearchFormProps, ref: Ref<any>) {
  const {
    layout = 'card',
    labelWidth = 100,
    searchLoading = false,
    requiredFields = emptyArray,
    initSearchValues,
    autoSearch = false,
    isDefaultExpand = false,
    minRows = 1,
    layoutConfig,
    collapseConfig,
    style: propStyle,
    className,
    items = [],
    setting = false,
    actions,
    uniqueKey,
    onReset,
    onFieldsChange,
    searchTrigger = 'onSubmit',
    cacheRequiredInit = true,
    resetButtonProps,
    submitButtonProps,
    onSearch,
  } = props;

  const [form] = Form.useForm();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isExpand, setIsExpand] = useState(isDefaultExpand);
  const [isRequiredSatisfied, setIsRequiredSatisfied] = useState(
    !requiredFields.length
  );
  const [initFieldsValue, setInitFieldsValue] = useState<Store>({});
  const [settingItems, setSettingItems] = useState<
    (SettingItem & SearchFormStoreValue)[]
  >(emptyArray);
  const hasCapturedRequiredInitRef = useRef(false);

  // Playgound / SSR 环境下都要容错，避免没有 indexedDB 时直接抛错。
  const canUseIndexedDB =
    typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  const singleColumnExtraRows =
    collapseConfig?.singleColumnExtraRows ?? defaultSingleColumnExtraRows;
  const isSearchBlocked = !isRequiredSatisfied;

  const syncRequiredFieldState = useCallback(
    (
      values: Store,
      options?: {
        captureInit?: boolean;
      }
    ) => {
      const nextSatisfied = isRequiredFieldsSatisfied(values, requiredFields);
      setIsRequiredSatisfied(nextSatisfied);

      if (
        nextSatisfied &&
        cacheRequiredInit &&
        requiredFields.length &&
        options?.captureInit !== false &&
        !hasCapturedRequiredInitRef.current
      ) {
        /**
         * 这里把“首次满足 requiredFields 时的字段值”记成 reset 基线的一部分。
         * 后续即使这些值是异步回填进来的，点重置也能回到真正可用的初始状态。
         */
        setInitFieldsValue((origin) =>
          merge({}, origin, getRequiredFieldsSnapshot(values, requiredFields))
        );
        hasCapturedRequiredInitRef.current = true;
      }

      return nextSatisfied;
    },
    [cacheRequiredInit, requiredFields]
  );

  const onClickSearch = useCallback(() => {
    // 统一走 form.submit，确保点击按钮、快捷键触发、ref.search 走同一条提交流程。
    form.submit();
  }, [form]);

  const onClickExpand = useCallback(() => {
    setIsExpand((origin) => !origin);
  }, []);

  const formKey = useMemo(() => {
    if (setting && !setting.uniqueKey && !uniqueKey) {
      throw new Error(
        'SearchFormV2 requires uniqueKey when field setting is enabled.'
      );
    }

    const pathname =
      typeof window === 'undefined' ? '' : window.location.pathname;
    /**
     * 字段设置属于“页面级偏好”，所以唯一键同时拼上 pathname。
     * 这样即使两个页面都用了同名 uniqueKey，也不会互相污染。
     */
    return `${pathname}:${setting ? setting.uniqueKey : uniqueKey ?? ''}`;
  }, [setting, uniqueKey]);

  const originalSettingItems = useMemo<(SettingItem & SearchFormStoreValue)[]>(
    () => {
      /**
       * 这里生成的是“默认字段配置基线”：
       * - 只为可参与显示/隐藏切换的字段生成记录
       * - hidden 默认一律为 false
       *
       * 真正展示时不会直接使用它，而是会和存储层里用户上一次的选择做 merge。
       */
      if (setting && items.length > 1) {
        return items
          .filter((item) => !item.hidden)
          .map((item) => {
            const key = getItemKey(item);
            return {
              key,
              formKey,
              id: `${formKey}:${key}`,
              label: item.label,
              hidden: false,
            };
          });
      }

      return emptyArray;
    },
    [formKey, items, setting]
  );

  useEffect(() => {
    if (originalSettingItems.length === 0) {
      return;
    }

    if (!canUseIndexedDB) {
      // 环境不支持存储时直接退回默认配置，功能降级但不阻塞使用。
      setSettingItems(originalSettingItems);
      return;
    }

    const run = async () => {
      /**
       * 首次加载 setting 配置时：
       * 1. 先看当前 formKey 下有没有历史数据。
       * 2. 没有就使用默认配置。
       * 3. 有的话按“默认配置为骨架 + 存储 hidden 覆盖”的方式重建一份新数组。
       *
       * 这样做的好处是：
       * - 如果新版本增加了字段，旧缓存不会把新字段丢掉。
       * - 如果字段 label 改了，也始终以当前代码里的最新 label 为准。
       */
      const { get, getAll, close } = await connectStore(formKey);
      const currentItems = await getAll();
      if (currentItems.length === 0) {
        setSettingItems(originalSettingItems);
        close();
        return;
      }

      const nextItems = await Promise.all(
        originalSettingItems.map(async (item) => {
          const stored = await get(item.key);
          return {
            ...item,
            hidden: stored?.hidden ?? false,
          };
        })
      );

      close();
      setSettingItems(nextItems);
    };

    void run();
  }, [canUseIndexedDB, formKey, originalSettingItems]);

  useEffect(() => {
    if (!canUseIndexedDB || settingItems === emptyArray) {
      return;
    }

    const run = async () => {
      /**
       * 这里把 settingItems 视为“单一真实来源”：
       * - UI 面板改的是它
       * - item 合并时读的是它
       * - 持久化时写回的也是它
       *
       * 所以只要 settingItems 变化，就同步写回 IndexedDB。
       */
      const { put, close } = await connectStore(formKey);
      const storeValues: SearchFormStoreValue[] = settingItems.map((item) => ({
        id: item.id,
        formKey: item.formKey,
        key: item.key,
        hidden: item.hidden,
      }));
      await put(storeValues);
      close();
    };

    void run();
  }, [canUseIndexedDB, formKey, settingItems]);

  useEffect(() => {
    /**
     * autoSearch 分两种触发方式：
     * 1. 没有必填项时，只要表单已经处于可搜索状态，就初始化后直接搜一次。
     * 2. 有必填项时，要等 syncRequiredFieldState 判定“当前值已经满足必填条件”后再搜。
     *
     * 这里用 setTimeout 是为了把 submit 延后到当前渲染/赋值流程之后，
     * 避免刚 setFieldsValue 完就 submit 导致拿到旧值。
     */
    if (!autoSearch || !isRequiredSatisfied) {
      return;
    }

    if (!requiredFields.length) {
      window.setTimeout(onClickSearch);
      return;
    }

    if (searchTrigger === 'onSubmit') {
      window.setTimeout(onClickSearch);
    }
  }, [
    autoSearch,
    isRequiredSatisfied,
    onClickSearch,
    requiredFields.length,
    searchTrigger,
  ]);

  const searchDisabledByValueChange = useMemo(
    () =>
      debounce((allValues: Store, isAllowed?: boolean) => {
        /**
         * onChange 模式会在每次值变化时都进入这里。
         * 所以必须防抖，否则输入框每敲一个字都触发一次查询。
         *
         * requiredFields 依然要在这里再判断一次，
         * 因为 onChange 模式下“允许自动搜”与“是否满足必填条件”是同时存在的约束。
         */
        const nextAllowed =
          isAllowed ?? isRequiredFieldsSatisfied(allValues, requiredFields);
        if (nextAllowed) {
          window.setTimeout(onClickSearch);
        }
      }, 300),
    [onClickSearch, requiredFields]
  );

  useEffect(() => {
    hasCapturedRequiredInitRef.current = false;
  }, [initSearchValues, requiredFields]);

  useEffect(() => {
    return () => {
      searchDisabledByValueChange.cancel();
    };
  }, [searchDisabledByValueChange]);

  const onClickReset = useCallback(() => {
    /**
     * 这里不用 form.resetFields()，而是显式 setFieldsValue。
     *
     * 原因是 resetFields 会把整棵 Form.Item 子树回退到“组件初始化时”的状态，
     * 对一些有内部生命周期的复杂控件不够温和。这里更偏向“把值重置回我们维护的初始值快照”。
     */
    const nextValues = {
      ...initFieldsValue,
    };
    form.setFieldsValue(nextValues);
    const isAllowed = syncRequiredFieldState(nextValues, {
      captureInit: false,
    });
    if (searchTrigger === 'onChange') {
      searchDisabledByValueChange(nextValues, isAllowed);
    }
    onReset?.(nextValues);
  }, [
    form,
    initFieldsValue,
    onReset,
    searchDisabledByValueChange,
    searchTrigger,
    syncRequiredFieldState,
  ]);

  useImperativeHandle<any, SearchFormRef>(ref, () => ({
    // 暴露给外部的 ref API 都复用内部现成逻辑，避免出现两套行为不一致。
    search: () => {
      window.setTimeout(onClickSearch);
    },
    reset: () => {
      onClickReset();
    },
    setPartialFieldsValue: (value: Store) => {
      form.setFieldsValue(value);
      const allValues = form.getFieldsValue(true);
      syncRequiredFieldState(allValues);
    },
    setFields: (fields: FieldData[]) => {
      form.setFields(fields);
      const allValues = form.getFieldsValue(true);
      syncRequiredFieldState(allValues);
    },
    getFieldsValue: form.getFieldsValue,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    // 保留原组件的快捷键能力：Shift + F 切换展开/收起。
    const onPressExpandShortcut = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'KeyF') {
        onClickExpand();
      }
    };

    window.addEventListener('keypress', onPressExpandShortcut);
    return () => {
      window.removeEventListener('keypress', onPressExpandShortcut);
    };
  }, [onClickExpand]);

  const allItems = useMemo<SearchFormItemProps[]>(() => {
    if (!items.length) {
      return emptyArray;
    }

    return items.map((item) => {
      if (setting) {
        /**
         * 这一步是“设置层”到“布局层”的桥梁：
         * settingItems 只保存 key/hidden 这些偏好信息，
         * 这里把 hidden 回写到完整的 item 配置中，FieldGrid 才知道哪些字段该隐藏。
         */
        const settingItem = settingItems.find(
          (current) => current.key === getItemKey(item)
        );
        if (settingItem) {
          return {
            ...item,
            hidden: settingItem.hidden ?? item.hidden ?? false,
          };
        }
      }

      return item;
    });
  }, [items, setting, settingItems]);

  const { rowNum, renderGrid, items: gridItems } = FieldGridV2.useFieldGrid({
    containerRef,
    items: allItems,
    labelWidth,
    colon: false,
    layoutConfig,
  });

  useEffect(() => {
    if (!rowNum) {
      return;
    }

    /**
     * 初始值收集放在这里，而不是组件一进来就做，有两个原因：
     * 1. rowNum=0 时 Grid 还没真正渲染字段，Form.Item 可能还没挂载完全。
     * 2. SearchForm 的很多行为依赖“当前真正存在于表单里的值”，而不是 props 里的理论初始值。
     *
     * 所以等布局稳定后再收集一次会更可靠。
     */
    const values = {
      ...form.getFieldsValue(),
      ...initSearchValues,
    };
    setInitFieldsValue(values);
    syncRequiredFieldState(values);
  }, [form, initSearchValues, rowNum, syncRequiredFieldState]);

  const hasCollapsedItems = useMemo(
    /**
     * 只要有任何字段会在收起时被隐藏，就显示“展开/收起”按钮。
     * 这样按钮的存在与否直接由布局结果决定，而不是由 item 数量硬编码决定。
     */
    () =>
      gridItems.some((item) =>
        shouldHideCollapsedItem(item, rowNum, minRows, singleColumnExtraRows)
      ),
    [gridItems, minRows, rowNum, singleColumnExtraRows]
  );

  const renderedGridItems = useMemo(
    () =>
      gridItems.map((item) => ({
        ...item,
        className: cs(item.className, {
          /**
           * 这里非常重要：折叠时只做 display:none，不从 items 里删除字段。
           *
           * 如果直接删掉字段：
           * - Form 里的值可能被卸载
           * - 用户展开回来后，输入状态可能丢失
           * - 某些复杂控件会因为反复挂载出现额外副作用
           *
         * 所以这里选择“保留字段节点，只隐藏视觉表现”。
         */
          [styles.collapsedItemHidden]:
            !isExpand &&
            shouldHideCollapsedItem(
              item,
              rowNum,
              minRows,
              singleColumnExtraRows
            ),
        }),
      })),
    [gridItems, isExpand, minRows, rowNum, singleColumnExtraRows]
  );

  const renderForm = () => (
    <div style={propStyle} className={cs(styles.root, className)}>
      <Form
        preserve
        layout="inline"
        colon={false}
        form={form}
        initialValues={initSearchValues}
        labelCol={{
          flex: `0 0 ${
            typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth
          }`,
        }}
        wrapperCol={{
          flex: 1,
        }}
        onFinish={() => {
          /**
           * 统一在 submit 出口做一次 trim：
           * - 用户输入时不打扰
           * - 外部拿到的搜索参数更干净
           * - 行为和旧组件保持一致
           */
          const values = form.getFieldsValue(true);
          if (
            searchLoading ||
            !isRequiredFieldsSatisfied(values, requiredFields)
          ) {
            return;
          }

          const searchParams = trimStringField(values, false);
          onSearch(searchParams);
        }}
        onValuesChange={(_, allValues) => {
          /**
           * 值变化时有两条逻辑同时发生：
           * 1. 更新“必填条件是否已满足”这件事。
           * 2. 如果 searchTrigger=onChange，则进入防抖自动搜索。
           *
           * 这两条逻辑拆开看更容易理解：
           * - syncRequiredFieldState 负责按当前值实时开闸
           * - searchDisabledByValueChange 负责真正执行 onChange 搜索
           */
          const isAllowed = syncRequiredFieldState(allValues);
          if (searchTrigger === 'onChange') {
            searchDisabledByValueChange(allValues, isAllowed);
          }
        }}
        onFieldsChange={onFieldsChange}
      >
        <div className={styles.container}>
          {renderGrid({
            items: renderedGridItems,
            extra: rowNum > 0 ? (
              /**
               * 按钮区不是单独写在 Grid 外面，而是作为一个额外的 grid item 插进去。
               * 这样有几个好处：
               * - 它会自动跟随列数变化一起重排
               * - 当字段换行时，按钮区能自然落在网格最后
               * - SearchForm 不需要再维护第二套“按钮区定位算法”
               */
              <div className={styles.buttonCell}>
                <div className={styles.buttonInner}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    {...submitButtonProps}
                    disabled={isSearchBlocked || submitButtonProps?.disabled}
                    loading={searchLoading}
                  >
                    查询
                  </Button>
                  <Button onClick={onClickReset} {...resetButtonProps}>
                    重置
                  </Button>
                  {(items.length > 0 ? actions : undefined) ?? null}
                  {items.length > 0 && setting && (
                    <SettingPanel
                      value={settingItems}
                      onChange={setSettingItems}
                      onReset={() => setSettingItems(originalSettingItems)}
                      triggerClassName={styles.settingTrigger}
                    />
                  )}
                  {hasCollapsedItems && (
                    // 只有真的存在“被折叠掉的字段”时才显示展开按钮，避免空按钮干扰。
                    <Button
                      type="link"
                      onClick={onClickExpand}
                      className={cs(styles.expandButton, {
                        [styles.expandButtonExpanded]: isExpand,
                      })}
                    >
                      {isExpand ? '收起' : '展开'}
                      <span className={styles.expandIcon}>v</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : null,
          })}
        </div>
      </Form>
    </div>
  );

  if (layout === 'card') {
    // layout='card' 只是一个外层包装差异，核心表单结构始终复用 renderForm。
    return <Card className={styles.layoutCard}>{renderForm()}</Card>;
  }

  return renderForm();
}

export default SearchForm;
export type { SearchFormProps };

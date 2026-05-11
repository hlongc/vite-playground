import type { ObjectType, SearchTableProps } from './interface';
import useSearchTable from './useSearchTable';

type SearchTableRuntimeProps<
  ValueType extends ObjectType,
  Condition,
  ResExtra,
> = SearchTableProps<ValueType, Condition, ResExtra> & {
  manual?: boolean;
};

export default function SearchTable<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
>(props: SearchTableProps<ValueType, Condition, ResExtra>) {
  const { manual: _manual, ...restProps } = props as SearchTableRuntimeProps<
    ValueType,
    Condition,
    ResExtra
  >;
  const { render } = useSearchTable({
    ...restProps,
    manual: false,
  });
  return render;
}

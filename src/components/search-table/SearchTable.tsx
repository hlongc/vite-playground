import type { ObjectType, SearchTableProps } from './interface';
import useSearchTable from './useSearchTable';

export default function SearchTable<
  ValueType extends ObjectType,
  Condition = unknown,
  ResExtra = unknown,
>(props: SearchTableProps<ValueType, Condition, ResExtra>) {
  const { render } = useSearchTable(props);
  return render;
}

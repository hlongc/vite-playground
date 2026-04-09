import { forwardRef } from 'react';
import type { MutableRefObject, ReactElement } from 'react';

import SearchForm from './SearchForm';
import type { SearchFormProps } from './SearchForm';

const SearchFormWrapper = forwardRef(SearchForm) as unknown as ((
  props: SearchFormProps & {
    ref?: MutableRefObject<any>;
  }
) => ReactElement);

export default SearchFormWrapper;
export type { SearchFormProps };

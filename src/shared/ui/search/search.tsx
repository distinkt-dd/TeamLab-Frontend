import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../button';
import { Input } from '../input';
import { Icon } from '@shared/icons';
import styles from './search.module.css';

export type SearchCatalog = 'projects' | 'participants';

interface SearchProps {
  onSearch: (value: string) => void;
  catalog: SearchCatalog;
  onCatalogChange: (catalog: SearchCatalog) => void;
  initialValue?: string;
  popularSuggestions?: string[];
  suggestions?: string[];
  maxSuggestions?: number;
  className?: string;
  id?: string;
  overlay?: boolean;
}

export const Search = ({
  onSearch,
  catalog,
  onCatalogChange,
  initialValue = '',
  popularSuggestions,
  suggestions,
  maxSuggestions = 5,
  className,
  id,
  overlay = false,
}: SearchProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialValue);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedInput = inputValue.trim();
  const visiblePopularSuggestions = useMemo(
    () =>
      normalizedInput
        ? []
        : Array.from(new Set(popularSuggestions ?? [])).slice(
            0,
            maxSuggestions
          ),
    [maxSuggestions, normalizedInput, popularSuggestions]
  );
  const filteredSuggestions = useMemo(() => {
    if (!normalizedInput) return [];

    const query = normalizedInput.toLocaleLowerCase('ru-RU');
    const uniqueSuggestions = new Map<string, string>();

    for (const suggestion of suggestions ?? []) {
      const normalizedSuggestion = suggestion.trim();
      const key = normalizedSuggestion.toLocaleLowerCase('ru-RU');
      if (
        normalizedSuggestion &&
        key.includes(query) &&
        !uniqueSuggestions.has(key)
      ) {
        uniqueSuggestions.set(key, normalizedSuggestion);
      }
    }

    return Array.from(uniqueSuggestions.values()).slice(0, maxSuggestions);
  }, [maxSuggestions, normalizedInput, suggestions]);
  const selectableItems = normalizedInput
    ? [...filteredSuggestions, normalizedInput]
    : visiblePopularSuggestions;
  const searchAllLabel =
    catalog === 'projects' ? 'во всех проектах' : 'среди участников';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        if (overlay) setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [overlay]);

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('li');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex]);

  const getActiveDescendantId = (): string | undefined => {
    if (highlightedIndex < 0) return undefined;

    return selectableItems[highlightedIndex]
      ? `search-option-${highlightedIndex}`
      : undefined;
  };

  const handleOpenSearch = () => {
    const nextIsOpen = !isSearchOpen;
    setIsSearchOpen(nextIsOpen);
    setShowDropdown(nextIsOpen);
    if (nextIsOpen) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setHighlightedIndex(-1);
    setShowDropdown(true);
  };

  const submitSearch = (valueToSearch: string) => {
    const normalizedValue = valueToSearch.trim();
    if (!normalizedValue) return;

    setInputValue(normalizedValue);
    onSearch(normalizedValue);
    setIsSearchOpen(false);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: string) =>
    submitSearch(suggestion);

  const handleClearInput = () => {
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(inputValue);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = selectableItems.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(
          (prev) => (prev < totalItems - 1 ? prev + 1 : prev) // не меняем, если последний
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1)); // -1 — нет выделения
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          event.preventDefault();
          const selectedItem = selectableItems[highlightedIndex];
          if (selectedItem) handleSuggestionClick(selectedItem);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div
      id={id}
      ref={containerRef}
      className={`${styles.container} ${overlay ? styles.overlay : ''} ${className || ''}`}
    >
      {(!isSearchOpen || overlay) && (
        <Button
          variant="search"
          onClick={handleOpenSearch}
          aria-expanded={isSearchOpen}
        >
          Поиск
        </Button>
      )}
      {isSearchOpen && (
        <form className={styles.searchWrapper} onSubmit={handleSubmit}>
          <div
            className={styles.catalogSwitch}
            role="group"
            aria-label="Каталог поиска"
          >
            {(
              [
                ['projects', 'Проекты'],
                ['participants', 'Участники'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.catalogButton} ${
                  catalog === value ? styles.catalogButtonActive : ''
                }`}
                aria-pressed={catalog === value}
                onClick={() => onCatalogChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.searchControls}>
            <div className={styles.iconWrapper}>
              <Icon name="search" />
            </div>
            <Input
              ref={inputRef}
              aria-label="Поисковый запрос"
              className={styles.input}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleInputKeyDown}
              aria-haspopup="listbox"
              aria-owns="search-dropdown"
              aria-activedescendant={getActiveDescendantId()}
              aria-autocomplete="list"
            />
            <button
              type="button"
              className={`${styles.iconWrapper} ${styles.iconCloseWrapper}`}
              aria-label="Очистить поле поиска"
              onClick={handleClearInput}
            >
              <Icon name="close" />
            </button>
            <Button
              type="submit"
              variant="secondary"
              className={styles.button}
            >
              Найти
            </Button>
          </div>
          {showDropdown &&
            selectableItems.length > 0 && (
              <div
                className={styles.dropdown}
                ref={dropdownRef}
                id="search-dropdown"
                role="listbox"
                aria-label="Результаты поиска"
                aria-live="polite"
              >
                {visiblePopularSuggestions.length > 0 && (
                  <ul
                    className={`${styles.suggestions} ${styles['suggestions--no-border']}`}
                  >
                    {visiblePopularSuggestions.map((suggestion, index) => (
                      <li
                        id={`search-option-${index}`}
                        key={`popular-${suggestion}`}
                        className={`${styles.dropdownItem} ${styles.suggestionItem} ${
                          highlightedIndex === index ? styles.highlighted : ''
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        role="option"
                        aria-selected={highlightedIndex === index}
                        tabIndex={-1}
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
                {normalizedInput && (
                  <ul>
                    {filteredSuggestions.map((suggestion, index) => (
                      <li
                        id={`search-option-${index}`}
                        key={`suggestion-${suggestion}`}
                        className={`${styles.dropdownItem} ${
                          highlightedIndex === index ? styles.highlighted : ''
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        role="option"
                        aria-selected={highlightedIndex === index}
                        tabIndex={-1}
                      >
                        {suggestion}
                      </li>
                    ))}
                    <li
                      id={`search-option-${filteredSuggestions.length}`}
                      className={`${styles.dropdownItem} ${styles.searchAllItem} ${
                        highlightedIndex === filteredSuggestions.length
                          ? styles.highlighted
                          : ''
                      }`}
                      onClick={() => handleSuggestionClick(normalizedInput)}
                      role="option"
                      aria-selected={
                        highlightedIndex === filteredSuggestions.length
                      }
                      tabIndex={-1}
                    >
                      Искать «{normalizedInput}» {searchAllLabel}
                    </li>
                  </ul>
                )}
              </div>
            )}
        </form>
      )}
    </div>
  );
};

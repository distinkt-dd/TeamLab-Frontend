import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../button';
import { Input } from '../input';
import { Icon } from '@shared/icons';
import styles from './search.module.css';

interface SearchProps {
  onSearch: (value: string) => void;
  suggestions?: string[];
  searchHistory?: string[];
  maxSuggestions?: number;
  className?: string;
  id?: string;
}

export const Search = ({
  onSearch,
  suggestions,
  searchHistory,
  maxSuggestions = 5,
  className,
  id,
}: SearchProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(() => {
    return (suggestions || [])
      .filter((s) => s.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, maxSuggestions);
  }, [inputValue, suggestions, maxSuggestions]);

  const filteredHistory = useMemo(() => {
    return (searchHistory || [])
      .filter((historyItem) =>
        historyItem.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, maxSuggestions);
  }, [inputValue, searchHistory, maxSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    if (highlightedIndex < filteredSuggestions.length) {
      const suggestion = filteredSuggestions[highlightedIndex];
      if (!suggestion) return undefined;
      return `suggestion-${highlightedIndex}-${suggestion.replace(/\s+/g, '-')}`;
    } else {
      const historyIndex = highlightedIndex - filteredSuggestions.length;
      const historyItem = filteredHistory[historyIndex];
      if (!historyItem) return undefined;
      return `history-${historyIndex}-${historyItem.replace(/\s+/g, '-')}`;
    }
  };

  const handleOpenSearch = () => setIsSearchOpen(true);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setHighlightedIndex(-1);
    setShowDropdown(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    setShowDropdown(false);
  };

  const handleClearInput = () => {
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    onSearch(inputValue);
    setIsSearchOpen(false);
    setInputValue('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = filteredSuggestions.length + filteredHistory.length;

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
          const allItems = [...filteredSuggestions, ...filteredHistory];
          handleSuggestionClick(allItems[highlightedIndex]);
          setShowDropdown(false);
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
      className={`${styles.container} ${className || ''}`}
    >
      {!isSearchOpen ? (
        <Button variant="search" onClick={handleOpenSearch}>
          Поиск
        </Button>
      ) : (
        <div className={styles.searchWrapper}>
          <div className={styles.iconWrapper}>
            <Icon name="search" />
          </div>
          <Input
            ref={inputRef}
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
            variant="secondary"
            className={styles.button}
            onClick={handleSearch}
          >
            Найти
          </Button>
          {showDropdown &&
            (filteredSuggestions.length > 0 || filteredHistory.length > 0) && (
              <div
                className={styles.dropdown}
                ref={dropdownRef}
                id="search-dropdown"
                role="listbox"
                aria-label="Результаты поиска"
                aria-live="polite"
              >
                {filteredSuggestions.length > 0 && (
                  <ul
                    className={`${styles.suggestions} ${
                      filteredHistory.length === 0
                        ? styles['suggestions--no-border']
                        : ''
                    }`}
                  >
                    {filteredSuggestions.map((suggestion, index) => {
                      const suggestionId = `suggestion-${index}-${suggestion.replace(/\s+/g, '-')}`;

                      return (
                        <li
                          id={suggestionId}
                          key={`suggestion-${suggestion}`}
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
                      );
                    })}
                  </ul>
                )}
                {filteredHistory.length > 0 && (
                  <ul>
                    {filteredHistory.map((historyItem, index) => {
                      const historyId = `history-${index}-${historyItem.replace(/\s+/g, '-')}`;

                      return (
                        <li
                          id={historyId}
                          key={`history-${historyItem}`}
                          className={`${styles.dropdownItem} ${
                            highlightedIndex ===
                            index + filteredSuggestions.length
                              ? styles.highlighted
                              : ''
                          }`}
                          onClick={() => handleSuggestionClick(historyItem)}
                          role="option"
                          aria-selected={
                            highlightedIndex ===
                            index + filteredSuggestions.length
                          }
                          tabIndex={-1}
                        >
                          {historyItem}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

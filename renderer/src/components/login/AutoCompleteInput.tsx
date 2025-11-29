import { useState, useRef, useEffect } from 'react';

interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  onSelect?: (value: string) => void;
  type?: 'text' | 'email' | 'password';
}

export function AutoCompleteInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  suggestions,
  onSelect,
  type = 'text',
}: AutoCompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && value.length > 0);
    setSelectedIndex(-1);
  }, [suggestions, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && value.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // 延迟隐藏，以便点击建议项时能触发
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(suggestion);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (onKeyDown) {
        onKeyDown(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        } else if (onKeyDown) {
          onKeyDown(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        if (onKeyDown) {
          onKeyDown(e);
        }
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type={type}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={`w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition ${
                index === selectedIndex ? 'bg-slate-100' : ''
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


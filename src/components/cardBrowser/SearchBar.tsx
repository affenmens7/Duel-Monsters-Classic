import styles from './SearchBar.module.css';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  resultCount: number;
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alle Typen' },
  { value: 'normal', label: 'Normal Monster' },
  { value: 'effect', label: 'Effekt Monster' },
  { value: 'ritual', label: 'Ritual Monster' },
  { value: 'fusion', label: 'Fusion Monster' },
  { value: 'spell', label: 'Zauberkarten' },
  { value: 'trap', label: 'Fallenkarten' },
];

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  resultCount,
}: SearchBarProps) {
  return (
    <div className={styles.searchBar}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Karte suchen... (z.B. Blue-Eyes, Dark Magician)"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      <select
        className={styles.typeSelect}
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span className={styles.resultCount}>
        {resultCount} Karten
      </span>
    </div>
  );
}

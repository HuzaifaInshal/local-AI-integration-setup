export function extractSQL(text: string): string | null {
  const match = text.match(/```sql([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  const cleanText = text.trim();
  if (cleanText.toUpperCase().startsWith("SELECT") || cleanText.toUpperCase().startsWith("WITH")) {
    return cleanText;
  }
  
  return null;
}

export function isSafeQuery(sql: string): boolean {
  const upper = sql.toUpperCase().trim();
  
  // Enforce SELECT / WITH queries only
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return false;
  }
  
  // Blacklist words representing write actions, admin manipulations, DDL commands
  const blacklistedKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", 
    "RENAME", "GRANT", "REVOKE", "VACUUM", "COPY", "ANALYZE"
  ];
  
  for (const word of blacklistedKeywords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }
  
  return true;
}

export function enforceLimit(sql: string): string {
  const upper = sql.toUpperCase().trim();
  if (!upper.includes("LIMIT")) {
    let clean = sql.trim();
    if (clean.endsWith(";")) {
      clean = clean.slice(0, -1);
    }
    return `${clean} LIMIT 50;`;
  }
  return sql;
}

# Concise SQL Formatter

SQL queries formatted in a **concise** yet **readable** manner!

Have you tried different SQL formatters yet aren't completely satisfied with the formatting style? Do you complain about
- Unnecessary new lines for items in `GROUP BY` and `LIMIT` statements
- Inconsistent indentation for `JOIN`s and `ON` conditions
- Built-in functions and data types are not capitalized

If your answer is yes, then this extension may be just right for you.

This extension uses a forked version of [sql-formatter-plus](https://github.com/kufii/sql-formatter-plus) as formatting provider.

# What's Different?

## Common SQL Formatters
![Others](images/others-formatting-results.gif)
## Concise SQL Formatter
![Concise](images/concise-formatting-results.gif)

## Extension Settings

| Setting | Description |
| ----------------------------------| ----------------------------------- |
| **`concise-sql-formatter.dialect`** | Used SQL dialect (`sql`: Standard SQL, `n1ql`: Couchbase N1QL, `db2`: IBM DB2, `pl/sql`: Oracle PL/SQL). (Default: `sql`)
| **`concise-sql-formatter.uppercase`** | Convert keywords to uppercase. (Default: `true`) |
| **`concise-sql-formatter.linesBetweenQueries`** | Number of lines between different queries. (Default: `2`) |

## Release Notes

### 0.0.1

Initial release of concise-sql-formatter. Good luck out there🤞

-----------------------------------------------------------------------------------------------------------
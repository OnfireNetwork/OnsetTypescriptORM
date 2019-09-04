/** @noSelfInFile */

class Table<T> {
    private columns = new Map<string, ColumnType>();

    constructor(private con: MariaDB.Connection, private tableName: string) {
        this.con.queryAsync("SHOW COLUMNS FROM ?", (result) => {
            while (result.next()) {
                let type = this.getColumnType(result.getString("Type"));
                if (type !== undefined)
                    this.columns.set(result.getString("Field"), type);
            }
        }, this.tableName);
    }

    get(query: string, out: (out: T[]) => void, ...values: any[]) {
        this.con.queryAsync(query, (result) => {
            let entries: T[] = [];

            while (result.next()) {
                let entry: { [key: string]: any; } = {};
                this.columns.forEach((value, key) => {
                    if (value == ColumnType.STRING) {
                        entry[key] = result.getString(key);
                    } else if (value == ColumnType.INT) {
                        entry[key] = result.getInt(key);
                    } else if (value == ColumnType.FLOAT) {
                        entry[key] = result.getFloat(key);
                    }
                });

                entries.push(entry as T);
            }

            out(entries);
        }, values);
    }

    private getColumnType(input: string): ColumnType | undefined {
        input = input.toLowerCase();
        if (input.startsWith("int")) {
            return ColumnType.INT;
        } else if (input.startsWith("varchar")) {
            return ColumnType.STRING;
        } else if (input.startsWith("float")) {
            return ColumnType.FLOAT;
        }
    }
}

enum ColumnType {
    STRING,
    INT,
    FLOAT
}
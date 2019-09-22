/** @noSelfInFile */

class Table<T> {
    private columns = new Map<string, ColumnType>();
    private idColumn = "id";
    private autoIncrement = true;
    constructor(private con: MariaDB.Connection, private tableName: string) {
        this.con.queryAsync("SHOW COLUMNS FROM `"+tableName+"`;", (result) => {
            while (result.next()) {
                let type = this.getColumnType(result.getString("Type"));
                if (type !== undefined)
                    this.columns.set(result.getString("Field"), type);
            }
        }, []);
    }
    public getConnection(): MariaDB.Connection {
        return this.con;
    }
    public getTableName(): string {
        return this.tableName;
    }
    public setIdColumn(column: string): Table<T> {
        this.idColumn = column;
        return this;
    }
    public setAutoIncrement(autoIncrement: boolean): Table<T> {
        this.autoIncrement = autoIncrement;
        return this;
    }
    public get(filter: string, callback: (objects: T[]) => void, ...values: any[]): void {
        this.con.queryAsync("SELECT * FROM `"+this.tableName+"` "+filter+';',result=>{callback(this.resultToArray(result));},values);
    }
    public getSync(filter: string, ...values: any[]): T[] {
        let result = this.con.querySync("SELECT * FROM `"+this.tableName+"` "+filter+';', values);
        let entries = this.resultToArray(result);
        result.close();
        return entries;
    }
    public update(object: T, callback?: (object: T) => void) {
        let prepared = this.prepareUpdate(object);
        this.con.queryAsync(prepared[0],result=>{if(callback !== undefined){callback(object);}},prepared[1]);
    }
    public updateSync(object: T): T {
        let prepared = this.prepareUpdate(object);
        this.con.querySync(prepared[0],prepared[1]);
        return object;
    }
    public insert(object: T, callback: (object: T) => void): void {
        let indexObject = object as {[key: string]: any};
        let prepared = this.prepareInsert(indexObject);
        this.con.queryAsync(prepared[0],result=>{
            indexObject[this.idColumn] = result.getInsertId();
            callback(indexObject as T);
        },prepared[1]);
    }
    public insertSync(object: T): T {
        let indexObject = object as {[key: string]: any};
        let prepared = this.prepareInsert(indexObject);
        let result = this.con.querySync(prepared[0],prepared[1]);
        indexObject[this.idColumn] = result.getInsertId();
        return indexObject as T;
    }
    public delete(object: T, callback?: () => void): void {
        let indexObject = object as {[key: string]: any};
        this.con.queryAsync('DELETE FROM `'+this.tableName+'` WHERE `'+this.idColumn+'`=\'?\';',result=>{if(callback !== undefined){callback();}},indexObject[this.idColumn]);
    }
    public deleteSync(object: T): void {
        let indexObject = object as {[key: string]: any};
        this.con.querySync('DELETE FROM `'+this.tableName+'` WHERE `'+this.idColumn+'`=\'?\';',indexObject[this.idColumn]);
    }
    private getColumnType(input: string): ColumnType | undefined {
        input = input.toLowerCase();
        if (input.startsWith("int") || input.startsWith("bigint")) {
            return ColumnType.INT;
        } else if (input.startsWith("varchar") || input.startsWith("text") || input.startsWith("enum")) {
            return ColumnType.STRING;
        } else if (input.startsWith("float") || input.startsWith("double")) {
            return ColumnType.FLOAT;
        }
    }
    private resultToArray(result: MariaDB.ResultSet): T[] {
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
        return entries;
    }
    private prepareUpdate(object: T): [string, any[]] {
        let indexObject = object as {[key: string]: any};
        let values: any[] = [];
        let query = '';
        this.columns.forEach((value, key) => {
            if(key !== this.idColumn && indexObject[key] !== undefined){
                if(query.length > 0){
                    query+=',';
                }
                if(indexObject[key] === null){
                    query+='`'+key+'`=NULL';
                }else{
                    query+='`'+key+'`=\'?\'';
                    values.push(indexObject[key]);
                }
            }
        });
        query = 'UPDATE `'+this.tableName+'` SET ' + query + ' WHERE `'+this.idColumn+'`=\'?\';';
        values.push(indexObject[this.idColumn]);
        return [query,values];
    }
    private prepareInsert(indexObject: {[key: string]: any}): [string,any[]] {
        let values: any[] = [];
        let query = '';
        let valueQuery = '';
        this.columns.forEach((value, key) => {
            if(this.autoIncrement && key === this.idColumn){
                return;
            }
            if(indexObject[key] !== undefined){
                if(query.length > 0){
                    query+=',';
                    valueQuery+=',';
                }
                query+='`'+key+'`';
                if(indexObject[key] === null){
                    valueQuery+='NULL';
                }else{
                    valueQuery+='\'?\'';
                    values.push(indexObject[key]);
                }
            }
        });
        query = 'INSERT INTO `'+this.tableName+'` (' + query + ') VALUES ('+valueQuery+');';
        return [query,values];
    }
}

enum ColumnType {
    STRING,
    INT,
    FLOAT
}
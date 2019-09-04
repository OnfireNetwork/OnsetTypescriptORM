# OnsetTypescriptORM

Onset MariaDB ORM in Typescript

## Installation
```
npm install @onfire-network/onset-typescript-orm --save
```

## Example
```typescript
interface User {
    id: number;
    name: string;
    steam_id: string;
}
let conn = new MariaDB.Connection("localhost", "myuser", "changeme123", "mydatabase");
let usersTable = new Table<User>(conn, "users");
usersTable.get("SELECT * FROM users", users => {
    users.forEach(user => {
        Server.broadcast(user.name);
    });
});
conn.close();
```
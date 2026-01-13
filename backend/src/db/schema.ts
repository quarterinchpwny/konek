
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const serverHosts = sqliteTable('server_hosts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  alias: text('alias').notNull(),
  hostname: text('hostname').notNull().unique(),
  port: integer('port').default(22),
  username: text('username').notNull(),
  password: text('password'), // Made optional
  macAddress: text('mac_address'),
  sshEnabled: integer('ssh_enabled').notNull().default(1),
});

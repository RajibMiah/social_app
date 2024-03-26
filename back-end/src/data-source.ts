import path from "path";
import { DataSource } from "typeorm";

const AppDataSource = new DataSource({
  type: (process.env.DATABASE_TYPE as any) || "postgres",
  host: process.env.DATABASE_SERVER_HOST || "localhost",
  port: parseInt(process.env.DATABASE_SERVER_PORT || "5000"),
  username: process.env.DATABASE_USERNAME || "postgres",
  password: process.env.DATABASE_SERVER_PASSWORD || "admin",
  database: process.env.DATABASE_NAME || "social_app",
  synchronize: true,
  logging: true,
  entities: [path.join(__dirname, "entities", "*.{ts,js}")],
  migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
  migrationsTableName: "custom_migration_table",
});

export default AppDataSource;

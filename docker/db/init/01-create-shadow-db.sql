-- PostgreSQL Shadow Database Creation
-- Note: The primary database 'gestion_del_fin' is created by POSTGRES_DB env variable
-- This creates the shadow database for Prisma migrations
CREATE DATABASE gestion_del_fin_shadow;
GRANT ALL PRIVILEGES ON DATABASE gestion_del_fin_shadow TO gestion_user;
-- PostgreSQL doesn't require FLUSH PRIVILEGES; changes take effect immediately



-- Grants CREATE/DROP globally so Prisma can manage the shadow database
-- Only needed in local dev — never do this in production
GRANT CREATE, DROP ON *.* TO 'admin'@'%';
FLUSH PRIVILEGES;

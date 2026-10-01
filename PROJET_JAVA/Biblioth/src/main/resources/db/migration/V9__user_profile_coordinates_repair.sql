-- V5 était un no-op qui supposait ces colonnes déjà présentes :
-- sur une base fraîche, la validation Hibernate échouait
-- (missing column [address] in table [users]).
-- IF NOT EXISTS : sans effet sur les bases qui les ont déjà.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);

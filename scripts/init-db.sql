-- Script d'initialisation de la base de données
-- 🚨 ATTENTION : Ce script contient des données vulnérables à des fins pédagogiques

-- Créer la table users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer un utilisateur applicatif (moindre privilège)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password_change_me';
  END IF;
END $$;

-- Insérer des utilisateurs de test
-- Passwords hashed with bcrypt (12 rounds)
INSERT INTO users (username, password, email, role) VALUES
    ('admin', '$2b$12$TRAXlm6ap.bRe.k9F6uR8.LJy4/TVFapEqt0RvXHUpZmVsFtMs8TK', 'admin@example.com', 'admin'),
    ('user', '$2b$12$1n1iwuNknenA52fipM88w./0/I9PU34/EZdezi4tRPsA0yqooaSxa', 'user@example.com', 'user'),
    ('alice', '$2b$12$c/kx/gOcagUfu19gpznIv.iLmizdpnBYztP1UEt5UjV2PPMf9uVxC', 'alice@example.com', 'user')
ON CONFLICT (username) DO NOTHING;

-- Droits minimaux : la table users est accessible en lecture/écriture limitée.
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE users TO app_user;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO app_user;

-- Afficher les utilisateurs créés
SELECT id, username, email, role FROM users;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS repositories;

CREATE TABLE repositories (
    repository_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    github_url TEXT NOT NULL UNIQUE,

    owner VARCHAR(255) NOT NULL,

    repository_name VARCHAR(255) NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
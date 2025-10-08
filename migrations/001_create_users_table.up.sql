CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    password TEXT NOT NULL,
    email VARCHAR(255) UNIQUE,
    email_verified_at TIMESTAMP NULL,
    email_verification_code VARCHAR(6) NULL,
    email_verification_expires_at TIMESTAMP NULL,
    document_front_url VARCHAR(1024) NULL,
    document_back_url VARCHAR(1024) NULL,
    document_selfie_url VARCHAR(1024) NULL,
    documents_submitted_at TIMESTAMP NULL,
    documents_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

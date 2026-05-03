-- ============================================================
-- Estatery — Database Schema (PostgreSQL)
-- Based on db-structure.pdf
-- ============================================================

-- ---------- cities ----------
CREATE TABLE cities (
    id              SERIAL PRIMARY KEY,
    city_name       VARCHAR(150) NOT NULL,
    country         VARCHAR(150),
    status          SMALLINT NOT NULL DEFAULT 1,
    date_added      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- developers ----------
CREATE TABLE developers (
    id                    SERIAL PRIMARY KEY,
    developer_name        VARCHAR(255) NOT NULL,
    developer_description TEXT,
    status                SMALLINT NOT NULL DEFAULT 1,
    date_added            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- communities ----------
-- Parent communities have community_name set, parent_community_id NULL.
-- Subcommunities have community_name NULL, subcommunity_name set,
-- and parent_community_id pointing to a parent row.
CREATE TABLE communities (
    id                  SERIAL PRIMARY KEY,
    community_name      VARCHAR(255),
    subcommunity_name   VARCHAR(255),
    parent_community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    developer_name      VARCHAR(255),
    developer_id        INT REFERENCES developers(id) ON DELETE SET NULL,
    city_id             INT REFERENCES cities(id) ON DELETE SET NULL,
    status              SMALLINT NOT NULL DEFAULT 1,
    date_added          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_communities_parent ON communities(parent_community_id);
CREATE INDEX idx_communities_city   ON communities(city_id);

-- ---------- agencies ----------
CREATE TABLE agencies (
    id          SERIAL PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    address     VARCHAR(500),
    city_id     INT REFERENCES cities(id) ON DELETE SET NULL,
    status      SMALLINT NOT NULL DEFAULT 1,
    date_added  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- users_seller ----------
CREATE TABLE users_seller (
    id                SERIAL PRIMARY KEY,
    first_name        VARCHAR(150) NOT NULL,
    last_name         VARCHAR(150) NOT NULL,
    email             VARCHAR(255) UNIQUE NOT NULL,
    password          VARCHAR(255) NOT NULL,
    private_or_agency VARCHAR(20) NOT NULL DEFAULT 'private',  -- 'private' | 'agency'
    status            SMALLINT NOT NULL DEFAULT 1,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- user_agency (which seller works for which agency) ----------
CREATE TABLE user_agency (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users_seller(id) ON DELETE CASCADE,
    agency_id   INT NOT NULL REFERENCES agencies(id)     ON DELETE CASCADE,
    status      SMALLINT NOT NULL DEFAULT 1,
    date_added  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, agency_id)
);

-- ---------- properties ----------
CREATE TABLE properties (
    id                 SERIAL PRIMARY KEY,
    address            VARCHAR(500) NOT NULL,
    city               VARCHAR(150),
    city_id            INT REFERENCES cities(id) ON DELETE SET NULL,
    community_name     VARCHAR(255),
    subcommunity_name  VARCHAR(255),
    builder            VARCHAR(255),
    property_status    VARCHAR(50),   -- for-sale | for-rent | sold | off-market
    property_type      VARCHAR(100),  -- Detached, Condo, Apartment, Villa, etc.
    bedrooms           INT,
    bathrooms          INT,
    closing_date       TIMESTAMP,
    price              DOUBLE PRECISION,
    deposit_paid       INT,
    deposit_required   INT,
    maintenance_fee    DOUBLE PRECISION,
    year_completed     INT,
    size               DOUBLE PRECISION,
    size_metric        VARCHAR(20),   -- sqft | sqm
    parking_covered    DOUBLE PRECISION,
    parking_uncovered  DOUBLE PRECISION,
    basement           TEXT,
    mls_listing        VARCHAR(100),
    data_source        VARCHAR(150),
    listing_brokerage  VARCHAR(255),
    listed_on          TIMESTAMP,
    description        TEXT,
    latitude           DOUBLE PRECISION,
    longitude          DOUBLE PRECISION,
    zoom_level         DOUBLE PRECISION,
    seller_id          INT REFERENCES users_seller(id) ON DELETE SET NULL,
    status             SMALLINT NOT NULL DEFAULT 1,  -- 1 active / 0 inactive
    date_added         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_properties_city          ON properties(city_id);
CREATE INDEX idx_properties_status        ON properties(property_status);
CREATE INDEX idx_properties_geo           ON properties(latitude, longitude);
CREATE INDEX idx_properties_community     ON properties(community_name);

-- ---------- property_images ----------
CREATE TABLE property_images (
    id          SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url   VARCHAR(1000) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    date_added  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_property_images_property ON property_images(property_id);

-- ---------- forms (inquiry / contact submissions) ----------
CREATE TABLE IF NOT EXISTS inquiry_forms (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id INT UNSIGNED NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    inquiry_type VARCHAR(50),
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

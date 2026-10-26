-- CricketVerse Hybrid Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Match Fixtures & Schedules
CREATE TABLE IF NOT EXISTS match_fixtures (
    match_id BIGINT PRIMARY KEY,
    series_name VARCHAR(120) NOT NULL,
    match_name VARCHAR(150) NOT NULL,
    venue VARCHAR(150) NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    format VARCHAR(20) DEFAULT 'T20',
    home_team VARCHAR(80) NOT NULL,
    away_team VARCHAR(80) NOT NULL,
    status VARCHAR(30) DEFAULT 'UPCOMING', -- UPCOMING, LIVE, COMPLETED, ABANDONED
    winner_team VARCHAR(80),
    total_overs INT DEFAULT 20,
    current_over NUMERIC(4, 1) DEFAULT 0.0,
    score_summary VARCHAR(100) DEFAULT '0/0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Player Career & Real-Time Telemetry
CREATE TABLE IF NOT EXISTS player_telemetry (
    player_id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(40) NOT NULL, -- Batsman, Bowler, All-Rounder, Wicketkeeper
    team VARCHAR(80) NOT NULL,
    rarity_tier VARCHAR(20) NOT NULL, -- Common, Uncommon, Rare, Epic, Legendary
    multiplier_bps INT NOT NULL DEFAULT 100,
    matches_played INT DEFAULT 0,
    runs INT DEFAULT 0,
    balls_faced INT DEFAULT 0,
    fours INT DEFAULT 0,
    sixes INT DEFAULT 0,
    wickets INT DEFAULT 0,
    overs_bowled NUMERIC(5, 1) DEFAULT 0.0,
    runs_conceded INT DEFAULT 0,
    catches INT DEFAULT 0,
    strike_rate NUMERIC(6, 2) DEFAULT 0.0,
    economy NUMERIC(5, 2) DEFAULT 0.0,
    image_uri VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Live Match Ball-by-Ball Feed (Sub-Second Ingestion)
CREATE TABLE IF NOT EXISTS ball_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id BIGINT REFERENCES match_fixtures(match_id) ON DELETE CASCADE,
    over_number INT NOT NULL,
    ball_number INT NOT NULL,
    striker_id BIGINT REFERENCES player_telemetry(player_id),
    bowler_id BIGINT REFERENCES player_telemetry(player_id),
    runs_scored INT DEFAULT 0,
    is_four BOOLEAN DEFAULT FALSE,
    is_six BOOLEAN DEFAULT FALSE,
    is_wicket BOOLEAN DEFAULT FALSE,
    wicket_type VARCHAR(40),
    fielder_id BIGINT,
    telemetry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Fantasy Squads & Verified Commitments
CREATE TABLE IF NOT EXISTS fantasy_squads (
    squad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet VARCHAR(42) NOT NULL,
    match_id BIGINT REFERENCES match_fixtures(match_id) ON DELETE CASCADE,
    squad_name VARCHAR(80) DEFAULT 'My XI',
    squad_hash VARCHAR(66) NOT NULL, -- keccak256 squad commitment
    player_ids JSONB NOT NULL,       -- Array of 11 player IDs
    captain_id BIGINT NOT NULL,
    vice_captain_id BIGINT NOT NULL,
    total_points NUMERIC(8, 2) DEFAULT 0.0,
    leaderboard_rank INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Non-Custodial Tournament Contests & Escrows
CREATE TABLE IF NOT EXISTS tournament_contests (
    contest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    on_chain_tournament_id BIGINT UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    match_id BIGINT REFERENCES match_fixtures(match_id) ON DELETE CASCADE,
    entry_fee_cric NUMERIC(28, 0) NOT NULL,
    max_participants INT NOT NULL,
    current_participants INT DEFAULT 0,
    total_escrow_cric NUMERIC(28, 0) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, LOCKED, SETTLED, CANCELLED
    winners_payout_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chainlink Oracle Audit Trail
CREATE TABLE IF NOT EXISTS oracle_audit_logs (
    request_id VARCHAR(66) PRIMARY KEY,
    match_id BIGINT REFERENCES match_fixtures(match_id),
    card_id BIGINT REFERENCES player_telemetry(player_id),
    external_api_url VARCHAR(255) NOT NULL,
    raw_response_json JSONB,
    runs_delta INT,
    wickets_delta INT,
    new_strike_rate NUMERIC(6, 2),
    new_economy NUMERIC(5, 2),
    tx_hash VARCHAR(66),
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, FULFILLED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for sub-second query performance
CREATE INDEX IF NOT EXISTS idx_ball_telemetry_match ON ball_telemetry(match_id, over_number, ball_number);
CREATE INDEX IF NOT EXISTS idx_fantasy_squads_match_rank ON fantasy_squads(match_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_player_telemetry_role ON player_telemetry(role);
CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournament_contests(status);

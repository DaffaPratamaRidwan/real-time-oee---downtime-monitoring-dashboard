-- =============================================================================
-- Real-Time OEE & Downtime Monitoring System - Database Schema
-- Electrical Manufacturing Factory
-- =============================================================================

-- Clean up existing tables
DROP TABLE IF EXISTS machine_telemetry CASCADE;
DROP TABLE IF EXISTS downtime_events CASCADE;
DROP TABLE IF EXISTS oee_hourly_records CASCADE;
DROP TABLE IF EXISTS production_logs CASCADE;
DROP TABLE IF EXISTS downtime_reasons CASCADE;
DROP TABLE IF EXISTS downtime_categories CASCADE;
DROP TABLE IF EXISTS production_lines CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 1. Departments in Electrical Factory
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Production Shifts
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    planned_duration_mins INT NOT NULL DEFAULT 480, -- 8-hour shift
    break_duration_mins INT NOT NULL DEFAULT 60,   -- 60 min break/lunch
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Operators & Technicians
CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Operator', -- Operator, Technician, Supervisor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products manufactured (Electrical components)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL, -- SMT Board, Transformer, Wire Harness, Power Supply, Smart Meter
    standard_cycle_time_sec NUMERIC(8, 2) NOT NULL, -- Ideal cycle time per unit in seconds
    ideal_units_per_hour INT NOT NULL,
    unit_cost NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Production Lines / Workstations
CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id INT REFERENCES departments(id) ON DELETE RESTRICT,
    target_oee NUMERIC(5, 2) NOT NULL DEFAULT 85.00, -- Target percentage
    ideal_units_per_hour INT NOT NULL DEFAULT 240,
    current_status VARCHAR(30) NOT NULL DEFAULT 'RUNNING', -- RUNNING, IDLE, DOWNTIME, MAINTENANCE
    current_product_id INT REFERENCES products(id) ON DELETE SET NULL,
    current_operator_id INT REFERENCES operators(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Downtime Categories (Planned vs Unplanned)
CREATE TABLE downtime_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(20) NOT NULL DEFAULT '#ef4444',
    description TEXT
);

-- 7. Downtime Reasons / Failure Codes (Root causes for Pareto analysis)
CREATE TABLE downtime_reasons (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES downtime_categories(id) ON DELETE CASCADE,
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Downtime Incidents / Events
CREATE TABLE downtime_events (
    id SERIAL PRIMARY KEY,
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    reason_id INT REFERENCES downtime_reasons(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE, -- NULL if currently active
    duration_seconds INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    operator_notes TEXT,
    resolution_notes TEXT,
    reported_by INT REFERENCES operators(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Production Logs (Periodic parts counts & scrap tracking)
CREATE TABLE production_logs (
    id SERIAL PRIMARY KEY,
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_units INT NOT NULL DEFAULT 0,
    good_units INT NOT NULL DEFAULT 0,
    scrap_units INT NOT NULL DEFAULT 0,
    scrap_reason VARCHAR(100)
);

-- 10. Hourly OEE Aggregated Records (For trends, shifts, day-level analytics)
CREATE TABLE oee_hourly_records (
    id SERIAL PRIMARY KEY,
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    record_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_time_mins NUMERIC(6, 2) NOT NULL DEFAULT 60.0,
    run_time_mins NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    downtime_mins NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    ideal_cycle_time_sec NUMERIC(8, 2) NOT NULL DEFAULT 15.0,
    target_units INT NOT NULL DEFAULT 240,
    actual_units INT NOT NULL DEFAULT 0,
    good_units INT NOT NULL DEFAULT 0,
    scrap_units INT NOT NULL DEFAULT 0,
    availability NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- Percentage 0.00 to 100.00
    performance NUMERIC(5, 2) NOT NULL DEFAULT 0.0,  -- Percentage 0.00 to 100.00
    quality NUMERIC(5, 2) NOT NULL DEFAULT 0.0,      -- Percentage 0.00 to 100.00
    oee NUMERIC(5, 2) NOT NULL DEFAULT 0.0           -- A * P * Q / 10000 (%)
);

-- 11. Real-Time Machine Telemetry (High-frequency IoT sensor data)
CREATE TABLE machine_telemetry (
    id SERIAL PRIMARY KEY,
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    speed_units_per_hour INT NOT NULL DEFAULT 0,
    temperature_c NUMERIC(5, 2) NOT NULL DEFAULT 45.0,
    vibration_rms NUMERIC(5, 2) NOT NULL DEFAULT 0.8,
    power_kw NUMERIC(6, 2) NOT NULL DEFAULT 12.5,
    vacuum_pressure_kpa NUMERIC(6, 2) NOT NULL DEFAULT -85.0,
    error_code VARCHAR(50),
    alert_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL' -- NORMAL, WARNING, CRITICAL
);

-- Performance Indexes
CREATE INDEX idx_lines_status ON production_lines(current_status);
CREATE INDEX idx_downtime_line ON downtime_events(line_id);
CREATE INDEX idx_downtime_status ON downtime_events(status);
CREATE INDEX idx_downtime_start ON downtime_events(start_time);
CREATE INDEX idx_downtime_reason ON downtime_events(reason_id);
CREATE INDEX idx_prod_logs_line_time ON production_logs(line_id, timestamp);
CREATE INDEX idx_oee_records_line_time ON oee_hourly_records(line_id, record_timestamp);
CREATE INDEX idx_telemetry_line_time ON machine_telemetry(line_id, timestamp DESC);

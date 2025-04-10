/* Replace with your SQL commands */
-- Create users table
CREATE TABLE user_schema.users (
 id SERIAL PRIMARY KEY,
 role VARCHAR(50) DEFAULT 'user',
 nickname VARCHAR(100),
 profile_picture VARCHAR(255),
 email VARCHAR(100) UNIQUE,
 name VARCHAR(100),
 surname VARCHAR(100),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 birth_date DATE,
 region VARCHAR(100)
);

-- Create friendships table
CREATE TABLE user_schema.friendships (
 id SERIAL PRIMARY KEY,
 user1_id INTEGER REFERENCES user_schema.users(id),
 user2_id INTEGER REFERENCES user_schema.users(id),
 status VARCHAR(50),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hikes table
CREATE TABLE hike_schema.hikes (
 id SERIAL PRIMARY KEY,
 name VARCHAR(100) UNIQUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 user_id INTEGER REFERENCES user_schema.users(id)
);

-- Create hike_points table
CREATE TABLE hike_schema.hike_points (
 id SERIAL PRIMARY KEY,
 hike_id INTEGER REFERENCES hike_schema.hikes(id),
 order_number INTEGER,
 latitude DECIMAL(10, 6),
 longitude DECIMAL(10, 6),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create languages table
CREATE TABLE config_schema.languages (
 id SERIAL PRIMARY KEY
);

-- Create settings table
CREATE TABLE user_schema.settings (
 id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES user_schema.users(id),
 dark_mode BOOLEAN,
 accesability BOOLEAN,
 language_id INTEGER REFERENCES config_schema.languages(id)
);

-- Create messages table
CREATE TABLE communication_schema.messages (
 id SERIAL PRIMARY KEY,
 hike_id INTEGER REFERENCES hike_schema.hikes(id),
 sender_id INTEGER REFERENCES user_schema.users(id),
 content TEXT,
 sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hike_participants table
CREATE TABLE hike_schema.hike_participants (
 id SERIAL PRIMARY KEY,
 hike_id INTEGER REFERENCES hike_schema.hikes(id),
 user_id INTEGER REFERENCES user_schema.users(id),
 joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 exited_at TIMESTAMP
);

-- Create notifications table
CREATE TABLE communication_schema.notifications (
 id SERIAL PRIMARY KEY,
 user_id INTEGER,
 type VARCHAR(50),
 content TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_recipients table
CREATE TABLE communication_schema.notification_recipients (
 id SERIAL PRIMARY KEY,
 notification_id INTEGER REFERENCES communication_schema.notifications(id),
 user_id INTEGER REFERENCES user_schema.users(id),
 is_read BOOLEAN DEFAULT FALSE
);

-- Create location_shares table
CREATE TABLE hike_schema.location_shares (
 id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES user_schema.users(id),
 latitude DECIMAL(10, 6),
 longitude DECIMAL(10, 6),
 shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
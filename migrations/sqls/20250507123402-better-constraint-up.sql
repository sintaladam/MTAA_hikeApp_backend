-- Drop the current unique constraint on name
ALTER TABLE hike_schema.hikes
DROP CONSTRAINT IF EXISTS hikes_name_key;

-- Add new unique constraint on (name, user_id)
ALTER TABLE hike_schema.hikes
ADD CONSTRAINT unique_user_hike_name UNIQUE (name, user_id);
--change hike column from int to float
ALTER TABLE hike_schema.hikes
ALTER COLUMN distance TYPE float USING distance::float;

-- add push token collumn
ALTER TABLE user_schema.users
ADD COLUMN push_token TEXT;

-- make hike only have unique participants
ALTER TABLE hike_schema.hike_participants
ADD CONSTRAINT unique_hike_participant
UNIQUE (hike_id, user_id);
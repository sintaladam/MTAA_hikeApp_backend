ALTER TABLE hike_schema.hike_participants
DROP CONSTRAINT unique_hike_participant;

ALTER TABLE hike_schema.hikes
ALTER COLUMN column_name TYPE int USING column_name::int;
-- Remove composite constraint
ALTER TABLE hike_schema.hikes
DROP CONSTRAINT IF EXISTS unique_user_hike_name;

-- Restore original global unique constraint on name
ALTER TABLE hike_schema.hikes
ADD CONSTRAINT hikes_name_key UNIQUE (name);
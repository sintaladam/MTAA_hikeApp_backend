/* Replace with your SQL commands */
-- Remove the password column from users
ALTER TABLE user_schema.users DROP COLUMN IF EXISTS password;

-- Re-add latitude and longitude columns to hike_points
ALTER TABLE hike_schema.hike_points
ADD COLUMN latitude DECIMAL(10, 6),
ADD COLUMN longitude DECIMAL(10, 6);

-- Populate latitude and longitude from the geometry column
UPDATE hike_schema.hike_points
SET 
  latitude = ST_Y(geom),
  longitude = ST_X(geom);

-- Remove the geometry column
ALTER TABLE hike_schema.hike_points
DROP COLUMN IF EXISTS geom
DROP COLUMN IF EXISTS name;

-- Optionally: remove the PostGIS extension (only do this if it's no longer used elsewhere)
-- DROP EXTENSION IF EXISTS postgis;

/* Replace with your SQL commands */
/*adds password*/
DO $$
BEGIN
    -- Check if the 'password' column exists in the 'users' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'user_schema' 
        AND table_name = 'users' 
        AND column_name = 'password'
    ) THEN
        -- Add the 'password' column if it doesn't exist
        ALTER TABLE user_schema.users ADD COLUMN password VARCHAR(60);
    END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS postgis;

--alter the table hikes 
ALTER TABLE hike_schema.hikes 
ADD COLUMN geom geometry(LineString, 4326);

-- Alter the table to add a geometry column
ALTER TABLE hike_schema.hike_points
ADD COLUMN geom geometry(Point, 4326),
ADD COLUMN name varchar(50);

UPDATE hike_schema.hike_points
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

--drop latitude and longitude ( both are stored in the geom column)
ALTER TABLE hike_schema.hike_points
DROP COLUMN latitude,
DROP COLUMN longitude;
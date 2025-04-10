ALTER TABLE hike_schema.hikes 
DROP COLUMN start_point,
DROP COLUMN dest_point,
DROP COLUMN distance,
DROP COLUMN calories;

DELETE FROM hike_schema.hike_points WHERE hike_id IN (SELECT id FROM hike_schema.hikes);
DELETE FROM hike_schema.hikes;
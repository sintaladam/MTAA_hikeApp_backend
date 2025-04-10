/* Replace with your SQL commands */
ALTER TABLE hike_schema.hikes 
ADD COLUMN start_point VARCHAR(100),
ADD COLUMN dest_point VARCHAR(100),
ADD COLUMN distance INT,
ADD COLUMN calories SMALLINT
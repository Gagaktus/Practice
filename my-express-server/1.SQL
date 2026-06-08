CREATE TABLE transport (
	id INTEGER PRIMARY KEY,
	transport VARCHAR(100)
);



CREATE TABLE Role(
	id INTEGER PRIMARY KEY
);

CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	Role_id INTEGER,
	password varchar(100),
	login varchar(100),
	Full_name varchar(100),
	Registration_Date date,
	Date_of_birth date,
	mail varchar(100)
	);

	CREATE TABLE applications (
	course_id INTEGER PRIMARY KEY,
	user_id INTEGER REFERENCES users(id),
	status VARCHAR(100),
	time_of_lessons date,
	payment_method VARCHAR(100),
	transport_id INTEGER REFERENCES transport(id)
);
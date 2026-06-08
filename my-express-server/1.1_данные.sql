ALTER TABLE Role ADD COLUMN name VARCHAR(50);
DELETE FROM applications;
DELETE FROM users;
DELETE FROM transport;
DELETE FROM Role;


INSERT INTO transport (id, transport) VALUES
(1, 'Автобус'),
(2, 'Электробус'),
(3, 'Трамвай');

INSERT INTO Role (id, name) VALUES
(1, 'Ученик'),
(2, 'Преподаватель'),
(3, 'Администратор');

INSERT INTO users (id, Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail) VALUES
(1, (SELECT id FROM Role WHERE name = 'Ученик'), 'pass123', 'ivanov_ia', 'Иванов Иван Алексеевич', '2024-01-15', '1990-05-20', 'ivanov@example.com'),
(2, (SELECT id FROM Role WHERE name = 'Преподаватель'), 'qwerty', 'petrova_ev', 'Петрова Елена Владимировна', '2024-02-10', '1985-11-02', 'petrova@example.com'),
(3, (SELECT id FROM Role WHERE name = 'Администратор'), '123456', 'sidorov_dp', 'Сидоров Дмитрий Павлович', '2024-03-01', '2001-07-14', 'sidorov@example.com');

INSERT INTO applications (course_id, user_id, status, time_of_lessons, payment_method, transport_id) VALUES
(101, (SELECT id FROM users WHERE login = 'ivanov_ia'), 'Новый', '2024-09-10', 'Наличные', (SELECT id FROM transport WHERE transport = 'Автобус')),
(102, (SELECT id FROM users WHERE login = 'petrova_ev'), 'В процессе', '2024-08-25', 'Карта', (SELECT id FROM transport WHERE transport = 'Электробус')),
(103, (SELECT id FROM users WHERE login = 'sidorov_dp'), 'Закончил', '2024-10-05', 'карта', (SELECT id FROM transport WHERE transport = 'Трамвай'));
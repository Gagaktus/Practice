INSERT INTO transport (id, transport) VALUES
(1, 'Автобус'),
(2, 'Электробус'),
(3, 'Трамвай');

INSERT INTO Role (id) VALUES
(1),
(2),
(3);

INSERT INTO users (id, Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail) VALUES
(1, 1, 'pass123', 'ivanov_ia', 'Иванов Иван Алексеевич', '2024-01-15', '1990-05-20', 'ivanov@example.com'),
(2, 2, 'qwerty', 'petrova_ev', 'Петрова Елена Владимировна', '2024-02-10', '1985-11-02', 'petrova@example.com'),
(3, 1, '123456', 'sidorov_dp', 'Сидоров Дмитрий Павлович', '2024-03-01', '2001-07-14', 'sidorov@example.com');

INSERT INTO applications (course_id, user_id, status, time_of_lessons, payment_method, transport_id) VALUES
(101, 1, 'Новый', '2024-09-10', 'Наличные', 1),
(102, 2, 'В процесе', '2024-08-25', 'Карта', 2),
(103, 3, 'Ожидает', '2024-10-05', 'карта', 3);
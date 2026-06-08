const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
const PORT = 3000;

const DB_FILE = 'myapp.db';

if (!fs.existsSync(DB_FILE)) {
    console.log('База данных не найдена. Создаём новую...');

    const db = new sqlite3.Database(DB_FILE);

    db.serialize(() => {
        db.run(`
            CREATE TABLE transport (
                id INTEGER PRIMARY KEY,
                transport VARCHAR(100)
            )
        `);

        db.run(`
            CREATE TABLE Role (
                id INTEGER PRIMARY KEY,
                name VARCHAR(50)
            )
        `);

        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                Role_id INTEGER,
                password VARCHAR(100),
                login VARCHAR(100),
                Full_name VARCHAR(100),
                Registration_Date DATE,
                Date_of_birth DATE,
                mail VARCHAR(100)
            )
        `);

        db.run(`
            CREATE TABLE applications (
                course_id INTEGER PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                status VARCHAR(100),
                time_of_lessons DATE,
                payment_method VARCHAR(100),
                transport_id INTEGER REFERENCES transport(id)
            )
        `);

        db.run(`
            INSERT INTO transport (id, transport) VALUES
            (1, 'Автобус'),
            (2, 'Электробус'),
            (3, 'Трамвай')
        `);

        db.run(`
            INSERT INTO Role (id, name) VALUES
            (1, 'Ученик'),
            (2, 'Преподаватель'),
            (3, 'Администратор')
        `);

        db.run(`
            INSERT INTO users (id, Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail) VALUES
            (1, (SELECT id FROM Role WHERE name = 'Ученик'), 'pass123', 'ivanov_ia', 'Иванов Иван Алексеевич', '2024-01-15', '1990-05-20', 'ivanov@example.com'),
            (2, (SELECT id FROM Role WHERE name = 'Преподаватель'), 'qwerty', 'petrova_ev', 'Петрова Елена Владимировна', '2024-02-10', '1985-11-02', 'petrova@example.com'),
            (3, (SELECT id FROM Role WHERE name = 'Администратор'), '123456', 'sidorov_dp', 'Сидоров Дмитрий Павлович', '2024-03-01', '2001-07-14', 'sidorov@example.com')
        `);

        db.run(`
            INSERT INTO applications (course_id, user_id, status, time_of_lessons, payment_method, transport_id) VALUES
            (101, (SELECT id FROM users WHERE login = 'ivanov_ia'), 'Новый', '2024-09-10', 'Наличные', (SELECT id FROM transport WHERE transport = 'Автобус')),
            (102, (SELECT id FROM users WHERE login = 'petrova_ev'), 'В процессе', '2024-08-25', 'Карта', (SELECT id FROM transport WHERE transport = 'Электробус')),
            (103, (SELECT id FROM users WHERE login = 'sidorov_dp'), 'Закончил', '2024-10-05', 'карта', (SELECT id FROM transport WHERE transport = 'Трамвай'))
        `);
    });

    db.close(() => {
        console.log('База данных создана и заполнена.');
    });
} else {
    console.log('База данных уже существует, используем её.');
}


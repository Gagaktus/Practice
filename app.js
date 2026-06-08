// app.js – полный код, адаптированный для работы с db.js
const express = require('express');
const db = require('./db'); // подключаем ваш пул PostgreSQL из db.js

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Инициализация таблиц (если их нет) и начальных данных -----
const initDatabase = async () => {
    try {
        // Таблица transport
        await db.query(`
            CREATE TABLE IF NOT EXISTS transport (
                id SERIAL PRIMARY KEY,
                transport VARCHAR(100)
            )
        `);
        // Таблица Role
        await db.query(`
            CREATE TABLE IF NOT EXISTS Role (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50)
            )
        `);
        // Таблица users
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                Role_id INTEGER,
                password VARCHAR(100),
                login VARCHAR(100) UNIQUE,
                Full_name VARCHAR(100),
                Registration_Date DATE,
                Date_of_birth DATE,
                mail VARCHAR(100)
            )
        `);
        // Таблица applications
        await db.query(`
            CREATE TABLE IF NOT EXISTS applications (
                course_id INTEGER PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                status VARCHAR(100),
                time_of_lessons DATE,
                payment_method VARCHAR(100),
                transport_id INTEGER REFERENCES transport(id)
            )
        `);

        // Проверяем, есть ли данные в transport
        const transportRes = await db.query('SELECT COUNT(*) FROM transport');
        if (parseInt(transportRes.rows[0].count) === 0) {
            // Начальные данные
            await db.query(`
                INSERT INTO transport (id, transport) VALUES
                (1, 'Автобус'), (2, 'Электробус'), (3, 'Трамвай')
            `);
            await db.query(`
                INSERT INTO Role (id, name) VALUES
                (1, 'Ученик'), (2, 'Преподаватель'), (3, 'Администратор')
            `);
            await db.query(`
                INSERT INTO users (id, Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail) VALUES
                (1, (SELECT id FROM Role WHERE name = 'Ученик'), 'pass123', 'ivanov_ia', 'Иванов Иван Алексеевич', '2024-01-15', '1990-05-20', 'ivanov@example.com'),
                (2, (SELECT id FROM Role WHERE name = 'Преподаватель'), 'qwerty', 'petrova_ev', 'Петрова Елена Владимировна', '2024-02-10', '1985-11-02', 'petrova@example.com'),
                (3, (SELECT id FROM Role WHERE name = 'Администратор'), '123456', 'sidorov_dp', 'Сидоров Дмитрий Павлович', '2024-03-01', '2001-07-14', 'sidorov@example.com')
            `);
            await db.query(`
                INSERT INTO applications (course_id, user_id, status, time_of_lessons, payment_method, transport_id) VALUES
                (101, (SELECT id FROM users WHERE login = 'ivanov_ia'), 'Новый', '2024-09-10', 'Наличные', (SELECT id FROM transport WHERE transport = 'Автобус')),
                (102, (SELECT id FROM users WHERE login = 'petrova_ev'), 'В процессе', '2024-08-25', 'Карта', (SELECT id FROM transport WHERE transport = 'Электробус')),
                (103, (SELECT id FROM users WHERE login = 'sidorov_dp'), 'Закончил', '2024-10-05', 'карта', (SELECT id FROM transport WHERE transport = 'Трамвай'))
            `);
            console.log('Начальные данные добавлены');
        }
        console.log('База данных инициализирована');
    } catch (err) {
        console.error('Ошибка инициализации БД:', err);
        process.exit(1);
    }
};

// ----- Запуск инициализации, затем сервера -----
initDatabase().then(() => {
    // ----- ГЛАВНАЯ СТРАНИЦА – ТОЛЬКО ФОРМА РЕГИСТРАЦИИ -----
    app.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Регистрация</title><meta charset="utf-8">
            <style>
                body{font-family:Arial;margin:40px}
                label{width:150px;display:inline-block;margin-top:10px}
                input,select{margin-top:10px;padding:5px;width:250px}
                button{margin-top:20px;padding:8px 20px;background:#4CAF50;color:white;border:none;cursor:pointer}
            </style>
            </head>
            <body>
                <h2>Регистрация нового пользователя</h2>
                <form action="/register" method="POST">
                    <label>Логин (login):</label> <input type="text" name="login" required><br>
                    <label>Пароль (password):</label> <input type="password" name="password" required><br>
                    <label>Полное имя (Full_name):</label> <input type="text" name="Full_name" required><br>
                    <label>Дата рождения (Date_of_birth):</label> <input type="date" name="Date_of_birth" required><br>
                    <label>Email (mail):</label> <input type="email" name="mail" required><br>
                    <label>Роль (Role):</label>
                    <select name="Role_id">
                        <option value="1">Ученик</option>
                        <option value="2">Преподаватель</option>
                        <option value="3">Администратор</option>
                    </select><br>
                    <button type="submit">Зарегистрироваться</button>
                </form>
            </body>
            </html>
        `);
    });

    // ----- ОБРАБОТКА ФОРМЫ РЕГИСТРАЦИИ -----
    app.post('/register', async (req, res) => {
        const { login, password, Full_name, Date_of_birth, mail, Role_id } = req.body;
        if (!login || !password || !Full_name || !Date_of_birth || !mail) {
            return res.status(400).send('Все поля обязательны.');
        }
        const today = new Date().toISOString().slice(0, 10);
        const sql = `
            INSERT INTO users (Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `;
        const params = [Role_id || 1, password, login, Full_name, today, Date_of_birth, mail];
        try {
            const result = await db.query(sql, params);
            const newId = result.rows[0].id;
            res.send(`
                <h2>Регистрация успешна!</h2>
                <p>Пользователь ${Full_name} добавлен с ID = ${newId}.</p>
                <p><a href="/">Зарегистрировать ещё</a></p>
            `);
        } catch (err) {
            console.error(err);
            if (err.constraint === 'users_login_key') {
                return res.status(409).send('Логин уже существует.');
            }
            return res.status(500).send('Ошибка БД: ' + err.message);
        }
    });

    // ----- ДОПОЛНИТЕЛЬНЫЕ МАРШРУТЫ (ВЫВОД ДАННЫХ) -----
    // 1. JSON endpoints
    app.get('/users', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM users');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/applications', async (req, res) => {
        try {
            const sql = `
                SELECT a.*, u.Full_name AS user_name, t.transport AS transport_name
                FROM applications a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN transport t ON a.transport_id = t.id
            `;
            const result = await db.query(sql);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/transport', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM transport');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/roles', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM Role');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 2. HTML-таблицы
    app.get('/html/users', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM users');
            let html = '<!DOCTYPE html><html><head><title>Пользователи</title><style>table,th,td{border:1px solid #ccc;border-collapse:collapse;padding:8px;}</style></head><body><h1>Пользователи</h1><table>';
            html += '<tr><th>ID</th><th>Role_id</th><th>Логин</th><th>ФИО</th><th>Дата рег.</th><th>Дата рожд.</th><th>Email</th></tr>';
            result.rows.forEach(row => {
                html += `<tr>
                            <td>${row.id}</td>
                            <td>${row.Role_id}</td>
                            <td>${row.login}</td>
                            <td>${row.Full_name}</td>
                            <td>${row.Registration_Date}</td>
                            <td>${row.Date_of_birth}</td>
                            <td>${row.mail}</td>
                        </tr>`;
            });
            html += '</table></body></html>';
            res.send(html);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });

    app.get('/html/applications', async (req, res) => {
        try {
            const sql = `
                SELECT a.course_id, a.status, a.time_of_lessons, a.payment_method,
                       u.Full_name AS user_name, t.transport AS transport_name
                FROM applications a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN transport t ON a.transport_id = t.id
            `;
            const result = await db.query(sql);
            let html = '<!DOCTYPE html><html><head><title>Заявки</title><style>table,th,td{border:1px solid #ccc;border-collapse:collapse;padding:8px;}</style></head><body><h1>Заявки</h1><table>';
            html += '<tr><th>Курс ID</th><th>Статус</th><th>Время занятий</th><th>Оплата</th><th>Пользователь</th><th>Транспорт</th></tr>';
            result.rows.forEach(row => {
                html += `<tr>
                            <td>${row.course_id}</td>
                            <td>${row.status}</td>
                            <td>${row.time_of_lessons}</td>
                            <td>${row.payment_method}</td>
                            <td>${row.user_name}</td>
                            <td>${row.transport_name}</td>
                        </tr>`;
            });
            html += '</table></body></html>';
            res.send(html);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });

    // 3. Все данные текстом (разделены пустыми строками)
    app.get('/alldata', async (req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        try {
            const transport = (await db.query('SELECT * FROM transport')).rows;
            const roles     = (await db.query('SELECT * FROM Role')).rows;
            const users     = (await db.query('SELECT * FROM users')).rows;
            const apps      = (await db.query('SELECT * FROM applications')).rows;

            let out = '';
            out += '=== Transport ===\n'; transport.forEach(r => out += `${r.id} ${r.transport}\n`);
            out += '\n=== Role ===\n'; roles.forEach(r => out += `${r.id} ${r.name}\n`);
            out += '\n=== Users ===\n'; users.forEach(r => out += `${r.id} ${r.Role_id} ${r.login} ${r.Full_name} ${r.Registration_Date} ${r.Date_of_birth} ${r.mail}\n`);
            out += '\n=== Applications ===\n'; apps.forEach(r => out += `${r.course_id} ${r.user_id} ${r.status} ${r.time_of_lessons} ${r.payment_method} ${r.transport_id}\n`);
            res.send(out);
        } catch (err) {
            res.status(500).send(`Ошибка: ${err.message}`);
        }
    });

    // ----- ЗАПУСК СЕРВЕРА -----
    app.listen(PORT, () => {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Не удалось инициализировать БД:', err);
    process.exit(1);
});
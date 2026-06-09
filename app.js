const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    user: 'postgres',
    password: '12345',
    host: 'localhost',
    port: 5432,
    database: 'Melnik'
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'секретный_ключ_экзамен',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

const initDB = async () => {
    try {
        await pool.query(`
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS applications CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS transport CASCADE;
            DROP TABLE IF EXISTS Role CASCADE;
        `);

        await pool.query(`
            CREATE TABLE transport (
                id SERIAL PRIMARY KEY,
                transport VARCHAR(100)
            );
            CREATE TABLE Role (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50)
            );
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                Role_id INTEGER REFERENCES Role(id),
                password VARCHAR(255),
                login VARCHAR(100) UNIQUE,
                Full_name VARCHAR(100),
                Registration_Date DATE,
                Date_of_birth DATE,
                mail VARCHAR(100),
                phone VARCHAR(20)
            );
            CREATE TABLE applications (
                course_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'Новая',
                time_of_lessons DATE,
                payment_method VARCHAR(100),
                transport_id INTEGER REFERENCES transport(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                review TEXT,
                review_date TIMESTAMP
            );
            CREATE TABLE reviews (
                id SERIAL PRIMARY KEY,
                application_id INTEGER REFERENCES applications(course_id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                review_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const transportCount = await pool.query('SELECT COUNT(*) FROM transport');
        if (parseInt(transportCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO transport (transport) VALUES ('Автобус'), ('Электробус'), ('Трамвай')`);
        }

        const roleCount = await pool.query('SELECT COUNT(*) FROM Role');
        if (parseInt(roleCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO Role (name) VALUES ('Ученик'), ('Преподаватель'), ('Администратор')`);
        }

        const users = await pool.query('SELECT id, password FROM users WHERE LENGTH(password) < 60 AND password NOT LIKE \'$2b$%\'');
        for (const user of users.rows) {
            const hashed = await bcrypt.hash(user.password, 10);
            await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
            console.log(`Обновлён пароль для пользователя ID ${user.id}`);
        }

        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            const hashed = await bcrypt.hash('password123', 10);
            await pool.query(`
                INSERT INTO users (Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail, phone)
                VALUES ((SELECT id FROM Role WHERE name='Ученик'), $1, 'testuser', 'Тестовый Пользователь', CURRENT_DATE, '1990-01-01', 'test@example.com', '+71234567890')
            `, [hashed]);
            console.log('Создан тестовый пользователь: login=testuser, password=password123');
        }

        console.log('База данных успешно инициализирована');
    } catch (err) {
        console.error('Ошибка инициализации БД:', err);
        process.exit(1);
    }
};

const isValidLogin = (login) => /^[a-zA-Z0-9]{6,}$/.test(login);
const isValidPassword = (pwd) => pwd && pwd.length >= 8;

app.get('/api/user', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Не авторизован' });
    res.json({ id: req.session.user.id, login: req.session.user.login, full_name: req.session.user.full_name });
});

app.get('/api/user/applications', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Не авторизован' });
    const result = await pool.query(`
        SELECT a.*, t.transport as transport_name 
        FROM applications a
        JOIN transport t ON a.transport_id = t.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
    `, [req.session.user.id]);
    res.json(result.rows);
});

app.post('/api/applications', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Не авторизован' });
    const { transport_id, date, payment_method } = req.body;
    try {
        const result = await pool.query(`
            INSERT INTO applications (user_id, transport_id, time_of_lessons, payment_method, status)
            VALUES ($1, $2, $3, $4, 'Новая')
            RETURNING course_id
        `, [req.session.user.id, transport_id, date, payment_method]);
        res.json({ success: true, course_id: result.rows[0].course_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Не авторизован' });
    const { application_id, review_text } = req.body;

    const check = await pool.query(`
        SELECT status FROM applications 
        WHERE course_id = $1 AND user_id = $2
    `, [application_id, req.session.user.id]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Заявка не найдена' });
    if (check.rows[0].status !== 'Обучение завершено') {
        return res.status(400).json({ error: 'Отзыв можно оставить только после завершения обучения' });
    }

    const existing = await pool.query(`SELECT id FROM reviews WHERE application_id = $1`, [application_id]);
    if (existing.rowCount > 0) return res.status(400).json({ error: 'Отзыв уже был оставлен' });

    await pool.query(`INSERT INTO reviews (application_id, user_id, review_text) VALUES ($1, $2, $3)`,
        [application_id, req.session.user.id, review_text]);
    await pool.query(`UPDATE applications SET review = $1, review_date = CURRENT_TIMESTAMP WHERE course_id = $2`,
        [review_text, application_id]);
    res.json({ success: true });
});

app.get('/api/transport', async (req, res) => {
    const result = await pool.query('SELECT id, transport FROM transport');
    res.json(result.rows);
});

app.get('/api/admin/applications', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    const { status, sort = 'created_at', order = 'DESC', page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '', params = [];
    if (status) { whereClause = 'WHERE a.status = $1'; params.push(status); }
    const orderClause = `ORDER BY a.${sort} ${order.toUpperCase()}`;
    const countRes = await pool.query(`SELECT COUNT(*) FROM applications a ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);
    const dataRes = await pool.query(`
        SELECT a.*, u.full_name as user_name, t.transport as transport_name
        FROM applications a
        JOIN users u ON a.user_id = u.id
        JOIN transport t ON a.transport_id = t.id
        ${whereClause}
        ${orderClause}
        LIMIT $${params.length+1} OFFSET $${params.length+2}
    `, [...params, limit, offset]);
    res.json({ applications: dataRes.rows, total, page: parseInt(page), totalPages: Math.ceil(total/limit) });
});

app.put('/api/admin/applications/:id/status', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    const { id } = req.params;
    const { status } = req.body;
    await pool.query(`UPDATE applications SET status = $1 WHERE course_id = $2`, [status, id]);
    res.json({ success: true });
});

app.post('/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM users WHERE login = $1`, [login]);
        if (result.rowCount === 0) return res.status(401).json({ error: 'Неверный логин или пароль' });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Неверный логин или пароль' });
        req.session.user = { id: user.id, login: user.login, full_name: user.full_name, role_id: user.role_id };
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

app.post('/register', async (req, res) => {
    const { login, password, full_name, birth_date, email, phone } = req.body;
    if (!isValidLogin(login)) return res.status(400).json({ error: 'Неверный формат логина (мин 6 латиница+цифры)' });
    if (!isValidPassword(password)) return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
    const unique = await pool.query('SELECT id FROM users WHERE login=$1', [login]);
    if (unique.rowCount > 0) return res.status(409).json({ error: 'Логин уже занят' });
    const hashed = await bcrypt.hash(password, 10);
    try {
        await pool.query(`
            INSERT INTO users (Role_id, password, login, Full_name, Registration_Date, Date_of_birth, mail, phone)
            VALUES ((SELECT id FROM Role WHERE name='Ученик'), $1, $2, $3, CURRENT_DATE, $4, $5, $6)
        `, [hashed, login, full_name, birth_date, email, phone]);
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Ошибка БД при регистрации' }); 
    }
});

app.post('/admin/login', (req, res) => {
    const { login, password } = req.body;
    if (login === 'Admin26' && password === 'Demo20') {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Неверные учётные данные' });
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login.html'); });
app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin-login.html'); });
app.get('/', (req, res) => res.redirect('/login.html'));

initDB().then(() => {
    app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
}).catch(err => console.error(err)); 
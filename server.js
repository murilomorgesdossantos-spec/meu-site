const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true, 
    auth: { user: '9e88ec001@smtp-brevo.com', pass: process.env.EMAIL_PASSWORD },
    family: 4
});

// Banco de Dados e tabelas
pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT, senha TEXT)`, (err) => {
    if (!err) pool.query(`INSERT INTO usuarios (nome, senha) SELECT 'admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')`);
});

// --- ROTAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// Rota de Ajuda (E-mail)
app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;
    transporter.sendMail({
        from: 'murilomorgesdossantos@gmail.com',
        to: 'murilomorgesdossantos@gmail.com',
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `Nome: ${nome}\nUsuário: ${usuario}\nEmail: ${email}\nDetalhes: ${detalhes}`
    }, (error) => {
        if (error) return res.status(500).json({ sucesso: false, erro: error.toString() });
        res.json({ sucesso: true });
    });
});

// Login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (result && result.rows[0]) res.json({ sucesso: true });
        else res.json({ sucesso: false });
    });
});

// Cadastro (Recolocado aqui)
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
        if (err) return res.send("Erro ao cadastrar");
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// --- CONEXÃO BANCO DE DADOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO BREVO (PORTA 465 - SSL) ---
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,      // Porta SSL (Geralmente liberada no Render)
    secure: true,   // True para porta 465
    auth: {
        user: '9e88ec001@smtp-brevo.com', // Seu login do print
        pass: process.env.EMAIL_PASSWORD  // Sua senha do print (no Environment)
    },
    family: 4 // Força IPv4 para evitar lentidão
});

// Criar tabela se não existir
pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT, senha TEXT)`, (err) => {
    if (!err) pool.query(`INSERT INTO usuarios (nome, senha) SELECT 'admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')`);
});

// --- ROTAS DE PÁGINAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// --- ROTA DE ENVIO DE EMAIL ---
app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;

    const mailOptions = {
        from: 'murilomorgesdossantos@gmail.com', 
        to: 'murilomorgesdossantos@gmail.com',  
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `NOME: ${nome}\nUSUÁRIO: ${usuario}\nEMAIL: ${email}\nDETALHES: ${detalhes}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Erro no envio:", error);
            return res.status(500).json({ sucesso: false, erro: error.toString() });
        }
        console.log('E-mail enviado via Brevo!');
        res.json({ sucesso: true });
    });
});

// --- ROTAS DE LOGIN E CADASTRO ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (result && result.rows[0]) res.json({ sucesso: true });
        else res.json({ sucesso: false });
    });
});

app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
        if (err) return res.send("Erro ao cadastrar");
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
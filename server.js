const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO DE EMAIL (FORÇA BRUTA IPV4) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,      // Voltamos para SSL (conexão imediata)
    secure: true,   // Precisa ser true para porta 465
    auth: {
        user: 'murilomorgesdossantos@gmail.com',
        pass: process.env.EMAIL_PASSWORD
    },
    // --- O SEGREDO ESTÁ AQUI EMBAIXO ---
    family: 4,      // Obriga o servidor a usar IPv4 (ignora IPv6)
    logger: true,   // Vai mostrar logs detalhados se der erro
    debug: true
});

// Banco de Dados
pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        senha TEXT
    )
`, (err, res) => {
    if (err) console.error('Erro tabela:', err);
    else {
        pool.query(`INSERT INTO usuarios (nome, senha) SELECT 'admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')`);
    }
});

// Rotas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));
app.get('/sistema.html', (req, res) => res.send("<h1>Bem-vindo ao Sistema!</h1>")); 

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        if (result.rows[0]) res.json({ sucesso: true });
        else res.json({ sucesso: false });
    });
});

app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;

    const mailOptions = {
        from: email,
        to: 'murilomorgesdossantos@gmail.com',
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `
        SOLICITAÇÃO DE RECUPERAÇÃO DE CONTA
        -----------------------------------
        Nome: ${nome}
        Usuário: ${usuario}
        Email de contato: ${email}
        
        Detalhes:
        ${detalhes}
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("ERRO NO ENVIO:", error);
            return res.status(500).json({ sucesso: false, erro: error.toString() });
        } else {
            console.log('EMAIL ENVIADO! ID: ' + info.messageId);
            return res.json({ sucesso: true });
        }
    });
});

app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1", [usuario], (err, result) => {
        if (err) return res.send("Erro");
        if (result.rows[0]) res.send("Usuário já existe!");
        else {
            pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
                if (err) return res.send("Erro");
                res.redirect('/');
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
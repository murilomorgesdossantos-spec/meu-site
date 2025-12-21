const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');
const dns = require('dns'); 

// 1. OBRIGAR O NODE A USAR IPV4 (Evita travamentos de rede no Render)
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    console.log("Aviso: Node antigo, ignorando ajuste de DNS");
}

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 2. CONFIGURAÇÃO DE EMAIL ESPECÍFICA PARA NUVEM (PORTA 587)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // Porta padrão para TLS (fura firewall)
    secure: false,          // false para 587 (a segurança entra depois com STARTTLS)
    auth: {
        user: 'murilomorgesdossantos@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Pega a senha do cofre
    },
    tls: {
        rejectUnauthorized: false // Ajuda a aceitar a conexão segura do Google
    },
    // Aumentamos o tempo limite para conexões lentas
    connectionTimeout: 10000 
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
        SOLICITAÇÃO DE RECUPERAÇÃO
        --------------------------
        Nome: ${nome}
        Usuário: ${usuario}
        Email de contato: ${email}
        
        Detalhes:
        ${detalhes}
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Erro no envio:", error);
            // Retornamos o erro detalhado para o frontend se precisar
            return res.status(500).json({ sucesso: false, erro: error.code || error.toString() });
        } else {
            console.log('Email enviado: ' + info.response);
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
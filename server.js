const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer'); // Importamos o carteiro

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO DO EMAIL (SUBSTITUA A SENHA DEPOIS) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'murilomorgesdossantos@gmail.com', // Seu email
        pass: 'uviq vrwx izkh aoaf' // <--- AQUI VAI PRECISAR DE UMA SENHA DE APP DO GOOGLE
    }
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

// --- ROTAS DE PÁGINAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));

// ROTA NOVA: Exibe a tela de Esqueci a Senha
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

app.get('/sistema.html', (req, res) => res.send("<h1>Bem-vindo ao Sistema!</h1>")); 


// --- ROTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        if (result.rows[0]) res.json({ sucesso: true });
        else res.json({ sucesso: false });
    });
});

// --- ROTA DE ENVIAR EMAIL DE AJUDA ---
app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;

    // Configura o visual do email que vai chegar pra você
    const mailOptions = {
        from: email, // Quem está mandando (o email que a pessoa digitou)
        to: 'murilomorgesdossantos@gmail.com', // Para quem vai (Você)
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `
        SOLICITAÇÃO DE RECUPERAÇÃO DE CONTA
        
        Nome completo: ${nome}
        Usuario: ${usuario}
        Email para contato: ${email}
        
        Detalhes do problema:
        ${detalhes}
        `
    };

    // Tenta enviar
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ sucesso: false, erro: error.toString() });
        } else {
            console.log('Email enviado: ' + info.response);
            return res.json({ sucesso: true });
        }
    });
});

// --- ROTA DE CADASTRO ---
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
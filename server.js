const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();

// --- CONEXÃO BANCO DE DADOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuração para servir arquivos estáticos (se você tiver imagens/css na pasta public)
app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO DE SESSÃO ---
app.use(session({
    secret: 'chave-secreta-do-murilo', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hora
}));

// --- ROTAS DAS PÁGINAS (Todas apontando para __dirname) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// ROTA PROTEGIDA (HOME)
app.get('/home', (req, res) => {
    if (req.session.usuarioLogado) {
        // CORREÇÃO: Agora aponta para a raiz, onde o arquivo realmente está
        res.sendFile(path.join(__dirname, 'home.html'));
    } else {
        res.redirect('/');
    }
});

// --- ROTA DE LOGOUT ---
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- LOGIN ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        
        if (result.rows.length > 0) {
            req.session.usuarioLogado = usuario;
            res.json({ sucesso: true });
        } else {
            res.json({ sucesso: false });
        }
    });
});

// --- CADASTRO ---
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
        if (err) return res.send("Erro ao cadastrar.");
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
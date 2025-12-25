const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'segredo-do-murilo', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

// --- ATUALIZAÇÃO AUTOMÁTICA DO BANCO ---
// Tenta adicionar a coluna de admin e cria o usuário 'admin' padrão
pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE", (err) => {
    if (!err) {
        // Garante que o usuário 'admin' seja Super Usuário
        pool.query("UPDATE usuarios SET is_admin = TRUE WHERE nome = 'admin'");
    }
});

// --- ROTAS DE PÁGINAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// Rota Home
app.get('/home', (req, res) => {
    if (req.session.usuarioLogado) {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.join(__dirname, 'home.html'));
    } else {
        res.redirect('/');
    }
});

// Rota Exclusiva de Admin (Nova Página)
app.get('/admin', (req, res) => {
    // SÓ ENTRA SE TIVER LOGADO E FOR ADMIN
    if (req.session.usuarioLogado && req.session.isAdmin) {
        res.send('<h1>Bem-vindo à Área Secreta do Admin! 🕵️‍♂️</h1><a href="/home">Voltar</a>');
    } else {
        res.status(403).send('<h1>Acesso Negado! 🚫</h1><a href="/home">Voltar</a>');
    }
});

// --- API PARA O FRONTEND SABER QUEM É O USUÁRIO ---
app.get('/api/quem-sou-eu', (req, res) => {
    if (req.session.usuarioLogado) {
        res.json({ 
            nome: req.session.usuarioLogado, 
            admin: req.session.isAdmin || false 
        });
    } else {
        res.json({ nome: null, admin: false });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- LOGIN ATUALIZADO ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        
        if (result.rows.length > 0) {
            req.session.usuarioLogado = usuario;
            // SALVA NA SESSÃO SE ELE É ADMIN OU NÃO
            req.session.isAdmin = result.rows[0].is_admin; 
            res.json({ sucesso: true });
        } else {
            res.json({ sucesso: false });
        }
    });
});

app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    // Todo mundo nasce como usuário comum (FALSE)
    pool.query("INSERT INTO usuarios (nome, senha, is_admin) VALUES ($1, $2, FALSE)", [usuario, senha], (err) => {
        if (err) return res.send("Erro ao cadastrar.");
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
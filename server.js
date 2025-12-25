const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session'); // Importa o módulo de sessão

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO DA SESSÃO ---
app.use(session({
    secret: 'chave-secreta-segura', // Uma senha para criptografar o ticket
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // O login dura 1 hora
}));

// --- ROTAS PÚBLICAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// --- ROTA PROTEGIDA (O SEGREDO DA SESSION) ---
app.get('/home', (req, res) => {
    if (req.session.usuarioLogado) {
        // Se ele tiver o ticket de sessão, mostra a página
        res.sendFile(path.join(__dirname, 'public', 'home.html'));
    } else {
        // Se não estiver logado, manda de volta para o login
        res.redirect('/');
    }
});

// --- LOGIN (GERANDO A SESSION) ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        
        if (result.rows.length > 0) {
            // LOGIN COM SUCESSO: Cria a sessão no servidor
            req.session.usuarioLogado = usuario; 
            res.json({ sucesso: true });
        } else {
            res.json({ sucesso: false });
        }
    });
});

// --- LOGOUT (OPCIONAL) ---
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destrói o ticket
    res.redirect('/');
});

app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
        if (err) return res.send("Erro ao cadastrar.");
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
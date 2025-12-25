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

// Serve arquivos estáticos da pasta public (se houver) e da raiz
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

// --- ROTAS DAS PÁGINAS (Arquivos físicos) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// --- ROTA PROTEGIDA HOME (COM CORREÇÃO DE DOWNLOAD) ---
app.get('/home', (req, res) => {
    if (req.session.usuarioLogado) {
        // ESSA LINHA É A MÁGICA: Obriga o navegador a renderizar o HTML
        res.setHeader('Content-Type', 'text/html');
        
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Área Logada</title>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
                <style>
                    body {
                        margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center;
                        min-height: 100vh;
                        background: url('https://images.hdqwalls.com/wallpapers/bthumb/dark-night-mountains-minimalist-4k-o4.jpg') no-repeat center center/cover;
                        font-family: 'Poppins', sans-serif; color: white; gap: 20px;
                    }
                    h1 {
                        font-size: 40px; background: rgba(0, 0, 0, 0.6); padding: 20px 50px;
                        border-radius: 15px; backdrop-filter: blur(10px); border: 2px solid rgba(255, 255, 255, 0.1);
                        text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    }
                    .btn-sair {
                        background-color: #ff4b4b; color: white; padding: 12px 30px; text-decoration: none;
                        border-radius: 30px; font-weight: bold; display: flex; align-items: center; gap: 8px;
                        transition: 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    }
                    .btn-sair:hover { background-color: #d43f3f; transform: scale(1.05); }
                </style>
            </head>
            <body>
                <h1>Bem-vindo, ${req.session.usuarioLogado}!</h1>
                <a href="/logout" class="btn-sair"><span class="material-icons">logout</span> Sair do Sistema</a>
            </body>
            </html>
        `);
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
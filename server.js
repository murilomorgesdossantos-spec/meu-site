const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// --- CONEXÃO COM O BANCO DE DADOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CRIAÇÃO AUTOMÁTICA DA TABELA DE USUÁRIOS ---
pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT UNIQUE,
        senha TEXT
    )
`, (err) => {
    if (err) console.error('Erro ao criar tabela:', err);
    else {
        // Cria um admin padrão caso não exista
        pool.query(`INSERT INTO usuarios (nome, senha) SELECT 'admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')`);
    }
});

// --- ROTAS DAS PÁGINAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

// --- ROTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.status(500).json({ sucesso: false });
        if (result.rows[0]) {
            res.json({ sucesso: true });
        } else {
            res.json({ sucesso: false });
        }
    });
});

// --- ROTA DE CADASTRO ---
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
        if (err) {
            console.error(err);
            return res.send("Erro ao cadastrar ou usuário já existe.");
        }
        res.redirect('/'); // Após cadastrar, volta para o login
    });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
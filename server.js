const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Configuração do Banco de Dados (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static('public')); 
app.use(express.json()); // NECESSÁRIO para ler o JSON enviado pelo fetch
app.use(express.urlencoded({ extended: true }));

// Cria a Tabela se não existir
pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        senha TEXT
    )
`, (err, res) => {
    if (err) {
        console.error('Erro ao criar tabela:', err);
    } else {
        // Cria admin padrão se não existir
        pool.query(`
            INSERT INTO usuarios (nome, senha) 
            SELECT 'admin', '1234' 
            WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')
        `);
    }
});

// Rotas de Páginas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
// Página do Sistema (após login) - Crie um arquivo sistema.html depois se quiser
app.get('/sistema.html', (req, res) => res.send("<h1>Bem-vindo ao Sistema!</h1>")); 


// --- ROTA DE LOGIN (MODIFICADA PARA JSON) ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ sucesso: false, mensagem: "Erro no servidor" });
        }
        
        const row = result.rows[0];

        if (row) {
            // Login Correto: Retorna JSON dizendo que deu certo
            res.json({ sucesso: true });
        } else {
            // Login Errado: Retorna JSON dizendo que falhou
            res.json({ sucesso: false });
        }
    });
});

// --- ROTA DE CADASTRO (MANTIDA, MAS AINDA MANDA HTML) ---
// Se quiser modernizar o cadastro também, me avise depois.
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;

    pool.query("SELECT * FROM usuarios WHERE nome = $1", [usuario], (err, result) => {
        if (err) return res.send("Erro no servidor");
        
        if (result.rows[0]) {
            res.send("<h1>Usuário já existe! <a href='/cadastro'>Voltar</a></h1>");
        } else {
            pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
                if (err) return res.send("Erro ao salvar");
                res.redirect('/'); // Redireciona para o login após criar conta
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
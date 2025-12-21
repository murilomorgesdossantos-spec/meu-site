const express = require('express');
const { Pool } = require('pg'); // Mudança 1: Usamos 'pg' em vez de 'sqlite3'
const path = require('path');

const app = express();

// Mudança 2: Conexão com o banco do Render (PostgreSQL)
// Ele pega o link automaticamente da variável de ambiente que configuramos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static('public')); 
app.use(express.urlencoded({ extended: true }));

// Mudança 3: Criação da Tabela (Adaptado para Postgres)
// No Postgres usamos SERIAL para números automáticos e $1, $2 para variáveis
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
        // Cria o admin se ele não existir
        pool.query(`
            INSERT INTO usuarios (nome, senha) 
            SELECT 'admin', '1234' 
            WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')
        `);
    }
});

// --- Função para gerar o fundo animado (Nenhuma mudança aqui) ---
function templateComFundo(conteudo) {
    return `
        <link rel="stylesheet" href="/style.css">
        <link rel="stylesheet" href="/login.css">
        <div class="caixa-login" style="margin: auto; margin-top: 50px;">
            ${conteudo}
        </div>
        <div class="area-animada">
            <ul style="padding: 0; margin: 0;">
                <li class="caixa-flutuante"></li><li class="caixa-flutuante"></li>
                <li class="caixa-flutuante"></li><li class="caixa-flutuante"></li>
                <li class="caixa-flutuante"></li><li class="caixa-flutuante"></li>
                <li class="caixa-flutuante"></li><li class="caixa-flutuante"></li>
            </ul>
        </div>
    `;
}

// Rotas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));

// Rota de Login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    // Mudança 4: Query adaptada para Postgres ($1, $2 em vez de ?)
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) return res.send(templateComFundo("<h1>Erro no Sistema</h1>"));
        
        // No Postgres, os resultados ficam dentro de result.rows
        const row = result.rows[0];

        if (row) {
            res.send(templateComFundo(`
                <h1>Olá, ${row.nome}!</h1>
                <p>Login realizado com sucesso.</p>
                <br>
                <a href="/">Sair</a>
            `));
        } else {
            res.send(templateComFundo(`
                <h1>Acesso Negado</h1>
                <p>Usuário ou senha incorretos.</p>
                <br>
                <a href="/">Tentar Novamente</a>
            `));
        }
    });
});

// Rota de Cadastro
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;

    // Verifica se usuário existe
    pool.query("SELECT * FROM usuarios WHERE nome = $1", [usuario], (err, result) => {
        if (err) return res.send("Erro no Sistema.");
        
        const row = result.rows[0];

        if (row) {
            res.send(templateComFundo(`
                <h1>Ops!</h1>
                <p>O usuário <strong>${usuario}</strong> já existe.</p>
                <br>
                <a href="/cadastro">Tentar outro nome</a>
            `));
        } else {
            // Insere novo usuário
            pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
                if (err) return res.send("Erro ao salvar.");
                
                res.send(templateComFundo(`
                    <h1>Sucesso!</h1>
                    <p>Sua conta foi criada.</p>
                    <br>
                    <a href="/">Fazer Login</a>
                `));
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
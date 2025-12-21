const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// --- 1. CONFIGURAÇÃO DO BANCO DE DADOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- 2. MIDDLEWARES (Configurações do Express) ---
app.use(express.static('public')); 
app.use(express.json()); // Importante para ler JSON (Login e Email)
app.use(express.urlencoded({ extended: true })); // Importante para ler Formulários (Cadastro)

// --- 3. CONFIGURAÇÃO DO EMAIL (CORRIGIDA PARA RENDER) ---
// Essa configuração específica evita o erro ETIMEDOUT no Render
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: tre,
    auth: {
        user: 'murilomorgesdossantos@gmail.com', 
        pass: 'uviq vrwx izkh aoaf' // <--- COLE SUA SENHA DE 16 LETRAS AQUI (Mantenha as aspas)
    },
    tls: {
        rejectUnauthorized: false // Ajuda a passar pelo firewall do Render
    }
});

// --- 4. CRIAÇÃO DA TABELA (Se não existir) ---
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
        // Cria usuário admin padrão
        pool.query(`
            INSERT INTO usuarios (nome, senha) 
            SELECT 'admin', '1234' 
            WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nome = 'admin')
        `);
    }
});

// --- 5. ROTAS DE PÁGINAS (Frontend) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'cadastro.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));
app.get('/sistema.html', (req, res) => res.send("<h1>Bem-vindo ao Sistema!</h1>")); 


// --- 6. ROTA DE LOGIN (Retorna JSON) ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ sucesso: false });
        }
        
        const row = result.rows[0];

        if (row) {
            res.json({ sucesso: true });
        } else {
            res.json({ sucesso: false });
        }
    });
});

// --- 7. ROTA DE ENVIO DE EMAIL (Recuperação) ---
app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;

    const mailOptions = {
        from: email, // Email que a pessoa digitou
        to: 'murilomorgesdossantos@gmail.com', // Para VOCÊ
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `
        SOLICITAÇÃO DE RECUPERAÇÃO DE CONTA
        -----------------------------------
        Nome completo: ${nome}
        Usuário informado: ${usuario}
        Email para contato: ${email}
        
        Detalhes do problema:
        ${detalhes}
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Erro ao enviar email:", error);
            return res.status(500).json({ sucesso: false, erro: error.toString() });
        } else {
            console.log('Email enviado com sucesso: ' + info.response);
            return res.json({ sucesso: true });
        }
    });
});

// --- 8. ROTA DE CADASTRO (Tradicional) ---
app.post('/cadastrar', (req, res) => {
    const { usuario, senha } = req.body;

    pool.query("SELECT * FROM usuarios WHERE nome = $1", [usuario], (err, result) => {
        if (err) return res.send("Erro no servidor");
        
        if (result.rows[0]) {
            res.send("<h1>Usuário já existe! <a href='/cadastro'>Voltar</a></h1>");
        } else {
            pool.query("INSERT INTO usuarios (nome, senha) VALUES ($1, $2)", [usuario, senha], (err) => {
                if (err) return res.send("Erro ao salvar");
                res.redirect('/'); // Manda de volta pro login
            });
        }
    });
});

// --- 9. INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
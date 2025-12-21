const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO BREVO FINAL ---
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, 
    auth: {
        // Use o LOGIN que aparece na sua imagem do Brevo
        user: '9e88ec001@smtp-brevo.com', 
        // Pega a SENHA que você acabou de colocar no Environment do Render
        pass: process.env.EMAIL_PASSWORD    
    }
});

// Rota de Ajuda (Recuperação)
app.post('/enviar-ajuda', (req, res) => {
    const { nome, usuario, email, detalhes } = req.body;

    const mailOptions = {
        // Remetente (Pode ser o seu email pessoal)
        from: 'murilomorgesdossantos@gmail.com', 
        // Destinatário (Onde você quer receber a notificação)
        to: 'murilomorgesdossantos@gmail.com',  
        subject: 'Solicitação de Ajuda - Esqueci Minha Senha',
        text: `NOME: ${nome}\nUSUÁRIO: ${usuario}\nEMAIL: ${email}\nDETALHES: ${detalhes}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Erro no Brevo:", error);
            return res.status(500).json({ sucesso: false, erro: error.toString() });
        }
        console.log('E-mail enviado com sucesso via Brevo!');
        res.json({ sucesso: true });
    });
});

// --- PÁGINAS E LOGIN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/esqueci-senha', (req, res) => res.sendFile(path.join(__dirname, 'esqueci.html')));

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    pool.query("SELECT * FROM usuarios WHERE nome = $1 AND senha = $2", [usuario, senha], (err, result) => {
        if (result && result.rows[0]) res.json({ sucesso: true });
        else res.json({ sucesso: false });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
const express = require('express');
const mongoose = require('mongoose');
const { Order, ApiKey } = require('./models'); // Importar o modelo de ordem
const cors = require('cors');
require('dotenv').config();

const corsOptions = {
    origin: 'http://localhost:3000', 
    credentials: true, // access-control-allow-credentials:true
    optionSuccessStatus: 200
};

const app = express();
const PORT = PORT;
const DATABASE_URL = DATABASE_URL;

app.use(cors(corsOptions));
app.use(express.json()); // Adiciona o middleware para análise de JSON

// Conectar ao MongoDB
async function connectDB() {
    try {
        await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Conectado com o banco");
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
    }
}

connectDB();

// Rota para buscar ordens
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar ordens' });
    }
});

// Rota para atualizar a API Key
app.put('/api/update-api-key', async (req, res) => {
    const { symbol, timeframe, usdtAmount } = req.body;

    try {
        const updatedApiKey = await ApiKey.findOneAndUpdate(
            {}, // Para atualizar o primeiro documento encontrado
            { symbol, timeframe, usdtAmount },
            { new: true } // Retorna o documento atualizado
        );

        if (!updatedApiKey) {
            return res.status(404).send('API Key não encontrada.');
        }

        res.status(200).json(updatedApiKey);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao atualizar a API Key.');
    }
});

// Rota para obter a API Key
app.get('/api/get-api-key', async (req, res) => {
    try {
        const apiKeyData = await ApiKey.findOne();
        if (!apiKeyData) {
            return res.status(404).send('API Key não encontrada.');
        }
        res.status(200).json(apiKeyData);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar a API Key.');
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const mongoose = require('mongoose');

// Definindo o esquema e o modelo
const apiKeySchema = new mongoose.Schema({
    apikey: { type: String, required: true },
    secret: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true },
    usdtAmount: { type: Number, required: true },
}, { collection: 'apikeys' });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

// Conectar ao MongoDB
mongoose.connect('mongodb+srv://calegari:luizamor4@cluster0.rz7m5.gcp.mongodb.net/cryptoBot?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('Conectado ao MongoDB');

    // Criar um novo documento
    const newApiKey = new ApiKey({
        apikey: 'JGYhzkTv1VRH58bDhjymtzV4pwjnYN76cxiGfb4NgModdpuNakb5ybx0oRjTVgnY',
        secret: 'dnI59eYM4S8ngGjD0uRgc0pLD09cf1mBGgIhWDL7lT1EKxIgWlcjuglyoBMTws5O',
        symbol: 'BTC/USDT',
        timeframe: '1h',
        usdtAmount: 20,
    });

    // Salvar o novo documento no banco de dados
    await newApiKey.save();
    console.log('Credenciais da API salvas com sucesso.');

    // Fechar a conexão
    mongoose.connection.close();
})
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

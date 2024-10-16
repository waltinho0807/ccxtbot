const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect('mongodb+srv://calegari:luizamor4@cluster0.rz7m5.gcp.mongodb.net/cryptoBot?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Modelo para armazenar as credenciais da API
const apiKeySchema = new mongoose.Schema({
    apikey: { type: String, required: true }, // Chave da API
    secret: { type: String, required: true }, // Chave secreta
    symbol: { type: String, required: true }, // Par de negociação (ex: BTC/USDT)
    timeframe: { type: String, required: true }, // Intervalo de tempo (ex: 1h)
    usdtAmount: { type: Number, required: true }, // Quantidade de USDT
}, { collection: 'apikeys' }); // Especifica a coleção


const ApiKey = mongoose.model('ApiKey', apiKeySchema);

// Modelo para armazenar as ordens
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    symbol: { type: String, required: true },
    type: { type: String, required: true }, // 'buy' ou 'sell'
    price: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true }, // 'open' ou 'closed'
    createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

const botStateSchema = new mongoose.Schema({
    lastBuyOrderId: {
        type: String,
        default: null
    }
});

const BotState = mongoose.model('BotState', botStateSchema);

const IndicatorSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Nome do indicador, e.g., 'RSI', 'Bollinger Bands'
    parameters: { type: Object, required: true }, // Parâmetros específicos do indicador
});

const StrategySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Nome da estratégia
    indicators: { type: [IndicatorSchema], required: true }, // Array de indicadores
    buyCondition: { type: String, required: true }, // Condição de compra em formato de string
    sellCondition: { type: String, required: true }, // Condição de venda em formato de string
});

const Strategy = mongoose.model('Strategy', StrategySchema);

module.exports = { ApiKey, Order, BotState, Strategy };

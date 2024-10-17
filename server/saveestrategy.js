const mongoose = require('mongoose');

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



mongoose.connect('mongodb+srv://calegari:luizamor4@cluster0.rz7m5.gcp.mongodb.net/cryptoBot?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('Conectado ao MongoDB');

    const newStrategy = new Strategy({
        name: 'BollingerRSI',
        indicators: [
            {
                name: 'RSI',
                parameters: { period: 14, threshold: 45 },
            },
            {
                name: 'Bollinger Bands',
                parameters: { period: 20, stdDev: 2 },
            },
        ],
        buyCondition: 'currentRSI < indicators[0].parameters.threshold && currentPrice <= lowerBand',
        sellCondition: 'order.status === "closed"',
    });
    
    await newStrategy.save();
    // Fechar a conexão
    mongoose.connection.close();
})
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));



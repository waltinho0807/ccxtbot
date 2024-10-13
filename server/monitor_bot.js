const ccxt = require('ccxt');
const technicalIndicators = require('technicalindicators');
const mongoose = require('mongoose');
const { ApiKey, Order, BotState } = require('./models'); // Inclua BotState aqui
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
let lastBuyOrderId = null;

// Conexão com o banco de dados e recuperação do estado do bot
async function connectDB() {
    try {
        await mongoose.connect(DATABASE_URL);
        console.log("Conectado ao banco");
        
        // Recuperar o estado do bot
        let botState = await BotState.findOne();
        
        if (botState) {
            lastBuyOrderId = botState.lastBuyOrderId;
            console.log("Estado do bot recuperado:", lastBuyOrderId);
        } else {
            console.log("Nenhum estado do bot encontrado. Criando um novo registro.");
            botState = new BotState({ lastBuyOrderId: null });
            await botState.save();
            console.log("Novo estado do bot criado.");
        }
        
        runBot(); // Inicie o bot após a conexão
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
    }
}


connectDB();

const runBot = async () => {
    const apiKeyData = await ApiKey.findOne(); // Obtém credenciais da API
    if (!apiKeyData) {
        console.error('Credenciais da API não encontradas no banco de dados.');
        return;
    }

    const exchange = new ccxt.binance({
        apiKey: process.env.APIKEY,
        secret: process.env.SECRET,
    });

    const symbol = apiKeyData.symbol;
    const timeframe = apiKeyData.timeframe;
    const usdtAmount = apiKeyData.usdtAmount;
    const limit = 100;

    try {
        // Monitora a ordem de compra ativa, se houver
        if (lastBuyOrderId) {
            await checkOrderStatus(exchange, symbol);
            return;
        }

        // Obtém dados de mercado e calcula indicadores
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        const closePrices = ohlcv.map(candle => candle[4]);

        const rsi = technicalIndicators.rsi({ values: closePrices, period: 14 });
        const currentRSI = rsi[rsi.length - 1];

        const bb = technicalIndicators.bollingerbands({ values: closePrices, period: 20, stdDev: 2 });
        const lowerBand = bb[bb.length - 1].lower;

        const ticker = await exchange.fetchTicker(symbol);
        const currentPrice = ticker.last;

        const openOrders = await exchange.fetchOpenOrders(symbol);
        const hasOpenOrders = openOrders.length > 0;

        const balance = await exchange.fetchBalance();
        const availableUSDT = balance.total.USDT;

        // Verifica condições de compra e lança ordem de compra
        if (!hasOpenOrders && currentRSI < 45 && currentPrice <= lowerBand) {
            const amount = (usdtAmount / currentPrice).toFixed(6);

            if (availableUSDT >= usdtAmount) {
                const order = await exchange.createLimitBuyOrder(symbol, amount, currentPrice);
                console.log('Ordem Limitada de Compra Executada:', order);
                lastBuyOrderId = order.id;

                // Salva a ordem de compra no banco
                const buyOrder = new Order({
                    orderId: order.id,
                    symbol: symbol,
                    type: 'buy',
                    price: currentPrice,
                    amount: amount,
                    status: 'open',
                });
                await buyOrder.save();

                // Salva o estado do bot no banco de dados
                await BotState.updateOne({}, { lastBuyOrderId }, { upsert: true });
                console.log(`Estado do bot salvo. ID da última ordem de compra: ${lastBuyOrderId}`);
            } else {
                console.log('Saldo insuficiente para executar a ordem de compra.');
            }
        } else {
            console.log('Condições não atendidas para compra.');
        }
    } catch (error) {
        console.error('Erro ao buscar dados de mercado:', error);
    }
};

// Função para monitorar o status da ordem de compra
async function checkOrderStatus(exchange, symbol) {
    try {
        const order = await exchange.fetchOrder(lastBuyOrderId, symbol);
        if (order.status === 'closed') {
            console.log('Ordem de compra concluída. Iniciando ordem de venda.');

            const buyPrice = order.price;
            const amount = order.amount;
            const sellPrice = (buyPrice * 1.012).toFixed(2);

            const sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
            console.log('Ordem Limitada de Venda Executada:', sellOrder);

            // Salva a ordem de venda no banco
            const orderSell = new Order({
                orderId: sellOrder.id,
                symbol: symbol,
                type: 'sell',
                price: sellPrice,
                amount: amount,
                status: 'open',
            });
            await orderSell.save();

            // Atualiza o banco para limpar o lastBuyOrderId
            lastBuyOrderId = null;
            await BotState.updateOne({}, { lastBuyOrderId: null });

        } else {
            console.log('Ordem de compra ainda não concluída. Continuando monitoramento...');
        }
    } catch (error) {
        console.error('Erro ao verificar status da ordem de compra:', error);
    }
}
//vamos subir
// Executa o bot a cada 10 segundos
setInterval(runBot, 10000);

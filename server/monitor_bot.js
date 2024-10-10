const ccxt = require('ccxt');
const technicalIndicators = require('technicalindicators');
const mongoose = require('mongoose');
const { ApiKey, Order } = require('./models'); // Importar os modelos do MongoDB
require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;

async function connectDB() {
    mongoose.connect(DATABASE_URL).then(() => {
        console.log("conectado com o banco");
        runBot();
    });
}

connectDB();

const runBot = async () => {
    const apiKeyData = await ApiKey.findOne(); // Buscar as credenciais da API
    console.log('API Key Data:', apiKeyData);
    
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
    const limit = 100; // número de candles para análise
    let lastBuyOrderId = null; // Armazenar o ID da última ordem de compra

    try {
        // Obter os dados de mercado
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        const closePrices = ohlcv.map(candle => candle[4]); // preço de fechamento

        // Calcular RSI
        const rsi = technicalIndicators.rsi({
            values: closePrices,
            period: 14,
        });
        const currentRSI = rsi[rsi.length - 1];
        console.log(`RSI: ${currentRSI}`);

        // Calcular Bandas de Bollinger
        const bb = technicalIndicators.bollingerbands({
            values: closePrices,
            period: 20,
            stdDev: 2,
        });
        const lowerBand = bb[bb.length - 1].lower; // Banda Inferior
        console.log(`Lower Band: ${lowerBand}`);

        // Obter o preço atual
        const ticker = await exchange.fetchTicker(symbol);
        const currentPrice = ticker.last;
        console.log(`Preço atual: ${currentPrice}`);

        // Verificar se há ordens abertas
        const openOrders = await exchange.fetchOpenOrders(symbol);
        const hasOpenOrders = openOrders.length > 0;

        // Verificar se a última ordem de compra ainda está aberta
        if (lastBuyOrderId) {
            const order = await exchange.fetchOrder(lastBuyOrderId, symbol);
            if (order.status === 'open') {
                console.log('Ordem de compra ainda está aberta. Não executando nova ordem de compra.');
                return; // Saia da função se a ordem estiver aberta
            }
        }

        // Verificar saldo disponível
        const balance = await exchange.fetchBalance();
        const availableUSDT = balance.total.USDT; // Acesse o saldo total de USDT

        // Verificar condições e executar a ordem de compra
        if (!hasOpenOrders && currentRSI < 45 && currentPrice <= lowerBand) {
            const amount = (usdtAmount / currentPrice).toFixed(6); // Cálculo da quantidade de BTC a ser comprada

            if (availableUSDT < usdtAmount) {
                console.log('Saldo insuficiente para executar a ordem de compra.');
                return; // Saia da função se o saldo for insuficiente
            }

            try {
                const order = await exchange.createLimitBuyOrder(symbol, amount, currentPrice);
                console.log('Ordem Limitada de Compra Executada:', order);
                lastBuyOrderId = order.id; // Armazenar o ID da ordem de compra

                // Salvar a ordem de compra no banco de dados
                const buyOrder = new Order({
                    orderId: order.id,
                    symbol: symbol,
                    type: 'buy',
                    price: currentPrice,
                    amount: amount,
                    status: 'open',
                });
                await buyOrder.save();

                // Calcular o preço de venda (1.2% acima do preço de compra)
                const sellPrice = (currentPrice * 1.012).toFixed(2);
                console.log(`Ordem de Venda será lançada a: ${sellPrice}`);

                // Executar a ordem de venda somente se não houver ordens abertas
                if (!hasOpenOrders) {
                    const sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
                    console.log('Ordem Limitada de Venda Executada:', sellOrder);

                    // Salvar a ordem de venda no banco de dados
                    const orderSell = new Order({
                        orderId: sellOrder.id,
                        symbol: symbol,
                        type: 'sell',
                        price: sellPrice,
                        amount: amount,
                        status: 'open',
                    });
                    await orderSell.save();
                }
            } catch (error) {
                console.error('Erro ao executar a ordem de compra:', error);
            }
        } else {
            console.log('Condições não atendidas para compra.');
        }
    } catch (error) {
        console.error('Erro ao buscar dados de mercado:', error);
    }
};

// Configurar o intervalo para monitorar o mercado a cada 5 minutos (300000 ms)
setInterval(runBot, 100000);

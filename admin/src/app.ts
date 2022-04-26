import * as express from 'express'
import { request, response } from 'express'
import * as cors from 'cors'
import { createConnection } from 'typeorm'
import { Product } from './entity/Product'
import * as amqp from 'amqplib/callback_api';

createConnection().then(db => {
    const productRepository = db.getRepository('Product')

    amqp.connect('amqps://knnyusev:EFkuRlQ9SrVGjc1WwKI1OGDvYsDy1GHk@whale.rmq.cloudamqp.com/knnyusev', (error0, connection) => {
        if (error0) {
            throw error0
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1
            }
            const app = express()
            app.use(cors({
                //untuk menjalankan localhost:3000 dan localhost:8000 rectjs + express + dll
                origin: [
                    'http://localhost:3000',
                    'http://localhost:8000',
                    'http://localhost:4001'
                ]
            }))

            app.use(express.json())

            app.get('/api/products', async (req, res) => {
                const products = await productRepository.find()
                // channel.sendToQueue('hello', Buffer.from('Hello'))
                res.json(products)
            })

            app.post('/api/products', async (req, res) => {
                const product = await productRepository.create(req.body);
                const result = await productRepository.save(product)
                channel.sendToQueue('create_product', Buffer.from(JSON.stringify(result)))
                return res.send(result);
            })

            app.get('/api/products/:id', async (req, res) => {
                const product = await productRepository.findOneBy({ id: parseInt(req.params.id) })
                return res.send(product)
            })

            app.put('/api/products/:id', async (req, res) => {
                const product = await productRepository.findOneBy({ id: parseInt(req.params.id) })
                productRepository.merge(product, req.body)
                const result = await productRepository.save(product)
                channel.sendToQueue('update_product', Buffer.from(JSON.stringify(result)))
                return res.send(result);
            })

            app.delete('/api/products/:id', async (req, res) => {
                const result = await productRepository.delete(parseInt(req.params.id))
                channel.sendToQueue('delete_product', Buffer.from(req.params.id))
                return res.send(result)
            })

            app.post('/api/products/:id/like', async (req, res) => {
                const product = await productRepository.findOneBy({ id: parseInt(req.params.id) })
                product.likes++
                const result = await productRepository.save(product)
                return res.send(result)
            })


           const port = 8000
            app.listen(port, () => {
                console.log(`server started at http://localhost:${port}`)
            })
            process.on('beforeExit', () => {
                console.log('closing')
                connection.close();
            })

        })

    })


})

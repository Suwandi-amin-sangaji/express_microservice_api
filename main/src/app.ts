import * as express from 'express'
import { Request, Response } from 'express'
import * as cors from 'cors'
import { createConnection } from 'typeorm'
import * as amqp from 'amqplib/callback_api';
import { Product } from './entity/product';
import axios from "axios";


createConnection().then(db => {

    const productRepository =db.getMongoRepository(Product);

    amqp.connect('amqps://knnyusev:EFkuRlQ9SrVGjc1WwKI1OGDvYsDy1GHk@whale.rmq.cloudamqp.com/knnyusev', (error0, connection) => {
        if (error0) {
            throw error0
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1
            }

            channel.assertQueue('create_product', { durable: false });
            channel.assertQueue('update_product', { durable: false });
            channel.assertQueue('delete_product', { durable: false });


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

            channel.consume('create_product', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString())
                const product = new Product()
                product.admin_id = parseInt(eventProduct.id)
                product.title = eventProduct.title
                product.image = eventProduct.image
                product.likes = eventProduct.likes
                await productRepository.save(product)
                console.log('product created')
            }, {noAck: true})

            channel.consume('update_product', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString())
                const product = new Product()
                product.admin_id = parseInt(eventProduct.id)
                productRepository.merge(product, {
                    title: eventProduct.title,
                    image: eventProduct.image,
                    likes: eventProduct.likes
                })
                await productRepository.save(product)
                console.log('product updated')
            }, {noAck: true})

            channel.consume('delete_product', async (msg) => {
                const admin_id = parseInt(msg.content.toString())
                await productRepository.deleteOne({admin_id})
                console.log('product deleted')
            })

            // find all
            app.get('/api/products', async(req, res) => {
                const products = await productRepository.find()
                res.send(products)
            })

            app.post('/api/products/:id/like', async (req, res) => {
                const product = await productRepository.findOneBy(req.params.id)
                await axios.post(`http://localhost:8000/api/products/${product.admin_id}/like`, {})
                product.likes++
                await productRepository.save(product)
                return res.send(product)
            });


            const port = 8001;
            app.listen(port, () => {
                console.log(`server running on port ${port}`)
            })
            process.on('beforeExit', () => {
                console.log('closing')
                connection.close()
            })


        })
    })
})

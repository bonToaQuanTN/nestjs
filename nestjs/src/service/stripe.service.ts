import { Injectable, Logger } from "@nestjs/common";
import {Stripe} from "stripe";
@Injectable()
export class StripeService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not defined');
        }
        this.stripe = new Stripe(secretKey, {apiVersion: '2026-03-25.dahlia'});
    }
    
    async createCheckoutSession(orderId: string, price: number) {
        this.logger.log(`Creating checkout session for orderId: ${orderId}, price: ${price}`);
        try {
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                currency: 'usd',
                product_data: {
                    name: orderId,
                },
                unit_amount: price * 100,
                },
                quantity: 1,
            },
            ],
            mode: 'payment',
            success_url: 'http://localhost:3000/api#/Payment/PaymentController_success',
            cancel_url: 'http://localhost:3000/api#/Payment/PaymentController_cancel',
            metadata: {
                orderId: orderId
            },
        });

        this.logger.log(`Checkout session created successfully. SessionId: ${session.id}`);

        return session;
        } catch (error) {
            this.logger.error(`Create checkout session failed for orderId: ${orderId}`);
            throw error;
        }
  }
}
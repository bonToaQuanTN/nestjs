import { Controller, Post, Body, Req, Get ,Logger  } from '@nestjs/common';
import { StripeService } from '../service/stripe.service';
import {CreatePaymentDto}from '../dto/user.dto';
import { AppService } from '../service/app.service';
import Stripe from 'stripe';
import type { Request } from 'express';

@Controller('payment')
export class PaymentController {
    constructor(
        private stripeService: StripeService,
        private readonly orderService: AppService
    ) {}
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {apiVersion: '2026-03-25.dahlia'});
    private readonly logger = new Logger(PaymentController.name);

    @Post('checkout')
    async checkout(@Body() body: CreatePaymentDto) {
        const session = await this.stripeService.createCheckoutSession(body.id,body.price);
        return {url: session.url};
    }

    @Post('webhook')
    async handleWebhook(@Req() req: Request) {
        const sig = req.headers['stripe-signature'];
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(req.body,sig as string,process.env.STRIPE_WEBHOOK_SECRET!);
            this.logger.log(`Webhook received: ${event.type}`);

        } catch (error) {
            this.logger.error(`Webhook signature verification failed`);
            return;
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            this.logger.debug(`SessionId: ${session.id}`);
            this.logger.debug(`Metadata: ${JSON.stringify(session.metadata)}`);
            const orderId = session.metadata?.orderId;

            if (!orderId) {
                this.logger.warn(`OrderId missing in metadata`);
                return;
            }

            this.logger.log(`Payment success for orderId: ${orderId}`);
            await this.orderService.updateStatus(orderId, 'PAID');
            this.logger.log(`Order status updated to PAID: ${orderId}`);
        }
        return { received: true };
    }

    @Get('success')
    success() {
        return {message: "Payment Success"};
    }

    @Get('cancel')
    cancel() {
        return {message: "Payment Cancelled"};
    }
}
import {Controller, Module } from '@nestjs/common';
import {AppController } from './controller/app.controller';
import {RoleController }from './controller/app.controllerRole';
import {permissionController } from './controller/app.controllerPermission';
import {UploadController }from './controller/app.controllerUpload';
import {UploadService } from './service/upload.service';
import {orderController } from './controller/app.controllerOrder'
import {orderItemController } from './controller/app.controllerItem'
import {AppService } from './service/app.service';
import {SequelizeModule } from "@nestjs/sequelize";
import {Users } from './model/app.model';
import {Role } from './model/app.modelRoles';
import {Permission} from './model/app.permissions';
import {PaymentController} from './controller/app.controllerPayment'
import {JwtModule } from '@nestjs/jwt';
import {ConfigModule, ConfigService } from '@nestjs/config';
import {StringValue } from 'ms';
import {CacheModule } from '@nestjs/cache-manager';
import {redisStore } from 'cache-manager-redis-store';
import {Product} from './model/app.modelProduct';
import {ProductController} from './controller/app.controllerProduct';
import {OrderItem} from './model/app.modelItem';
import {Discount} from './model/app.modelDiscount';
import {Order} from './model/app.modelOrder';
import {StripeService} from './service/stripe.service';
import {Category} from './model/app.modelCategory';
import {categoryController} from './controller/app.controllerCategory';
import {DiscountController} from './controller/app.controllerDiscount';
import {SeedRoleService} from './seed/seed.Role';
import {SeedService} from './seed/seed.admin';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env']
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadModels: true,
        synchronize: true
      })
    }),

    SequelizeModule.forFeature([
      Role,
      Users,
      Permission,
      Product,
      Order,
      OrderItem,
      Category,
      Discount
    ]),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_ACCESS_EXPIRES') as StringValue
        }
      })
    }),

    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT')
      })
    })
  ],
  controllers: [
    AppController,
    RoleController,
    permissionController,
    UploadController,
    ProductController,
    orderItemController,
    orderController,
    PaymentController,
    categoryController,
    DiscountController
  ],
  providers: [AppService,UploadService,StripeService,SeedRoleService,SeedService]
})
export class AppModule {}

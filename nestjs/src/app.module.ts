import { Controller, Module } from '@nestjs/common';
import { AppController } from './controller/app.controller';
import { RoleController }from './controller/app.controllerRole';
import { permissionController } from './controller/app.controllerPermission';
import { UploadController }from './controller/app.controllerUpload';
import { UploadService } from './service/upload.service';
import { orderController } from './controller/app.controllerOrder'
import {  orderItemController } from './controller/app.controllerItem'
import { AppService } from './service/app.service';
import { SequelizeModule } from "@nestjs/sequelize";
import { Users } from './model/app.model';
import { Role } from './model/app.modelRoles';
import {Permission} from './model/app.permissions'
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import {Product} from './model/app.modelProduct';
import {ProductController} from './controller/app.controllerProduct'
import {OrderItem} from './model/app.modelItem'
import {Order} from './model/app.modelOrder'

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
      OrderItem
    ]),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRES')as StringValue
        }
      })
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {host: '127.0.0.1', port: 6379}
        }),
        ttl: 60000
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
    orderController
  ],
  providers: [AppService,UploadService]
})
export class AppModule {}
